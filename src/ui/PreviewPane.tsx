import { useEffect, useRef } from 'preact/hooks';
import { assets } from '../model/assets';
import { getState, setState, totalDuration, useStore } from '../model/store';
import { renderFrame } from '../render/renderFrame';
import { timecode } from './format';

export function PreviewPane() {
  const project = useStore((s) => s.project);
  const time = useStore((s) => s.time);
  const playing = useStore((s) => s.playing);
  const assetRev = useStore((s) => s.assetRev);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const total = totalDuration();

  // repaint whenever anything visible changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = project.width;
    canvas.height = project.height;
    const ctx = canvas.getContext('2d');
    if (ctx) renderFrame(ctx, project, time, assets);
  }, [project, time, assetRev]);

  // playback clock
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const t = getState().time + dt;
      const end = totalDuration();
      if (t >= end) {
        setState({ time: 0, playing: false });
        return;
      }
      setState({ time: t });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const aspect = `${project.width} / ${project.height}`;

  return (
    <div class="preview">
      <div class="preview-screen" style={{ aspectRatio: aspect }}>
        <canvas ref={canvasRef} />
      </div>
      <input
        class="seek"
        type="range"
        min={0}
        max={Math.max(total, 0.01)}
        step={0.01}
        value={time}
        onInput={(e) => setState({ time: Number((e.target as HTMLInputElement).value), playing: false })}
      />
      <div class="transport">
        <button onClick={() => setState({ playing: !playing, time: playing || time < total ? time : 0 })}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={() => setState({ playing: false, time: 0 })}>⏹ Stop</button>
        <span class="timecode">
          {timecode(time)} / {timecode(total)}
        </span>
      </div>
    </div>
  );
}
