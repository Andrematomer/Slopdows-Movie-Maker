import { layout, type Segment } from '../model/layout';
import type { Project } from '../model/types';
import { drawTitleCard } from './titleCard';
import { drawTransition, pixelate } from './transitions';
import type { Assets, Ctx } from './types';
import { drawWatermarks } from './watermarks';

function drawSegment(ctx: Ctx, project: Project, seg: Segment, t: number, assets: Assets): void {
  const { width: w, height: h } = project;
  const local = Math.max(0, Math.min(seg.clip.duration, t - seg.start));
  const clip = seg.clip;
  if (clip.kind === 'title') {
    drawTitleCard(ctx, w, h, clip.title, clip.subtitle, local, clip.duration);
    return;
  }
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
  const img = assets.getImage(clip.id);
  if (!img) return;
  const iw = (img as { width: number }).width;
  const ih = (img as { height: number }).height;
  if (!iw || !ih) return;
  const scale = Math.min(w / iw, h / ih); // contain, with black bars like the old days
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/**
 * The one function that paints a frame. Preview and export both call this,
 * so what you see is what you get (including the ugly parts).
 */
export function renderFrame(ctx: Ctx, project: Project, time: number, assets: Assets): void {
  const { width: w, height: h } = project;
  const { segments, total } = layout(project);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  if (segments.length > 0) {
    const t = Math.max(0, Math.min(time, total - 1e-6));
    let cur = segments[0]!;
    for (const s of segments) {
      if (s.start <= t) cur = s;
    }
    const prev = cur.index > 0 ? segments[cur.index - 1]! : null;
    if (prev && cur.overlap > 0 && t < cur.start + cur.overlap) {
      const p = (t - cur.start) / cur.overlap;
      drawTransition(
        ctx,
        cur.clip.transitionIn,
        p,
        w,
        h,
        () => drawSegment(ctx, project, prev, t, assets),
        () => drawSegment(ctx, project, cur, t, assets),
      );
    } else {
      drawSegment(ctx, project, cur, t, assets);
    }
  }

  drawWatermarks(ctx, w, h, project.watermarks);

  if (project.mode2008) {
    // cheap-webcam look: the image gets mushed, and the encoder will mush it more
    pixelate(ctx, w, h, 2);
  }
  ctx.restore();
}
