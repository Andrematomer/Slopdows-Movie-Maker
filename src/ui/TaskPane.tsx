import { useState } from 'preact/hooks';
import { getMediaDuration } from '../model/assets';
import {
  patchAudioClips,
  patchClips,
  redo,
  removeClips,
  selectAll,
  setMode2008,
  setResolution,
  splitAtPlayhead,
  trimAtPlayhead,
  undo,
  updateAudioClip,
  updateClip,
  useStore,
} from '../model/store';
import {
  DEFAULT_HYPER_TEXT,
  DEFAULT_SITE_TEXT,
  TRANSITIONS,
  type Clip,
  type ImageClip,
  type PictureFit,
  type VideoClip,
} from '../model/types';
import { Icon } from './icons';

interface Props {
  onImport: () => void;
  onAddTitle: () => void;
  onExport: () => void;
}

const RECOMMENDED = [
  { w: 320, h: 240, label: '320 × 240 (recommended)' },
  { w: 640, h: 480, label: '640 × 480 (recommended)' },
  { w: 800, h: 600, label: '800 × 600 (recommended)' },
];
const MODERN = [
  { w: 854, h: 480, label: '854 × 480 (480p)' },
  { w: 1280, h: 720, label: '1280 × 720 (HD)' },
  { w: 1920, h: 1080, label: '1920 × 1080 (Full HD)' },
  { w: 2560, h: 1440, label: '2560 × 1440 (QHD)' },
  { w: 3840, h: 2160, label: '3840 × 2160 (4K, slow)' },
];

const num = (e: Event) => Number((e.target as HTMLInputElement).value);

/** Do all values agree? `value` is the shared one (or the first, if mixed). */
function agree<T>(vals: T[]): { value: T | undefined; mixed: boolean } {
  const first = vals[0];
  return { value: first, mixed: vals.some((v) => v !== first) };
}

function Link({ onClick, children, disabled }: { onClick: () => void; children: preact.ComponentChildren; disabled?: boolean }) {
  return (
    <a
      href="#"
      class={disabled ? 'disabled' : ''}
      onClick={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
    >
      {children}
    </a>
  );
}

export function TaskPane({ onImport, onAddTitle, onExport }: Props) {
  const project = useStore((s) => s.project);
  const selectedIds = useStore((s) => s.selectedIds);
  const ids = new Set(selectedIds);
  const clips: Clip[] = project.clips.filter((c) => ids.has(c.id));
  const audio = project.audioClips.filter((a) => ids.has(a.id));
  const total = clips.length + audio.length;
  const pics = clips.filter((c): c is ImageClip | VideoClip => c.kind !== 'title');
  const vids = clips.filter((c): c is VideoClip => c.kind === 'video');
  const oneClip = total === 1 ? clips[0] : undefined;
  const oneAudio = total === 1 ? audio[0] : undefined;

  const knownSize = [...RECOMMENDED, ...MODERN].some((r) => r.w === project.width && r.h === project.height);
  const isModern = !RECOMMENDED.some((r) => r.w === project.width && r.h === project.height);
  const [unlocked, setUnlocked] = useState(isModern);
  const showModern = unlocked || isModern;

  const clipIds = clips.map((c) => c.id);
  const picIds = pics.map((c) => c.id);

  const fit = agree(pics.map((c) => c.fit ?? 'fit'));
  const oldCam = pics.map((c) => !!c.oldCamera);
  const wmHyper = pics.map((c) => !!c.wmHyper);
  const wmSite = pics.map((c) => !!c.wmSite);
  const hyperText = agree(pics.map((c) => c.wmHyperText ?? DEFAULT_HYPER_TEXT));
  const siteText = agree(pics.map((c) => c.wmSiteText ?? DEFAULT_SITE_TEXT));
  const transition = agree(clips.map((c) => c.transitionIn));
  const volumes = [...vids.map((c) => c.volume), ...audio.map((a) => a.volume)];
  const volume = agree(volumes);
  const duration = agree(clips.map((c) => c.duration));

  const setVolume = (v: number) => {
    if (vids.length) patchClips(vids.map((c) => c.id), { volume: v });
    if (audio.length) patchAudioClips(audio.map((a) => a.id), { volume: v });
  };

  const checkbox = (id: string, label: string, vals: boolean[], onSet: (on: boolean) => void, hint?: string) => {
    const all = vals.every(Boolean);
    const some = vals.some(Boolean);
    return (
      <div class="check-row">
        <input id={id} type="checkbox" checked={all} onChange={() => onSet(!all)} />
        <label for={id} title={hint}>
          {label}
          {some && !all ? ' (some)' : ''}
        </label>
      </div>
    );
  };

  const durationBounds = (c: Clip | undefined) => ({
    min: c?.kind === 'video' ? 0.5 : 1,
    max: c?.kind === 'video' ? Math.max(0.5, getMediaDuration(c.mediaId) - c.trimStart) : 3600,
  });

  return (
    <div class="taskpane">
      <h3>Movie Tasks</h3>

      <details open>
        <summary>1. Import</summary>
        <Link onClick={onImport}><Icon name="picture" /> Import pictures, video or music</Link>
        <Link onClick={onAddTitle}><Icon name="title" /> Add title or credits</Link>
      </details>

      <details open>
        <summary>2. Edit Movie</summary>
        <Link onClick={undo}>Undo (Ctrl+Z)</Link>
        <Link onClick={redo}>Redo (Ctrl+Y)</Link>
        <Link onClick={selectAll}>Select all clips (Ctrl+A)</Link>
        <Link onClick={splitAtPlayhead} disabled={total !== 1 || oneClip?.kind === 'title'}>
          <Icon name="scissors" /> Split at playhead (S)
        </Link>
        <Link onClick={() => trimAtPlayhead('start')} disabled={total !== 1}>Set start at playhead (I)</Link>
        <Link onClick={() => trimAtPlayhead('end')} disabled={total !== 1}>Set end at playhead (O)</Link>
      </details>

      <details open>
        <summary>3. Finish Movie</summary>
        <div class="check-row">
          <input id="cb-2008" type="checkbox" checked={project.mode2008} onChange={(e) => setMode2008((e.target as HTMLInputElement).checked)} />
          <label for="cb-2008" title="Worse picture and worse sound, like a video uploaded in 2008">2008 YouTube mode (uglier)</label>
        </div>
        <p class="hint-small">Blurrier picture and tinny sound, like a video uploaded in 2008.</p>
        <label>
          Size:{' '}
          <select
            value={`${project.width}x${project.height}`}
            onChange={(e) => {
              const [w, h] = (e.target as HTMLSelectElement).value.split('x').map(Number);
              setResolution(w!, h!);
            }}
          >
            {RECOMMENDED.map((r) => (
              <option key={r.label} value={`${r.w}x${r.h}`}>{r.label}</option>
            ))}
            {showModern && MODERN.map((r) => (
              <option key={r.label} value={`${r.w}x${r.h}`}>{r.label}</option>
            ))}
            {!knownSize && <option value={`${project.width}x${project.height}`}>{project.width} × {project.height}</option>}
          </select>
        </label>
        <div class="check-row">
          <input
            id="cb-unlock"
            type="checkbox"
            checked={showModern}
            onChange={(e) => {
              const on = (e.target as HTMLInputElement).checked;
              setUnlocked(on);
              if (!on && isModern) setResolution(640, 480); // back to a recommended size
            }}
          />
          <label for="cb-unlock">Unlock more resolutions (not recommended)</label>
        </div>
        <Link onClick={onExport}><Icon name="save" /> Save to my computer</Link>
      </details>

      {(clips.length > 0 || audio.length > 1) && (
        <fieldset class="props">
          <legend>{total === 1 ? 'Selected clip' : `Selected clips (${total})`}</legend>

          {oneClip?.kind === 'title' && (
            <>
              <label>Title</label>
              <textarea rows={2} value={oneClip.title} onInput={(e) => updateClip(oneClip.id, { title: (e.target as HTMLTextAreaElement).value })} />
              <label>Subtitle / credits</label>
              <textarea rows={2} value={oneClip.subtitle} onInput={(e) => updateClip(oneClip.id, { subtitle: (e.target as HTMLTextAreaElement).value })} />
            </>
          )}

          {oneClip?.kind === 'video' && (
            <label>
              Trim start (s){' '}
              <input
                type="number"
                min={0}
                step={0.1}
                value={Number(oneClip.trimStart.toFixed(2))}
                onInput={(e) => {
                  const dur = getMediaDuration(oneClip.mediaId);
                  const v = Math.max(0, Math.min(num(e), Math.max(0, dur - 0.5)));
                  if (Number.isFinite(v)) updateClip(oneClip.id, { trimStart: v, duration: Math.min(oneClip.duration, Math.max(0.5, dur - v)) });
                }}
              />
            </label>
          )}

          {pics.length > 0 && (
            <>
              <label>
                Picture fit{' '}
                <select value={fit.mixed ? '' : fit.value} onChange={(e) => patchClips(picIds, { fit: (e.target as HTMLSelectElement).value as PictureFit }, (c) => c.kind !== 'title')}>
                  {fit.mixed && <option value="" disabled>(mixed)</option>}
                  <option value="fit">Fit (black bars)</option>
                  <option value="fill">Fill (crop edges)</option>
                  <option value="stretch">Stretch (distort)</option>
                </select>
              </label>
              {checkbox('cb-oldcam', 'Old camera look', oldCam, (on) => patchClips(picIds, { oldCamera: on }), '24 fps, grain, harsh contrast and colours')}
              {checkbox('cb-wm-hyper', 'Screen recorder watermark', wmHyper, (on) => patchClips(picIds, { wmHyper: on }))}
              {wmHyper.some(Boolean) && (
                <input
                  type="text"
                  class="wide"
                  value={hyperText.mixed ? '' : hyperText.value}
                  placeholder={hyperText.mixed ? '(different texts)' : ''}
                  onInput={(e) => patchClips(picIds, { wmHyperText: (e.target as HTMLInputElement).value })}
                />
              )}
              {checkbox('cb-wm-site', 'Website watermark (top center)', wmSite, (on) => patchClips(picIds, { wmSite: on }))}
              {wmSite.some(Boolean) && (
                <input
                  type="text"
                  class="wide"
                  value={siteText.mixed ? '' : siteText.value}
                  placeholder={siteText.mixed ? '(different texts)' : ''}
                  onInput={(e) => patchClips(picIds, { wmSiteText: (e.target as HTMLInputElement).value })}
                />
              )}
            </>
          )}

          {volumes.length > 0 && (
            <label>
              Volume{' '}
              <input type="range" min={0} max={1} step={0.05} value={volume.value ?? 1} onInput={(e) => setVolume(num(e))} />
              {volume.mixed ? ' (mixed)' : ''}
            </label>
          )}

          {clips.length > 0 && audio.length === 0 && (oneClip || vids.length === 0) && (
            <label>
              Duration (s){' '}
              <input
                type="number"
                min={durationBounds(oneClip).min}
                max={durationBounds(oneClip).max}
                step={0.5}
                value={duration.mixed ? '' : Number((duration.value ?? 0).toFixed(2))}
                placeholder={duration.mixed ? 'mixed' : ''}
                onInput={(e) => {
                  const v = num(e);
                  const b = durationBounds(oneClip);
                  if ((e.target as HTMLInputElement).value !== '' && v >= b.min) patchClips(clipIds, { duration: Math.min(v, b.max) });
                }}
              />
            </label>
          )}

          {clips.length > 0 && (
            <label>
              Transition in{' '}
              <select value={transition.mixed ? '' : transition.value} onChange={(e) => patchClips(clipIds, { transitionIn: (e.target as HTMLSelectElement).value })}>
                {transition.mixed && <option value="" disabled>(mixed)</option>}
                {TRANSITIONS.map((t) => (
                  <option value={t.kind} key={t.kind}>{t.label}</option>
                ))}
              </select>
            </label>
          )}

          {oneClip && oneClip.kind !== 'title' && (
            <>
              <button onClick={splitAtPlayhead} title="Cut at the playhead">
                <Icon name="scissors" /> Split at playhead
              </button>{' '}
            </>
          )}
          <button onClick={() => removeClips(selectedIds)}>{total === 1 ? 'Remove clip' : `Remove ${total} clips`}</button>
        </fieldset>
      )}

      {oneAudio && (
        <fieldset class="props">
          <legend>Selected audio</legend>
          <label>
            Starts at (s){' '}
            <input type="number" min={0} step={0.5} value={Number(oneAudio.start.toFixed(2))} onInput={(e) => num(e) >= 0 && updateAudioClip(oneAudio.id, { start: num(e) })} />
          </label>
          <label>
            Trim start (s){' '}
            <input
              type="number"
              min={0}
              step={0.5}
              value={Number(oneAudio.trimStart.toFixed(2))}
              onInput={(e) => {
                const dur = getMediaDuration(oneAudio.mediaId);
                const v = Math.max(0, Math.min(num(e), Math.max(0, dur - 0.5)));
                if (Number.isFinite(v)) updateAudioClip(oneAudio.id, { trimStart: v, duration: Math.min(oneAudio.duration, Math.max(0.5, dur - v)) });
              }}
            />
          </label>
          <label>
            Length (s){' '}
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={Number(oneAudio.duration.toFixed(2))}
              onInput={(e) => {
                const max = getMediaDuration(oneAudio.mediaId) - oneAudio.trimStart;
                if (num(e) >= 0.5) updateAudioClip(oneAudio.id, { duration: Math.min(num(e), max) });
              }}
            />
          </label>
          <label>
            Volume{' '}
            <input type="range" min={0} max={1} step={0.05} value={oneAudio.volume} onInput={(e) => updateAudioClip(oneAudio.id, { volume: num(e) })} />
          </label>
          <button onClick={splitAtPlayhead}><Icon name="scissors" /> Split at playhead</button>{' '}
          <button onClick={() => removeClips([oneAudio.id])}>Remove</button>
        </fieldset>
      )}
    </div>
  );
}
