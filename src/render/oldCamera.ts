import type { Ctx } from './types';

/** Early-digital-camcorder frame rate. */
export const OLD_CAMERA_FPS = 24;

/** Snaps a time to the old camera's frame grid, so motion steps at 24 fps even inside a 30 fps movie. */
export const snap24 = (seconds: number): number => Math.floor(seconds * OLD_CAMERA_FPS + 1e-6) / OLD_CAMERA_FPS;

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let scratch: HTMLCanvasElement | OffscreenCanvas | null = null;

/** A reusable w x h canvas to draw a clip on before the camera look is applied. */
export function scratchContext(w: number, h: number): Ctx {
  if (!scratch || scratch.width !== w || scratch.height !== h) {
    scratch =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(w, h)
        : Object.assign(document.createElement('canvas'), { width: w, height: h });
  }
  const c = scratch.getContext('2d', { willReadFrequently: true }) as Ctx | null;
  if (!c) throw new Error('no 2d context');
  return c;
}

/**
 * Early CCD look: contrast and saturation pushed too far, plus sensor grain.
 * `frameSeed` changes 24 times a second, and the same time always gives the same grain,
 * so preview and export match.
 */
export function applyOldCamera(ctx: Ctx, w: number, h: number, frameSeed: number): void {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const rand = rng(frameSeed * 2654435761);
  const CONTRAST = 1.3;
  const SAT = 1.55;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i]!;
    let g = d[i + 1]!;
    let b = d[i + 2]!;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    r = lum + (r - lum) * SAT;
    g = lum + (g - lum) * SAT;
    b = lum + (b - lum) * SAT;
    const n = (rand() - 0.5) * 38; // grain, same on all channels (luma noise)
    d[i] = (r - 128) * CONTRAST + 128 + n;
    d[i + 1] = (g - 128) * CONTRAST + 128 + n;
    d[i + 2] = (b - 128) * CONTRAST + 128 + n;
  }
  ctx.putImageData(img, 0, 0);
}
