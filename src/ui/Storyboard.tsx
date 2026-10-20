import { useState } from 'preact/hooks';
import { getImageUrl } from '../model/assets';
import { addImages, moveClip, removeClip, setState, setTransition, useStore } from '../model/store';
import { TRANSITIONS } from '../model/types';
import { randomTransition } from '../render/transitions';

export function Storyboard() {
  const clips = useStore((s) => s.project.clips);
  const selectedId = useStore((s) => s.selectedId);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [overFile, setOverFile] = useState(false);

  return (
    <div
      class={`storyboard ${overFile ? 'drop-hot' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (e.dataTransfer?.types.includes('Files')) setOverFile(true);
      }}
      onDragLeave={() => setOverFile(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOverFile(false);
        const files = Array.from(e.dataTransfer?.files ?? []);
        if (files.length) void addImages(files);
      }}
    >
      {clips.length === 0 && <p class="hint">Drag pictures here, or use File → Import Pictures…</p>}
      {clips.map((clip, i) => {
        const url = clip.kind === 'image' ? getImageUrl(clip.id) : undefined;
        const label = clip.kind === 'title' ? clip.title.split('\n')[0] : clip.name;
        return (
          <div class="slot" key={clip.id}>
            {i > 0 && (
              <button
                class="trans"
                title="Click to change transition (right-click: random)"
                onClick={() => {
                  const idx = TRANSITIONS.findIndex((t) => t.kind === clip.transitionIn);
                  setTransition(clip.id, TRANSITIONS[(idx + 1) % TRANSITIONS.length]!.kind);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setTransition(clip.id, randomTransition());
                }}
              >
                {clip.transitionIn === 'cut' ? '▏' : '★'}
                <small>{TRANSITIONS.find((t) => t.kind === clip.transitionIn)?.label}</small>
              </button>
            )}
            <div
              class={`tile ${selectedId === clip.id ? 'selected' : ''}`}
              draggable
              onDragStart={(e) => {
                setDragFrom(i);
                e.dataTransfer?.setData('text/plain', String(i));
              }}
              onDragEnd={() => setDragFrom(null)}
              onDrop={(e) => {
                if (dragFrom !== null) {
                  e.preventDefault();
                  e.stopPropagation();
                  moveClip(dragFrom, i);
                  setDragFrom(null);
                }
              }}
              onClick={() => setState({ selectedId: clip.id })}
              onKeyDown={(e) => {
                if (e.key === 'Delete') removeClip(clip.id);
              }}
              tabIndex={0}
            >
              <div class="thumb">
                {clip.kind === 'title' ? (
                  <div class="thumb-title">{label}</div>
                ) : url ? (
                  <img src={url} alt="" draggable={false} />
                ) : null}
              </div>
              <div class="tile-label">{label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
