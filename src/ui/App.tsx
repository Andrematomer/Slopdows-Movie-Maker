import { useEffect, useRef, useState } from 'preact/hooks';
import {
  addMedia,
  canRedo,
  canUndo,
  redo,
  removeClips,
  selectAll,
  selectRelative,
  togglePlay,
  trimAtPlayhead,
  undo,
  splitAtPlayhead,
  addTitle,
  newProject,
  setMode2008,
  setState,
  getState,
  useStore,
} from '../model/store';
import { ExportDialog } from './ExportDialog';
import { MenuBar, type Menu } from './MenuBar';
import { PreviewPane } from './PreviewPane';
import { Storyboard } from './Storyboard';
import { TaskPane } from './TaskPane';
import { toggleFullscreen, zoomBy, zoomReset } from './viewControls';

export function App() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [about, setAbout] = useState(false);
  const mode2008 = useStore((s) => s.project.mode2008);
  const playing = useStore((s) => s.playing);
  const selectedId = useStore((s) => s.selectedId);
  const fileName = useStore((s) => s.fileName);
  const notice = useStore((s) => s.notice);
  const loading = useStore((s) => s.loading);
  const loadingMsg = useStore((s) => s.loadingMsg);
  useStore((s) => s.project); // so Undo/Redo menu items refresh

  // keyboard: Space play/pause, Ctrl+Z/Y undo/redo, Ctrl+A select all, arrows, Delete.
  // Skipped while typing in a box (so text editing keeps its normal keys).
  useEffect(() => {
    const typingIn = (el: HTMLElement | null) =>
      !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !['range', 'checkbox', 'button'].includes((el as HTMLInputElement).type)));
    const onKey = (e: KeyboardEvent) => {
      if (getState().loading) return;
      const el = e.target as HTMLElement | null;
      if (typingIn(el)) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (e.key === ' ') {
        e.preventDefault(); // also stops a focused button from "clicking"
        if (!e.repeat) togglePlay();
      } else if (mod && k === 'z' && !e.shiftKey) (e.preventDefault(), undo());
      else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) (e.preventDefault(), redo());
      else if (mod && k === 'a') (e.preventDefault(), selectAll());
      else if (!mod && k === 'i') trimAtPlayhead('start');
      else if (!mod && k === 'o') trimAtPlayhead('end');
      else if (!mod && k === 's') splitAtPlayhead();
      else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !mod && !(el?.tagName === 'INPUT' && (el as HTMLInputElement).type === 'range')) {
        e.preventDefault();
        selectRelative(e.key === 'ArrowLeft' ? -1 : 1, e.shiftKey);
      } else if (e.key === 'Delete') {
        e.preventDefault();
        removeClips(getState().selectedIds);
      }
    };
    // a focused button would otherwise fire its click when Space is released
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && !typingIn(e.target as HTMLElement | null)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const importPictures = () => fileInput.current?.click();

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'New Project', onClick: newProject },
        { label: 'Import Pictures, Video or Music…', onClick: importPictures },
        'sep',
        { label: 'Save Movie File…', onClick: () => setExporting(true) },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo (Ctrl+Z)', onClick: undo, disabled: !canUndo() },
        { label: 'Redo (Ctrl+Y)', onClick: redo, disabled: !canRedo() },
        { label: 'Select All (Ctrl+A)', onClick: selectAll },
        'sep',
                { label: 'Remove Clip', onClick: () => removeClips(getState().selectedIds), disabled: !selectedId },
      ],
    },
    {
      label: 'View',
      items: [
        { label: '2008 YouTube Mode (uglier)', checked: mode2008, onClick: () => setMode2008(!mode2008) },
        'sep',
        { label: 'Zoom In', onClick: () => zoomBy(1) },
        { label: 'Zoom Out', onClick: () => zoomBy(-1) },
        { label: 'Actual Size', onClick: zoomReset },
        'sep',
        { label: 'Full Screen', onClick: toggleFullscreen },
      ],
    },
    {
      label: 'Clip',
      items: [
        { label: 'Add Title or Credits', onClick: addTitle },
        'sep',
        { label: 'Set Start at Playhead (I)', onClick: () => trimAtPlayhead('start'), disabled: !selectedId },
        { label: 'Set End at Playhead (O)', onClick: () => trimAtPlayhead('end'), disabled: !selectedId },
        { label: 'Split at Playhead (S)', onClick: splitAtPlayhead, disabled: !selectedId },
      ],
    },
    {
      label: 'Play',
      items: [
        { label: playing ? 'Pause (Space)' : 'Play Storyboard (Space)', onClick: togglePlay },
        { label: 'Stop', onClick: () => setState({ playing: false, time: 0 }) },
      ],
    },
    {
      label: 'Help',
      items: [{ label: 'About Win Movie Faker', onClick: () => setAbout(true) }],
    },
  ];

  return (
    <div class="desktop">
      <div class="window app-window">
        <div class="title-bar">
          <div class="title-bar-text">{fileName} - Win Movie Faker</div>
          <div class="title-bar-controls">
            <button aria-label="Minimize" />
            <button aria-label="Maximize" onClick={toggleFullscreen} />
            <button aria-label="Close" />
          </div>
        </div>
        <div class="window-body app-body">
          <MenuBar menus={menus} />
          <div class="main">
            <TaskPane
              onImport={importPictures}
              onAddTitle={addTitle}
              onExport={() => setExporting(true)}
            />
            <PreviewPane />
          </div>
          <Storyboard />
          <div class="status-bar">
            <p class="status-bar-field notice">{notice}</p>
            <p class="status-bar-field">Parody. Not affiliated with Microsoft.</p>
          </div>
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*,video/*,audio/*,.mkv,.mov,.m4a,.flac,.opus"
        multiple
        hidden
        onChange={(e) => {
          const input = e.target as HTMLInputElement;
          void addMedia(Array.from(input.files ?? []));
          input.value = '';
        }}
      />

      {loading && (
        <div class="modal-back">
          <div class="window modal">
            <div class="title-bar">
              <div class="title-bar-text">Win Movie Faker</div>
            </div>
            <div class="window-body">
              <p>{loadingMsg}</p>
              <p>Your project is safe in this browser. This only takes a moment.</p>
              <div class="progress-indicator">
                <span class="progress-indicator-bar" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>
      )}
      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
      {about && (
        <div class="modal-back">
          <div class="window modal">
            <div class="title-bar">
              <div class="title-bar-text">About Win Movie Faker</div>
            </div>
            <div class="window-body">
              <p><b>Win Movie Faker</b></p>
              <p>A parody and fan project. Not made by, endorsed by, or connected to Microsoft.</p>
              <p>Everything runs in your browser. Your files never leave your computer.</p>
              <p class="modal-buttons"><button onClick={() => setAbout(false)}>OK</button></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
