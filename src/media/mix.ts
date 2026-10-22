import { getMediaAudio } from '../model/assets';
import { layout } from '../model/layout';
import type { Project } from '../model/types';

/** "2008 YouTube mode" laptop-mic band: roughly telephone quality. */
export const BAND_LOW_HZ = 300;
export const BAND_HIGH_HZ = 3400;

interface Piece {
  buffer: AudioBuffer;
  /** timeline start, seconds */
  start: number;
  /** offset into the source buffer, seconds */
  offset: number;
  duration: number;
  volume: number;
}

function pieces(project: Project): Piece[] {
  const out: Piece[] = [];
  for (const seg of layout(project).segments) {
    const c = seg.clip;
    if (c.kind !== 'video') continue;
    const buffer = getMediaAudio(c.mediaId);
    if (buffer) out.push({ buffer, start: seg.start, offset: c.trimStart, duration: c.duration, volume: c.volume });
  }
  for (const a of project.audioClips) {
    const buffer = getMediaAudio(a.mediaId);
    if (buffer) out.push({ buffer, start: a.start, offset: a.trimStart, duration: a.duration, volume: a.volume });
  }
  return out;
}

export function hasAudio(project: Project): boolean {
  return pieces(project).length > 0;
}

/**
 * Schedules everything audible from `from` seconds onward on `ctx`.
 * Preview (realtime context) and export (offline context) share this, so they sound the same.
 * Returns the nodes to stop (preview only).
 */
export function scheduleMix(ctx: BaseAudioContext, project: Project, from: number, total: number): AudioScheduledSourceNode[] {
  const nodes: AudioScheduledSourceNode[] = [];
  const master = ctx.createGain();
  let tail: AudioNode = master;
  if (project.mode2008) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = BAND_LOW_HZ;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = BAND_HIGH_HZ;
    master.connect(hp);
    hp.connect(lp);
    tail = lp;
  }
  tail.connect(ctx.destination);

  const base = ctx.currentTime;
  for (const p of pieces(project)) {
    const skip = Math.max(0, from - p.start);
    const len = Math.min(p.duration - skip, p.buffer.duration - (p.offset + skip));
    if (len <= 0) continue;
    const src = ctx.createBufferSource();
    src.buffer = p.buffer;
    const g = ctx.createGain();
    g.gain.value = p.volume;
    src.connect(g).connect(master);
    src.start(base + (p.start + skip - from), p.offset + skip, len);
    nodes.push(src);
  }

  if (project.mode2008 && nodes.length > 0) {
    // a little hiss, added after the filter so it stays audible
    const rate = ctx.sampleRate;
    const noise = ctx.createBuffer(1, rate * 2, rate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0.012;
    src.connect(g).connect(ctx.destination);
    src.start(base);
    src.stop(base + Math.max(0, total - from));
    nodes.push(src);
  }
  return nodes;
}

/** Renders the whole soundtrack to one buffer (for export). */
export async function renderMix(project: Project, sampleRate = 48000, channels = 2): Promise<AudioBuffer> {
  const { total } = layout(project);
  const ctx = new OfflineAudioContext(channels, Math.max(1, Math.ceil(total * sampleRate)), sampleRate);
  scheduleMix(ctx, project, 0, total);
  return ctx.startRendering();
}

// ---------- realtime preview ----------

let live: { ctx: AudioContext; nodes: AudioScheduledSourceNode[] } | null = null;

export function startPreviewAudio(project: Project, from: number): void {
  stopPreviewAudio();
  if (!hasAudio(project)) return;
  try {
    const ctx = new AudioContext();
    void ctx.resume();
    const nodes = scheduleMix(ctx, project, from, layout(project).total);
    live = { ctx, nodes };
  } catch {
    live = null; // no audio device: stay silent
  }
}

export function stopPreviewAudio(): void {
  if (!live) return;
  for (const n of live.nodes) {
    try {
      n.stop();
    } catch {
      /* not started yet */
    }
  }
  void live.ctx.close().catch(() => {});
  live = null;
}
