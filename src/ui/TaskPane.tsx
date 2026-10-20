import { patchWatermarks, removeClip, setMode2008, setResolution, updateClip, useStore } from '../model/store';
import { TRANSITIONS, type Clip } from '../model/types';

interface Props {
  onImport: () => void;
  onAddTitle: () => void;
  onExport: () => void;
}

export function TaskPane({ onImport, onAddTitle, onExport }: Props) {
  const project = useStore((s) => s.project);
  const selectedId = useStore((s) => s.selectedId);
  const selected: Clip | undefined = project.clips.find((c) => c.id === selectedId);
  const wm = project.watermarks;

  return (
    <div class="taskpane">
      <h3>Movie Tasks</h3>

      <details open>
        <summary>1. Import</summary>
        <a href="#" onClick={(e) => (e.preventDefault(), onImport())}>Import pictures</a>
        <a href="#" onClick={(e) => (e.preventDefault(), onAddTitle())}>Add title or credits</a>
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
          <label for="cb-2008">2008 YouTube mode</label>
        </div>
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
        <a href="#" onClick={(e) => (e.preventDefault(), onExport())}>Save to my computer</a>
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
          <label>
            Duration (s){' '}
            <input
              type="number"
              min={1}
              max={60}
              step={0.5}
              value={selected.duration}
              onInput={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                if (v >= 1) updateClip(selected.id, { duration: v });
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
          <button onClick={() => removeClip(selected.id)}>Remove clip</button>
        </fieldset>
      )}
    </div>
  );
}
