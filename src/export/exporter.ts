import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  canEncodeAudio,
  getFirstEncodableVideoCodec,
} from 'mediabunny';
import { prepare } from '../model/assets';
import { layout } from '../model/layout';
import { hasAudio, renderMix } from '../media/mix';
import type { Project } from '../model/types';
import { renderFrame } from '../render/renderFrame';
import type { Assets } from '../render/types';

export interface ExportProgress {
  frame: number;
  frames: number;
}

/** Shown to people instead of codec jargon. */
export class FriendlyError extends Error {}

interface AudioPlan {
  codec: 'aac' | 'opus';
  sampleRate: number;
  channels: number;
  bitrate: number;
}

/**
 * Picks the first audio setup this browser really accepts. Browsers are picky about
 * bitrate/channel/sample-rate combinations, so we ask about the exact combination
 * (not just "AAC?") and walk down a list from "ugly 2008" to "safe and normal".
 */
async function pickAudioPlan(mode2008: boolean): Promise<AudioPlan | null> {
  const ugly: Omit<AudioPlan, 'codec'>[] = [
    { sampleRate: 22050, channels: 1, bitrate: 32_000 },
    { sampleRate: 24000, channels: 1, bitrate: 32_000 },
    { sampleRate: 44100, channels: 1, bitrate: 48_000 },
  ];
  const normal: Omit<AudioPlan, 'codec'>[] = [
    { sampleRate: 48000, channels: 2, bitrate: 128_000 },
    { sampleRate: 44100, channels: 2, bitrate: 128_000 },
  ];
  // the 2008 sound is mono and thin already (see mix.ts), so safe stereo settings are a fine last resort
  const tiers = mode2008 ? [...ugly, { sampleRate: 48000, channels: 1, bitrate: 64_000 }, ...normal] : normal;
  for (const codec of ['aac', 'opus'] as const) {
    for (const t of tiers) {
      try {
        if (await canEncodeAudio(codec, { numberOfChannels: t.channels, sampleRate: t.sampleRate, bitrate: t.bitrate })) {
          return { codec, ...t };
        }
      } catch {
        /* try the next one */
      }
    }
  }
  return null;
}

/**
 * Renders the project to an MP4 entirely in the browser (WebCodecs + Mediabunny).
 * Runs on the main thread (yielding between frames). Known limitation: not in a Worker yet.
 * Sound is best-effort: if the browser can't encode any audio setup, the movie is saved without it
 * rather than failing.
 */
export async function exportMovie(
  project: Project,
  assets: Assets,
  onProgress: (p: ExportProgress) => void,
  signal: AbortSignal,
): Promise<Blob> {
  if (typeof VideoEncoder === 'undefined') {
    throw new FriendlyError("This browser can't save movies. Please use the latest Chrome, Edge, Firefox or Safari.");
  }
  const plan = hasAudio(project) && typeof AudioEncoder !== 'undefined' ? await pickAudioPlan(project.mode2008) : null;
  if (plan) {
    try {
      return await run(project, assets, onProgress, signal, plan);
    } catch (e) {
      if (signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) throw e;
      console.warn('Export with sound failed, retrying without sound', e);
    }
  }
  return run(project, assets, onProgress, signal, null);
}

async function run(
  project: Project,
  assets: Assets,
  onProgress: (p: ExportProgress) => void,
  signal: AbortSignal,
  plan: AudioPlan | null,
): Promise<Blob> {
  const { width, height, fps } = project;
  const quality = project.mode2008 ? QUALITY_LOW : QUALITY_MEDIUM;

  // H.264 first (plays everywhere). VP9-in-MP4 only if the browser can't encode H.264.
  const codec = await getFirstEncodableVideoCodec(['avc', 'vp9'], { width, height, quality });
  if (!codec) {
    throw new FriendlyError("This browser can't save movies at this size. Try the latest Chrome or Edge.");
  }

  const mix = plan ? await renderMix(project, plan.sampleRate, plan.channels) : null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new FriendlyError('Could not create a drawing surface.');

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const source = new CanvasSource(canvas, { codec, quality });
  output.addVideoTrack(source, { frameRate: fps });
  let audioSource: AudioBufferSource | null = null;
  if (mix && plan) {
    audioSource = new AudioBufferSource({ codec: plan.codec, bitrate: plan.bitrate });
    output.addAudioTrack(audioSource);
  }

  try {
    await output.start();
    const { total } = layout(project);
    const frames = Math.max(1, Math.round(total * fps));
    for (let i = 0; i < frames; i++) {
      if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
      await prepare(project, i / fps);
      renderFrame(ctx, project, i / fps, assets);
      await source.add(i / fps, 1 / fps);
      onProgress({ frame: i + 1, frames });
      if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0)); // let the UI breathe
    }
    source.close();
    if (audioSource && mix) {
      await audioSource.add(mix);
      audioSource.close();
    }
    await output.finalize();
  } catch (err) {
    await output.cancel().catch(() => {});
    throw err;
  }

  const buffer = target.buffer;
  if (!buffer) throw new FriendlyError('Saving produced no data.');
  return new Blob([buffer], { type: 'video/mp4' });
}
