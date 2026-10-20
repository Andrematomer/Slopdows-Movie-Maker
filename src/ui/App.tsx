import { useRef, useState } from 'preact/hooks';
import {
  addImages,
  addTitle,
  newProject,
  removeClip,
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

export function App() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [about, setAbout] = useState(false);
  const mode2008 = useStore((s) => s.project.mode2008);
  const playing = useStore((s) => s.playing);
  const selectedId = useStore((s) => s.selectedId);
  const fileName = useStore((s) => s.fileName);

  const importPictures = () => fileInput.current?.click();

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'New Project', onClick: newProject },
        { label: 'Import Pictures…', onClick: importPictures },
        'sep',
        { label: 'Save Movie File…', onClick: () => setExporting(true) },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Remove Clip', onClick: () => selectedId && removeClip(selectedId), disabled: !selectedId },
      ],
    },
    {
      label: 'View',
      items: [{ label: '2008 YouTube Mode', checked: mode2008, onClick: () => setMode2008(!mode2008) }],
    },
    {
      label: 'Clip',
      items: [{ label: 'Add Title or Credits', onClick: addTitle }],
    },
    {
      label: 'Play',
      items: [
        { label: playing ? 'Pause' : 'Play Storyboard', onClick: () => setState({ playing: !getState().playing }) },
        { label: 'Stop', onClick: () => setState({ playing: false, time: 0 }) },
      ],
    },
    {
      label: 'Help',
      items: [{ label: 'About Slopdows Movie Faker', onClick: () => setAbout(true) }],
    },
  ];

  return (
    <div class="desktop">
      <div class="window app-window">
        <div class="title-bar">
          <div class="title-bar-text">{fileName} - Slopdows Movie Faker</div>
          <div class="title-bar-controls">
            <button aria-label="Minimize" />
            <button aria-label="Maximize" />
            <button aria-label="Close" />
          </div>
        </div>
        <div class="window-body app-body">
          <MenuBar menus={menus} />
          <div class="toolbar">
            <button onClick={importPictures}>🖼 Import</button>
            <button onClick={addTitle}>🅣 Title</button>
            <button onClick={() => setExporting(true)}>💾 Save Movie</button>
          </div>
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
            <p class="status-bar-field">Ready</p>
            <p class="status-bar-field">Work in progress. Not affiliated with Microsoft.</p>
          </div>
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const input = e.target as HTMLInputElement;
          void addImages(Array.from(input.files ?? []));
          input.value = '';
        }}
      />

      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
      {about && (
        <div class="modal-back">
          <div class="window modal">
            <div class="title-bar">
              <div class="title-bar-text">About Slopdows Movie Faker</div>
            </div>
            <div class="window-body">
              <p>Slopdows Movie Faker (work in progress)</p>
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
