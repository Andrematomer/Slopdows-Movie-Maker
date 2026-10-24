import { CanvasSink, Input, ALL_FORMATS, AudioBufferSink, BlobSource, type WrappedCanvas } from 'mediabunny';
import type { Assets } from '../render/types';
import { snap24 } from '../render/oldCamera';
import { layout } from './layout';
import type { Project } from './types';

export type MediaKind = 'image' | 'video' | 'audio';

interface ImageMedia {
  kind: 'image';
  img: HTMLImageElement;
  url: string;
}
interface VideoMedia {
  kind: 'video';
  input: Input;
  sink: CanvasSink;
  duration: number;
  width: number;
  height: number;
  thumbUrl: string;
  audio: AudioBuffer | null;
}
interface AudioMedia {
  kind: 'audio';
  input: Input;
  duration: number;
  audio: AudioBuffer;
}
type Media = ImageMedia | VideoMedia | AudioMedia;

const media = new Map<string, Media>();
/**
 * One frame reader per video clip (keyed by clip id so two clips cut from one file never clash).
 * Frames are read in order from a single running decoder. Asking the decoder for each frame by
 * timestamp (getCanvas) re-decodes from the previous keyframe every time: ~400 ms per frame on a
 * 1080p clip, i.e. stutter in the preview and a very slow export.
 */
interface Player {
  mediaId: string;
  iter: AsyncGenerator<WrappedCanvas, void, unknown> | null;
  /** frame being shown */
  cur: WrappedCanvas | null;
  /** one frame of lookahead (already decoded, starts after `want`) */
  next: WrappedCanvas | null;
  /** latest requested source time: older queued requests are ignored in favour of this */
  want: number;
  queue: Promise<void>;
}
const players = new Map<string, Player>();

export class UnsupportedMediaError extends Error {}

// ---------- adding media ----------

export async function addImageAsset(id: string, file: Blob): Promise<void> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
  media.set(id, { kind: 'image', img, url });
}

/** Decode a whole audio track into one AudioBuffer (kept in RAM: fine for songs, heavy for hours). */
async function decodeAudio(input: Input): Promise<AudioBuffer | null> {
  const track = await input.getPrimaryAudioTrack();
  if (!track) return null;
  if (!(await track.canDecode())) throw new UnsupportedMediaError('Audio codec not supported by this browser');
  const rate = track.sampleRate;
  const channels = Math.min(2, track.numberOfChannels);
  const duration = await input.computeDuration([track]);
  const length = Math.max(1, Math.ceil(duration * rate));
  const out = new AudioBuffer({ length, numberOfChannels: channels, sampleRate: rate });
  const sink = new AudioBufferSink(track);
  for await (const { buffer, timestamp } of sink.buffers()) {
    const offset = Math.round(timestamp * rate);
    for (let c = 0; c < channels; c++) {
      const src = buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1));
      const room = length - offset;
      if (room <= 0) break;
      out.getChannelData(c).set(room < src.length ? src.subarray(0, room) : src, Math.max(0, offset));
    }
  }
  return out;
}

export async function addVideoAsset(id: string, file: Blob): Promise<{ duration: number }> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const vt = await input.getPrimaryVideoTrack();
    if (!vt) throw new UnsupportedMediaError('No video track found');
    if (!(await vt.canDecode())) throw new UnsupportedMediaError('Video codec not supported by this browser');
    const duration = await input.computeDuration();
    const width = vt.displayWidth;
    const height = vt.displayHeight;
    // decode at most Full HD: enough for any project size we offer short of 4K
    const scale = Math.min(1, 1920 / width, 1080 / height);
    const sink = new CanvasSink(vt, {
      width: Math.max(2, Math.round(width * scale)),
      height: Math.max(2, Math.round(height * scale)),
      fit: 'fill',
    });
    let audio: AudioBuffer | null = null;
    try {
      audio = await decodeAudio(input);
    } catch {
      audio = null; // picture still works without sound
    }
    const first = await sink.getCanvas(0);
    let thumbUrl = '';
    if (first) thumbUrl = await canvasToUrl(first.canvas);
    media.set(id, { kind: 'video', input, sink, duration, width, height, thumbUrl, audio });
    return { duration };
  } catch (e) {
    input.dispose();
    throw e;
  }
}

export async function addAudioAsset(id: string, file: Blob): Promise<{ duration: number }> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const audio = await decodeAudio(input);
    if (!audio) throw new UnsupportedMediaError('No audio track found');
    media.set(id, { kind: 'audio', input, duration: audio.duration, audio });
    return { duration: audio.duration };
  } catch (e) {
    input.dispose();
    throw e;
  }
}

async function canvasToUrl(c: HTMLCanvasElement | OffscreenCanvas): Promise<string> {
  const blob =
    c instanceof OffscreenCanvas
      ? await c.convertToBlob({ type: 'image/jpeg', quality: 0.7 })
      : await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.7));
  return blob ? URL.createObjectURL(blob) : '';
}

// ---------- lookups / cleanup ----------

export function hasMedia(id: string): boolean {
  return media.has(id);
}

export function getImageUrl(id: string): string | undefined {
  const m = media.get(id);
  return m?.kind === 'image' ? m.url : undefined;
}

export function getThumbUrl(id: string): string | undefined {
  const m = media.get(id);
  if (m?.kind === 'image') return m.url;
  if (m?.kind === 'video') return m.thumbUrl || undefined;
  return undefined;
}

export function getMediaDuration(id: string): number {
  const m = media.get(id);
  return m && m.kind !== 'image' ? m.duration : 0;
}

export function getMediaAudio(id: string): AudioBuffer | null {
  const m = media.get(id);
  return m && m.kind !== 'image' ? m.audio : null;
}

export function dropMedia(id: string): void {
  const m = media.get(id);
  if (!m) return;
  for (const [clipId, pl] of players) if (pl.mediaId === id) (closePlayer(pl), players.delete(clipId));
  if (m.kind === 'image') URL.revokeObjectURL(m.url);
  else {
    if (m.kind === 'video' && m.thumbUrl) URL.revokeObjectURL(m.thumbUrl);
    m.input.dispose();
  }
  media.delete(id);
}

export function dropAllMedia(): void {
  [...media.keys()].forEach(dropMedia);
  players.clear();
}

/** All media ids a project still refers to. */
export function usedMediaIds(project: Project): Set<string> {
  const ids = new Set<string>();
  for (const c of project.clips) if (c.kind !== 'title') ids.add(c.mediaId);
  for (const a of project.audioClips) ids.add(a.mediaId);
  return ids;
}

// ---------- frame access for the renderer ----------

/** Source-file time shown by a video clip at `local` seconds into the clip. */
export function sourceTime(trimStart: number, local: number, duration: number, oldCamera = false): number {
  const l = Math.max(0, Math.min(duration, local));
  return trimStart + (oldCamera ? snap24(l) : l);
}

function closePlayer(p: Player): void {
  void p.iter?.return(undefined).catch(() => {});
  p.iter = null;
  p.next = null;
}

const covers = (f: WrappedCanvas, t: number) => t >= f.timestamp - 1e-4 && t < f.timestamp + Math.max(f.duration, 1 / 120);

/** Moves the player forward (or seeks) until `p.cur` is the frame to show at `p.want`. */
async function advance(m: VideoMedia, p: Player): Promise<void> {
  const t = p.want;
  if (p.cur && covers(p.cur, t)) return;
  const ahead = p.next ?? p.cur;
  const wentBack = !!p.cur && t < p.cur.timestamp - 1e-4;
  const bigJump = !!ahead && t > ahead.timestamp + 1; // faster to seek than to decode through a second+ of frames
  if (!p.iter || wentBack || bigJump) {
    closePlayer(p);
    p.cur = null;
    p.iter = m.sink.canvases(t);
  }
  for (;;) {
    let g = p.next;
    p.next = null;
    if (!g) {
      const r = await p.iter!.next();
      if (r.done) return; // end of file: keep showing the last frame
      g = r.value;
    }
    if (g.timestamp <= t + 1e-4) {
      p.cur = g; // at or before the target: a candidate, keep reading
      continue;
    }
    // first frame after the target: keep it for next time
    if (!p.cur) p.cur = g;
    else p.next = g;
    return;
  }
}

/**
 * Gets the video frames the renderer will need at `time` ready. Decoding is async but renderFrame
 * is sync, so callers `await prepare()` and then render. Safe to call many times per second: only
 * the most recent request matters.
 */
export async function prepare(project: Project, time: number): Promise<void> {
  const { segments, total } = layout(project);
  const t = Math.max(0, Math.min(time, total - 1e-6));
  const active = segments.filter((s) => s.clip.kind === 'video' && t >= s.start && t < s.end + 1e-6);
  await Promise.all(
    active.map((seg) => {
      const clip = seg.clip;
      if (clip.kind !== 'video') return undefined;
      const m = media.get(clip.mediaId);
      if (m?.kind !== 'video') return undefined;
      const st = Math.min(sourceTime(clip.trimStart, t - seg.start, clip.duration, !!clip.oldCamera), Math.max(0, m.duration - 0.001));
      let p = players.get(clip.id);
      if (!p) {
        p = { mediaId: clip.mediaId, iter: null, cur: null, next: null, want: st, queue: Promise.resolve() };
        players.set(clip.id, p);
      }
      const player = p;
      player.want = st;
      player.queue = player.queue.then(() => advance(m, player)).catch(() => closePlayer(player));
      return player.queue;
    }),
  );
}

export const assets: Assets = {
  getImage: (mediaId) => {
    const m = media.get(mediaId);
    return m?.kind === 'image' ? m.img : undefined;
  },
  getVideoFrame: (clipId) => players.get(clipId)?.cur?.canvas,
};
