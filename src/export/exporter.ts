import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  getFirstEncodableVideoCodec,
} from 'mediabunny';
import { layout } from '../model/layout';
import type { Project } from '../model/types';
import { renderFrame } from '../render/renderFrame';
import type { Assets } from '../render/types';

export interface ExportProgress {
  frame: number;
  frames: number;
}

/**
 * Renders the project to an MP4 entirely in the browser (WebCodecs + Mediabunny).
 * MVP: runs on the main thread (yielding between frames) and has no audio yet.
 * TODO: move to a Worker + OffscreenCanvas, add audio mixing.
 */
export async function exportMovie(
  project: Project,
  assets: Assets,
  onProgress: (p: ExportProgress) => void,
  signal: AbortSignal,
): Promise<Blob> {
  if (typeof VideoEncoder === 'undefined') {
    throw new Error('This browser has no WebCodecs support. Try a recent Chrome, Edge, Firefox or Safari.');
  }
  const { width, height, fps } = project;
  const quality = project.mode2008 ? QUALITY_LOW : QUALITY_MEDIUM;

  // H.264 first (plays everywhere). VP9-in-MP4 only if the browser can't encode H.264.
  const codec = await getFirstEncodableVideoCodec(['avc', 'vp9'], { width, height, quality });
  if (!codec) {
    throw new Error('This browser cannot encode H.264 or VP9 video at this size.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create a 2D canvas.');

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const source = new CanvasSource(canvas, { codec, quality });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();

  try {
    const { total } = layout(project);
    const frames = Math.max(1, Math.round(total * fps));
    for (let i = 0; i < frames; i++) {
      if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
      renderFrame(ctx, project, i / fps, assets);
      await source.add(i / fps, 1 / fps);
      onProgress({ frame: i + 1, frames });
      if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0)); // let the UI breathe
    }
    source.close();
    await output.finalize();
  } catch (err) {
    await output.cancel().catch(() => {});
    throw err;
  }

  const buffer = target.buffer;
  if (!buffer) throw new Error('Export produced no data.');
  return new Blob([buffer], { type: 'video/mp4' });
}
