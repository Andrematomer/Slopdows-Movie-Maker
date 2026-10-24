import { useEffect, useRef } from 'preact/hooks';
import { assets, prepare } from '../model/assets';
import { startPreviewAudio, stopPreviewAudio } from '../media/mix';
import { getState, setState, togglePlay, totalDuration, useStore } from '../model/store';
import { renderFrame } from '../render/renderFrame';
import { timecode } from './format';
import { Icon } from './icons';
import { toggleFullscreen } from './viewControls';

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
    if (!ctx) return;
    const draw = () => {
      const st = getState();
      renderFrame(ctx, st.project, st.time, assets);
    };
    // while playing, draw once per tick (after the frame is ready); when paused/scrubbing, show something at once
    if (!getState().playing) draw();
    // then fetch the exact video frames and draw again
    void prepare(project, time).then(draw, draw);
  }, [project, time, assetRev]);

  // sound: starts when playback starts, stops when it stops
  useEffect(() => {
    if (playing) startPreviewAudio(getState().project, getState().time);
    else stopPreviewAudio();
    return stopPreviewAudio;
  }, [playing]);

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
        <button onClick={togglePlay}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={() => setState({ playing: false, time: 0 })}>⏹ Stop</button>
        <button title="Full screen (Esc to leave)" onClick={toggleFullscreen}>
          <Icon name="full" /> Full Screen
        </button>
        <span class="timecode">
          {timecode(time)} / {timecode(total)}
        </span>
      </div>
    </div>
  );
}
