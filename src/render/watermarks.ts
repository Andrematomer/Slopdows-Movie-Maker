import type { Watermarks } from '../model/types';
import type { Ctx } from './types';

function outlined(ctx: Ctx, text: string, x: number, y: number, fill: string): void {
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/**
 * Parody screen-recorder watermarks. Original look, deliberately not a copy of any real
 * product's font or layout. Text is user-editable.
 */
export function drawWatermarks(ctx: Ctx, w: number, h: number, wm: Watermarks): void {
  if (!wm.hypercam && !wm.bandi) return;
  ctx.save();
  ctx.textBaseline = 'top';
  const px = Math.max(10, Math.round(h * 0.03));

  if (wm.hypercam && wm.hypercamText) {
    ctx.font = `bold ${px}px Arial, Arimo, sans-serif`;
    ctx.textAlign = 'left';
    outlined(ctx, wm.hypercamText, 6, 4, '#ffffff');
  }
  if (wm.bandi && wm.bandiText) {
    ctx.font = `${Math.round(px * 1.1)}px Arial, Arimo, sans-serif`;
    ctx.textAlign = 'center';
    outlined(ctx, wm.bandiText, w / 2, 4, '#ffe600');
  }
  ctx.restore();
}
