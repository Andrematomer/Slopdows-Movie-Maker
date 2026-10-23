import { useState } from 'preact/hooks';
import { getThumbUrl } from '../model/assets';
import { addMedia, moveClip, selectClip, setTransition, useStore } from '../model/store';
import { TRANSITIONS } from '../model/types';
import { Icon, TransitionIcon } from './icons';
import { randomTransition } from '../render/transitions';

export function Storyboard() {
  const clips = useStore((s) => s.project.clips);
  const selectedIds = useStore((s) => s.selectedIds);
  const audioClips = useStore((s) => s.project.audioClips);
  useStore((s) => s.assetRev); // thumbnails appear after decoding
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
        if (files.length) void addMedia(files);
      }}
    >
      {clips.length === 0 && <p class="hint">Drag pictures, videos or music here, or use File → Import…</p>}
      <div class="clips-row">
      {clips.map((clip, i) => {
        const url = clip.kind === 'title' ? undefined : getThumbUrl(clip.mediaId);
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
                <TransitionIcon kind={clip.transitionIn} />
                <small>{TRANSITIONS.find((t) => t.kind === clip.transitionIn)?.label}</small>
              </button>
            )}
            <div
              class={`tile ${selectedIds.includes(clip.id) ? 'selected' : ''}`}
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
              onClick={(e) => selectClip(clip.id, e.shiftKey ? 'range' : e.ctrlKey || e.metaKey ? 'toggle' : 'only')}
              tabIndex={0}
            >
              <div class="thumb">
                {clip.kind === 'title' ? (
                  <div class="thumb-title">{label}</div>
                ) : url ? (
                  <img src={url} alt="" draggable={false} />
                ) : (
                  <Icon name="film" size={32} />
                )}
                {clip.kind === 'video' && <span class="badge"><Icon name="film" size={12} /></span>}
              </div>
              <div class="tile-label">{label}</div>
            </div>
          </div>
        );
      })}
      </div>
      {audioClips.length > 0 && (
        <div class="audio-lane" title="Audio / Music">
          <span class="lane-label"><Icon name="music" /> Audio/Music</span>
          {audioClips.map((a) => (
            <button
              key={a.id}
              class={`audio-bar ${selectedIds.includes(a.id) ? 'selected' : ''}`}
              style={{ width: `${Math.max(40, a.duration * 12)}px`, marginLeft: `${Math.max(0, a.start * 12)}px` }}
              onClick={(e) => selectClip(a.id, e.shiftKey ? 'range' : e.ctrlKey || e.metaKey ? 'toggle' : 'only')}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
