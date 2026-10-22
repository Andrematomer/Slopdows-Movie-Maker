import { layout, type Segment } from '../model/layout';
import type { PictureFit, Project } from '../model/types';
import { OLD_CAMERA_FPS, applyOldCamera, scratchContext, snap24 } from './oldCamera';
import { drawTitleCard } from './titleCard';
import { drawTransition, pixelate } from './transitions';
import type { Assets, Ctx } from './types';
import { drawWatermarks } from './watermarks';

function drawPicture(ctx: Ctx, w: number, h: number, img: CanvasImageSource, fit: PictureFit): void {
  const iw = (img as { width: number }).width;
  const ih = (img as { height: number }).height;
  if (!iw || !ih) return;
  if (fit === 'stretch') {
    ctx.drawImage(img, 0, 0, w, h);
    return;
  }
  // fit = whole picture with black bars (the old default), fill = covers the screen and crops
  const scale = fit === 'fill' ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function drawSegment(ctx: Ctx, project: Project, seg: Segment, t: number, assets: Assets): void {
  const { width: w, height: h } = project;
  const local = Math.max(0, Math.min(seg.clip.duration, t - seg.start));
  const clip = seg.clip;
  if (clip.kind === 'title') {
    drawTitleCard(ctx, w, h, clip.title, clip.subtitle, local, clip.duration);
    return;
  }
  const img = clip.kind === 'video' ? assets.getVideoFrame(clip.id) : assets.getImage(clip.mediaId);
  const fit = clip.fit ?? 'fit';
  if (!clip.oldCamera) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    if (img) drawPicture(ctx, w, h, img, fit);
    return;
  }
  // old camera: paint on a scratch canvas, grade it, then copy it over (keeps transitions clean)
  const sc = scratchContext(w, h);
  sc.fillStyle = '#000000';
  sc.fillRect(0, 0, w, h);
  if (img) drawPicture(sc, w, h, img, fit);
  applyOldCamera(sc, w, h, Math.round(snap24(t) * OLD_CAMERA_FPS));
  ctx.drawImage(sc.canvas as CanvasImageSource, 0, 0);
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
