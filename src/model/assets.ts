import { CanvasSink, Input, ALL_FORMATS, AudioBufferSink, BlobSource } from 'mediabunny';
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
/** latest decoded frame per clip (keyed by clip id so two clips of one file never clash) */
const frames = new Map<string, { ts: number; dur: number; canvas: CanvasImageSource }>();

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
    // decode at most the size we will ever draw (project is <= 800x600)
    const scale = Math.min(1, 800 / width, 600 / height);
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
  if (m.kind === 'image') URL.revokeObjectURL(m.url);
  else {
    if (m.kind === 'video' && m.thumbUrl) URL.revokeObjectURL(m.thumbUrl);
    m.input.dispose();
  }
  media.delete(id);
}

export function dropAllMedia(): void {
  [...media.keys()].forEach(dropMedia);
  frames.clear();
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

/**
 * Fetch the video frames the renderer will need at `time`. Decoding is async but
 * renderFrame is sync, so callers `await prepare()` and then render.
 */
export async function prepare(project: Project, time: number): Promise<void> {
  const { segments, total } = layout(project);
  const t = Math.max(0, Math.min(time, total - 1e-6));
  const active = segments.filter((s) => s.clip.kind === 'video' && t >= s.start && t < s.end + 1e-6);
  await Promise.all(
    active.map(async (seg) => {
      const clip = seg.clip;
      if (clip.kind !== 'video') return;
      const m = media.get(clip.mediaId);
      if (m?.kind !== 'video') return;
      const st = Math.min(sourceTime(clip.trimStart, t - seg.start, clip.duration, !!clip.oldCamera), Math.max(0, m.duration - 0.001));
      const cached = frames.get(clip.id);
      if (cached && st >= cached.ts && st < cached.ts + cached.dur) return;
      const f = await m.sink.getCanvas(st);
      if (f) frames.set(clip.id, { ts: f.timestamp, dur: Math.max(f.duration, 1 / 120), canvas: f.canvas });
    }),
  );
}

export const assets: Assets = {
  getImage: (mediaId) => {
    const m = media.get(mediaId);
    return m?.kind === 'image' ? m.img : undefined;
  },
  getVideoFrame: (clipId) => frames.get(clipId)?.canvas,
};
