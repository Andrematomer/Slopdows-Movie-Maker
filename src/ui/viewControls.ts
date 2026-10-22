/** Browser full screen (the whole app, like F11). */
export function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  else void document.documentElement.requestFullscreen?.().catch(() => {});
}

/**
 * Zoom. Web pages are not allowed to drive the browser's own zoom (Ctrl +/-), so this scales the
 * app with CSS instead. Ctrl +/- still works as usual on top of it.
 */
const STEPS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
let zoom = 1;

function apply(): void {
  const el = document.getElementById('app');
  if (!el) return;
  el.style.zoom = String(zoom);
  el.style.height = `${100 / zoom}vh`;
}

export function zoomBy(dir: 1 | -1): void {
  const i = STEPS.findIndex((s) => Math.abs(s - zoom) < 1e-6);
  zoom = STEPS[Math.max(0, Math.min(STEPS.length - 1, (i < 0 ? 5 : i) + dir))]!;
  apply();
}

export function zoomReset(): void {
  zoom = 1;
  apply();
}
