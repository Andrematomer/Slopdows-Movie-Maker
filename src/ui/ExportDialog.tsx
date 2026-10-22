import { useEffect, useRef, useState } from 'preact/hooks';
import { FriendlyError, exportMovie } from '../export/exporter';
import { assets } from '../model/assets';
import { getState } from '../model/store';

type Phase = { kind: 'working'; frame: number; frames: number } | { kind: 'error'; message: string };

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'working', frame: 0, frames: 1 });
  const abort = useRef(new AbortController());

  useEffect(() => {
    const ctl = abort.current;
    const { project, fileName } = getState();
    exportMovie(project, assets, (p) => setPhase({ kind: 'working', ...p }), ctl.signal)
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${fileName === 'Untitled' ? 'My Movie' : fileName}.mp4`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
        onClose();
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return onClose();
        console.error(err);
        setPhase({ kind: 'error', message:
            err instanceof FriendlyError
              ? err.message
              : "Something went wrong while saving. Try again, or try the latest Chrome or Edge." });
      });
    return () => ctl.abort();
  }, []);

  const pct = phase.kind === 'working' ? Math.round((phase.frame / phase.frames) * 100) : 0;

  return (
    <div class="modal-back">
      <div class="window modal">
        <div class="title-bar">
          <div class="title-bar-text">Save Movie</div>
        </div>
        <div class="window-body">
          {phase.kind === 'working' ? (
            <>
              <p>Saving movie… {pct}%</p>
              <div class="progress-indicator">
                <span class="progress-indicator-bar" style={{ width: `${pct}%` }} />
              </div>
              <p class="modal-buttons">
                <button onClick={() => abort.current.abort()}>Cancel</button>
              </p>
            </>
          ) : (
            <>
              <p><b>Could not save the movie.</b></p>
              <p>{phase.message}</p>
              <p class="modal-buttons">
                <button onClick={onClose}>OK</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
