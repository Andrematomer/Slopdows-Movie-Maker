import type { TransitionKind } from '../model/types';
import type { Ctx } from './types';

type Draw = () => void;

let scratch: HTMLCanvasElement | OffscreenCanvas | null = null;

function getScratch(w: number, h: number): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: Ctx } {
  if (!scratch) {
    scratch =
      typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  }
  if (scratch.width !== w) scratch.width = w;
  if (scratch.height !== h) scratch.height = h;
  const ctx = scratch.getContext('2d') as Ctx;
  return { canvas: scratch, ctx };
}

/** Blocky mosaic of whatever is currently on the canvas. */
export function pixelate(ctx: Ctx, w: number, h: number, block: number): void {
  if (block <= 1) return;
  const sw = Math.max(1, Math.ceil(w / block));
  const sh = Math.max(1, Math.ceil(h / block));
  const { canvas, ctx: s } = getScratch(sw, sh);
  s.imageSmoothingEnabled = true;
  s.clearRect(0, 0, sw, sh);
  s.drawImage(ctx.canvas, 0, 0, w, h, 0, 0, sw, sh);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, 0, 0, sw, sh, 0, 0, w, h);
  ctx.restore();
}

function starPath(ctx: Ctx, cx: number, cy: number, outer: number, rot: number): void {
  const inner = outer * 0.4;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Draw the A -> B transition at progress p (0..1).
 * drawA / drawB each paint their clip full-frame.
 */
export function drawTransition(
  ctx: Ctx,
  kind: TransitionKind,
  p: number,
  w: number,
  h: number,
  drawA: Draw,
  drawB: Draw,
): void {
  if (kind === 'cut' || p >= 1) {
    drawB();
    return;
  }
  const cx = w / 2;
  const cy = h / 2;
  const diag = Math.hypot(w, h);

  switch (kind) {
    case 'fade': {
      drawA();
      ctx.save();
      ctx.globalAlpha = clamp01(p);
      drawB();
      ctx.restore();
      break;
    }
    case 'star': {
      drawA();
      ctx.save();
      starPath(ctx, cx, cy, diag * 1.3 * p, p * Math.PI);
      ctx.clip();
      drawB();
      ctx.restore();
      break;
    }
    case 'iris': {
      drawA();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, (diag / 2) * p, 0, Math.PI * 2);
      ctx.clip();
      drawB();
      ctx.restore();
      break;
    }
    case 'checker': {
      drawA();
      const cols = 8;
      const rows = 6;
      const cw = w / cols;
      const ch = h / rows;
      ctx.save();
      ctx.beginPath();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const stagger = (c + r) / (cols + rows - 2);
          const local = clamp01(p * 1.6 - stagger * 0.6);
          if (local <= 0) continue;
          const rw = cw * local;
          const rh = ch * local;
          ctx.rect(c * cw + (cw - rw) / 2, r * ch + (ch - rh) / 2, rw, rh);
        }
      }
      ctx.clip();
      drawB();
      ctx.restore();
      break;
    }
    case 'pixelate': {
      if (p < 0.5) drawA();
      else drawB();
      pixelate(ctx, w, h, 1 + Math.sin(p * Math.PI) * 48);
      break;
    }
    case 'spin': {
      drawA();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((1 - p) * Math.PI * 4);
      ctx.scale(p, p);
      ctx.translate(-cx, -cy);
      drawB();
      ctx.restore();
      break;
    }
  }
}

export function randomTransition(): TransitionKind {
  const all: TransitionKind[] = ['fade', 'star', 'iris', 'checker', 'pixelate', 'spin'];
  return all[Math.floor(Math.random() * all.length)]!;
}
