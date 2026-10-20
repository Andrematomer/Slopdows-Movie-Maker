import type { Ctx } from './types';

/** Classic deep blue. */
export const TITLE_BLUE = '#000080';
const FADE_SECONDS = 0.6;

function fitFont(ctx: Ctx, lines: string[], maxWidth: number, startPx: number): number {
  let px = startPx;
  while (px > 8) {
    ctx.font = `${px}px Arial, Arimo, Helvetica, sans-serif`;
    if (lines.every((l) => ctx.measureText(l).width <= maxWidth)) break;
    px -= 2;
  }
  return px;
}

/** White Arial on blue, centered, fading in and out. */
export function drawTitleCard(
  ctx: Ctx,
  w: number,
  h: number,
  title: string,
  subtitle: string,
  localT: number,
  duration: number,
): void {
  ctx.fillStyle = TITLE_BLUE;
  ctx.fillRect(0, 0, w, h);

  const fadeIn = Math.min(1, localT / FADE_SECONDS);
  const fadeOut = Math.min(1, (duration - localT) / FADE_SECONDS);
  const alpha = Math.max(0, Math.min(fadeIn, fadeOut));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const titleLines = title.split('\n');
  const subLines = subtitle ? subtitle.split('\n') : [];
  const maxW = w * 0.9;

  const titlePx = fitFont(ctx, titleLines, maxW, Math.round(h * 0.11));
  const titleLine = titlePx * 1.2;
  const subPx = fitFont(ctx, subLines, maxW, Math.round(h * 0.06));
  const subLine = subPx * 1.25;

  const blockH =
    titleLines.length * titleLine + (subLines.length ? h * 0.04 + subLines.length * subLine : 0);
  let y = (h - blockH) / 2 + titleLine / 2;

  ctx.font = `${titlePx}px Arial, Arimo, Helvetica, sans-serif`;
  for (const line of titleLines) {
    ctx.fillText(line, w / 2, y);
    y += titleLine;
  }
  y += h * 0.04 - titleLine / 2 + subLine / 2;
  ctx.font = `${subPx}px Arial, Arimo, Helvetica, sans-serif`;
  for (const line of subLines) {
    ctx.fillText(line, w / 2, y);
    y += subLine;
  }
  ctx.restore();
}
