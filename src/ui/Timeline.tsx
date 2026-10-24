import { useEffect, useRef } from 'preact/hooks';
import { getMediaAudio, getMediaDuration, getThumbUrl } from '../model/assets';
import { layout } from '../model/layout';
import { selectClip, setState, updateAudioClip, updateClip, useStore } from '../model/store';
import type { AudioClip, Clip } from '../model/types';

const MIN_LEN = 0.5;
const LANE_H = 44;

/** Peak (0..1) per 20 ms bin, cached per media file. */
const peakCache = new Map<string, Float32Array>();
const BIN = 0.02;
function peaksFor(mediaId: string): Float32Array | null {
  const cached = peakCache.get(mediaId);
  if (cached) return cached;
  const buf = getMediaAudio(mediaId);
  if (!buf) return null;
  const data = buf.getChannelData(0);
  const per = Math.max(1, Math.round(buf.sampleRate * BIN));
  const out = new Float32Array(Math.ceil(data.length / per));
  for (let i = 0; i < out.length; i++) {
    let m = 0;
    const end = Math.min(data.length, (i + 1) * per);
    for (let j = i * per; j < end; j += 4) m = Math.max(m, Math.abs(data[j]!));
    out[i] = m;
  }
  peakCache.set(mediaId, out);
  return out;
}

function Waveform({ mediaId, trimStart, duration, pps }: { mediaId: string; trimStart: number; duration: number; pps: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const peaks = peaksFor(mediaId);
    if (!c || !peaks) return;
    const w = Math.max(1, Math.round(duration * pps));
    c.width = Math.min(w, 4000);
    c.height = LANE_H - 14;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(0,0,0,.55)';
    const mid = c.height / 2;
    for (let x = 0; x < c.width; x++) {
      const t0 = trimStart + (x / c.width) * duration;
      const t1 = trimStart + ((x + 1) / c.width) * duration;
      let m = 0;
      for (let b = Math.floor(t0 / BIN); b <= Math.floor(t1 / BIN) && b < peaks.length; b++) m = Math.max(m, peaks[b]!);
      const h = Math.max(1, m * c.height);
      g.fillRect(x, mid - h / 2, 1, h);
    }
  }, [mediaId, trimStart, duration, pps]);
  return <canvas ref={ref} class="wave" style={{ width: `${duration * pps}px` }} />;
}

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Drag helper: calls onMove(dx pixels) until the pointer is released. */
function drag(e: PointerEvent, onMove: (dx: number, ev: PointerEvent) => void): void {
  e.preventDefault();
  e.stopPropagation();
  const x0 = e.clientX;
  const move = (ev: PointerEvent) => onMove(ev.clientX - x0, ev);
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

export function Timeline({ pps, onZoom }: { pps: number; onZoom: (v: number) => void }) {
  const project = useStore((s) => s.project);
  const time = useStore((s) => s.time);
  const playing = useStore((s) => s.playing);
  const selectedIds = useStore((s) => s.selectedIds);
  useStore((s) => s.assetRev);
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const { segments, total } = layout(project);
  const audioEnd = Math.max(0, ...project.audioClips.map((a) => a.start + a.duration));
  const span = Math.max(total, audioEnd, 10);
  const width = Math.ceil(span * pps) + 160;

  // keep the playhead visible while playing
  useEffect(() => {
    const el = scroller.current;
    if (!el || !playing) return;
    const x = time * pps;
    if (x < el.scrollLeft || x > el.scrollLeft + el.clientWidth - 40) el.scrollLeft = Math.max(0, x - 60);
  }, [time, playing, pps]);

  const timeAt = (clientX: number) => {
    const r = content.current!.getBoundingClientRect();
    return Math.max(0, Math.min(total, (clientX - r.left) / pps));
  };
  const seek = (e: PointerEvent) => {
    drag(e, (_dx, ev) => setState({ time: timeAt(ev.clientX), playing: false }));
    setState({ time: timeAt(e.clientX), playing: false });
  };

  // snapping targets: playhead, 0, every clip boundary, every audio edge
  const targets = (skipId: string): number[] => [
    0,
    time,
    ...segments.flatMap((s) => (s.clip.id === skipId ? [] : [s.start, s.end])),
    ...project.audioClips.flatMap((a) => (a.id === skipId ? [] : [a.start, a.start + a.duration])),
  ];
  const snap = (t: number, skipId: string): number => {
    const tol = 7 / pps;
    let best = t;
    let bd = tol;
    for (const x of targets(skipId)) if (Math.abs(x - t) < bd) ((best = x), (bd = Math.abs(x - t)));
    return best;
  };

  const trimClipEnd = (c: Clip) => (e: PointerEvent) => {
    setState({ selectedId: c.id });
    const d0 = c.duration;
    const start = segments.find((s) => s.clip.id === c.id)!.start;
    const max = c.kind === 'video' ? Math.max(MIN_LEN, getMediaDuration(c.mediaId) - c.trimStart) : 3600;
    drag(e, (dx) => updateClip(c.id, { duration: Math.max(MIN_LEN, Math.min(max, snap(start + d0 + dx / pps, c.id) - start)) }));
  };
  const trimClipStart = (c: Clip) => (e: PointerEvent) => {
    setState({ selectedId: c.id });
    const d0 = c.duration;
    const t0 = c.kind === 'video' ? c.trimStart : 0;
    drag(e, (dx) => {
      const lo = c.kind === 'video' ? -t0 : -3600;
      const d = Math.max(lo, Math.min(d0 - MIN_LEN, dx / pps));
      updateClip(c.id, { duration: d0 - d, ...(c.kind === 'video' ? { trimStart: t0 + d } : {}) } as Partial<Clip>);
    });
  };

  const moveAudio = (a: AudioClip) => (e: PointerEvent) => {
    const s0 = a.start;
    drag(e, (dx) => {
      let ns = Math.max(0, s0 + dx / pps);
      // snap either edge
      const sStart = snap(ns, a.id);
      const sEnd = snap(ns + a.duration, a.id) - a.duration;
      ns = Math.abs(sStart - ns) <= Math.abs(sEnd - ns) ? sStart : sEnd;
      updateAudioClip(a.id, { start: Math.max(0, ns) });
    });
  };
  const trimAudioStart = (a: AudioClip) => (e: PointerEvent) => {
    setState({ selectedId: a.id });
    const { start: s0, trimStart: t0, duration: d0 } = a;
    drag(e, (dx) => {
      const d = Math.max(-Math.min(t0, s0), Math.min(d0 - MIN_LEN, dx / pps));
      updateAudioClip(a.id, { start: s0 + d, trimStart: t0 + d, duration: d0 - d });
    });
  };
  const trimAudioEnd = (a: AudioClip) => (e: PointerEvent) => {
    setState({ selectedId: a.id });
    const max = Math.max(MIN_LEN, getMediaDuration(a.mediaId) - a.trimStart);
    drag(e, (dx) => updateAudioClip(a.id, { duration: Math.max(MIN_LEN, Math.min(max, snap(a.start + a.duration + dx / pps, a.id) - a.start)) }));
  };

  // ruler ticks
  const step = pps >= 80 ? 1 : pps >= 40 ? 2 : pps >= 20 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = 0; t <= span + 1; t += step) ticks.push(t);

  const click = (e: MouseEvent, id: string) =>
    selectClip(id, e.shiftKey ? 'range' : e.ctrlKey || e.metaKey ? 'toggle' : 'only');

  return (
    <div class="timeline">
      <div class="tl-zoom">
        <button title="Zoom out" onClick={() => onZoom(Math.max(8, pps / 1.5))}>−</button>
        <button title="Zoom in" onClick={() => onZoom(Math.min(240, pps * 1.5))}>+</button>
      </div>
      <div class="tl-scroll" ref={scroller}>
        <div class="tl-content" ref={content} style={{ width: `${width}px` }}>
          <div class="tl-ruler" onPointerDown={seek}>
            {ticks.map((t) => (
              <span key={t} class="tick" style={{ left: `${t * pps}px` }}>{fmt(t)}</span>
            ))}
          </div>

          <div class="tl-lane" style={{ height: `${LANE_H}px` }} onPointerDown={seek}>
            {segments.map((seg) => {
              const c = seg.clip;
              const thumb = c.kind === 'title' ? undefined : getThumbUrl(c.mediaId);
              const label = c.kind === 'title' ? c.title.split('\n')[0] : c.name;
              return (
                <div
                  key={c.id}
                  class={`tl-clip ${c.kind} ${selectedIds.includes(c.id) ? 'selected' : ''}`}
                  style={{
                    left: `${seg.start * pps}px`,
                    width: `${c.duration * pps}px`,
                    backgroundImage: thumb ? `url(${thumb})` : undefined,
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    click(e, c.id);
                    setState({ time: timeAt(e.clientX), playing: false });
                  }}
                  title={`${label} (${c.duration.toFixed(1)} s)`}
                >
                  {seg.overlap > 0 && <span class="tl-overlap" style={{ width: `${seg.overlap * pps}px` }} />}
                  <span class="tl-label">{label}</span>
                  <span class="handle left" onPointerDown={trimClipStart(c)} title="Drag to trim the start" />
                  <span class="handle right" onPointerDown={trimClipEnd(c)} title="Drag to trim the end" />
                </div>
              );
            })}
          </div>

          <div class="tl-lane audio" style={{ height: `${LANE_H - 10}px` }} onPointerDown={seek}>
            {project.audioClips.map((a) => (
              <div
                key={a.id}
                class={`tl-clip audio ${selectedIds.includes(a.id) ? 'selected' : ''}`}
                style={{ left: `${a.start * pps}px`, width: `${a.duration * pps}px` }}
                onPointerDown={(e) => {
                  if (e.shiftKey || e.ctrlKey || e.metaKey) return click(e, a.id);
                  setState({ selectedId: a.id });
                  moveAudio(a)(e);
                }}
                title={`${a.name} (${a.duration.toFixed(1)} s). Drag to move`}
              >
                <Waveform mediaId={a.mediaId} trimStart={a.trimStart} duration={a.duration} pps={pps} />
                <span class="tl-label">{a.name}</span>
                <span class="handle left" onPointerDown={trimAudioStart(a)} title="Drag to trim the start" />
                <span class="handle right" onPointerDown={trimAudioEnd(a)} title="Drag to trim the end" />
              </div>
            ))}
          </div>

          <div class="tl-playhead" style={{ left: `${time * pps}px` }} />
        </div>
      </div>
    </div>
  );
}
