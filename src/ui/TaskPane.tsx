import { getMediaDuration } from '../model/assets';
import {
  patchWatermarks,
  removeClip,
  setMode2008,
  setResolution,
  splitAtPlayhead,
  updateAudioClip,
  updateClip,
  useStore,
} from '../model/store';
import { TRANSITIONS, type Clip } from '../model/types';
import { Icon } from './icons';

const num = (e: Event) => Number((e.target as HTMLInputElement).value);

interface Props {
  onImport: () => void;
  onAddTitle: () => void;
  onExport: () => void;
}

export function TaskPane({ onImport, onAddTitle, onExport }: Props) {
  const project = useStore((s) => s.project);
  const selectedId = useStore((s) => s.selectedId);
  const selected: Clip | undefined = project.clips.find((c) => c.id === selectedId);
  const selectedAudio = project.audioClips.find((a) => a.id === selectedId);
  const wm = project.watermarks;

  return (
    <div class="taskpane">
      <h3>Movie Tasks</h3>

      <details open>
        <summary>1. Import</summary>
        <a href="#" onClick={(e) => (e.preventDefault(), onImport())}><Icon name="picture" /> Import pictures, video or music</a>
        <a href="#" onClick={(e) => (e.preventDefault(), onAddTitle())}><Icon name="title" /> Add title or credits</a>
      </details>

      <details open>
        <summary>2. Edit Movie</summary>
        <div class="check-row">
          <input id="cb-hypercam" type="checkbox" checked={wm.hypercam} onChange={(e) => patchWatermarks({ hypercam: (e.target as HTMLInputElement).checked })} />
          <label for="cb-hypercam">Screen recorder watermark</label>
        </div>
        <input
          type="text"
          class="wide"
          value={wm.hypercamText}
          onInput={(e) => patchWatermarks({ hypercamText: (e.target as HTMLInputElement).value })}
        />
        <div class="check-row">
          <input id="cb-bandi" type="checkbox" checked={wm.bandi} onChange={(e) => patchWatermarks({ bandi: (e.target as HTMLInputElement).checked })} />
          <label for="cb-bandi">Website watermark (top center)</label>
        </div>
        <input
          type="text"
          class="wide"
          value={wm.bandiText}
          onInput={(e) => patchWatermarks({ bandiText: (e.target as HTMLInputElement).value })}
        />
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
            <option value="320x240">320 × 240</option>
            <option value="640x480">640 × 480</option>
            <option value="800x600">800 × 600</option>
          </select>
        </label>
      </details>

      <details open>
        <summary>3. Finish Movie</summary>
        <a href="#" onClick={(e) => (e.preventDefault(), onExport())}><Icon name="save" /> Save to my computer</a>
      </details>

      {selected && (
        <fieldset class="props">
          <legend>Selected clip</legend>
          {selected.kind === 'title' && (
            <>
              <label>Title</label>
              <textarea
                rows={2}
                value={selected.title}
                onInput={(e) => updateClip(selected.id, { title: (e.target as HTMLTextAreaElement).value })}
              />
              <label>Subtitle / credits</label>
              <textarea
                rows={2}
                value={selected.subtitle}
                onInput={(e) => updateClip(selected.id, { subtitle: (e.target as HTMLTextAreaElement).value })}
              />
            </>
          )}
          {selected.kind === 'video' && (
            <>
              <label>
                Trim start (s){' '}
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={Number(selected.trimStart.toFixed(2))}
                  onInput={(e) => {
                    const total = getMediaDuration(selected.mediaId);
                    const v = Math.max(0, Math.min(num(e), Math.max(0, total - 0.5)));
                    if (Number.isFinite(v)) updateClip(selected.id, { trimStart: v, duration: Math.min(selected.duration, Math.max(0.5, total - v)) });
                  }}
                />
              </label>
              <label>
                Volume{' '}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selected.volume}
                  onInput={(e) => updateClip(selected.id, { volume: num(e) })}
                />
              </label>
            </>
          )}
          <label>
            Duration (s){' '}
            <input
              type="number"
              min={selected.kind === 'video' ? 0.5 : 1}
              max={selected.kind === 'video' ? Math.max(0.5, getMediaDuration(selected.mediaId) - selected.trimStart) : 60}
              step={0.5}
              value={Number(selected.duration.toFixed(2))}
              onInput={(e) => {
                const v = num(e);
                const max = selected.kind === 'video' ? getMediaDuration(selected.mediaId) - selected.trimStart : 3600;
                if (v >= (selected.kind === 'video' ? 0.5 : 1)) updateClip(selected.id, { duration: Math.min(v, max) });
              }}
            />
          </label>
          <label>
            Transition in{' '}
            <select
              value={selected.transitionIn}
              onChange={(e) => updateClip(selected.id, { transitionIn: (e.target as HTMLSelectElement).value as Clip['transitionIn'] })}
            >
              {TRANSITIONS.map((t) => (
                <option value={t.kind} key={t.kind}>{t.label}</option>
              ))}
            </select>
          </label>
          {selected.kind !== 'title' && (
            <button onClick={splitAtPlayhead} title="Cut at the playhead">
              <Icon name="scissors" /> Split at playhead
            </button>
          )}{' '}
          <button onClick={() => removeClip(selected.id)}>Remove clip</button>
        </fieldset>
      )}

      {selectedAudio && (
        <fieldset class="props">
          <legend>Selected audio</legend>
          <label>
            Starts at (s){' '}
            <input type="number" min={0} step={0.5} value={Number(selectedAudio.start.toFixed(2))} onInput={(e) => num(e) >= 0 && updateAudioClip(selectedAudio.id, { start: num(e) })} />
          </label>
          <label>
            Trim start (s){' '}
            <input
              type="number"
              min={0}
              step={0.5}
              value={Number(selectedAudio.trimStart.toFixed(2))}
              onInput={(e) => {
                const total = getMediaDuration(selectedAudio.mediaId);
                const v = Math.max(0, Math.min(num(e), Math.max(0, total - 0.5)));
                if (Number.isFinite(v)) updateAudioClip(selectedAudio.id, { trimStart: v, duration: Math.min(selectedAudio.duration, Math.max(0.5, total - v)) });
              }}
            />
          </label>
          <label>
            Length (s){' '}
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={Number(selectedAudio.duration.toFixed(2))}
              onInput={(e) => {
                const max = getMediaDuration(selectedAudio.mediaId) - selectedAudio.trimStart;
                if (num(e) >= 0.5) updateAudioClip(selectedAudio.id, { duration: Math.min(num(e), max) });
              }}
            />
          </label>
          <label>
            Volume{' '}
            <input type="range" min={0} max={1} step={0.05} value={selectedAudio.volume} onInput={(e) => updateAudioClip(selectedAudio.id, { volume: num(e) })} />
          </label>
          <button onClick={splitAtPlayhead}><Icon name="scissors" /> Split at playhead</button>{' '}
          <button onClick={() => removeClip(selectedAudio.id)}>Remove</button>
        </fieldset>
      )}
    </div>
  );
}
