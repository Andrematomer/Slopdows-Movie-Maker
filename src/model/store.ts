import { useEffect, useState } from 'preact/hooks';
import { addImageAsset, dropAsset } from './assets';
import { layout } from './layout';
import { defaultProject, newId, type Clip, type Project, type TransitionKind } from './types';

export interface AppState {
  project: Project;
  selectedId: string | null;
  /** playhead, seconds */
  time: number;
  playing: boolean;
  /** bumps when an image finishes decoding so the preview repaints */
  assetRev: number;
  fileName: string;
}

let state: AppState = {
  project: defaultProject(),
  selectedId: null,
  time: 1.2, // past the title's fade-in so the first preview isn't a blank blue screen
  playing: false,
  assetRev: 0,
  fileName: 'Untitled',
};
state.selectedId = state.project.clips[0]!.id;

const listeners = new Set<() => void>();

export const getState = (): AppState => state;

export function setState(patch: Partial<AppState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useStore<T>(selector: (s: AppState) => T): T {
  const [value, setValue] = useState(() => selector(state));
  useEffect(() => {
    const check = () => setValue(() => selector(state));
    listeners.add(check);
    check();
    return () => {
      listeners.delete(check);
    };
  }, []);
  return value;
}

function setProject(project: Project): void {
  const { total } = layout(project);
  setState({ project, time: Math.min(state.time, total) });
}

export function totalDuration(): number {
  return layout(state.project).total;
}

// ---------- actions ----------

export function newProject(): void {
  state.project.clips.forEach((c) => dropAsset(c.id));
  const project = defaultProject();
  setState({
    project,
    selectedId: project.clips[0]!.id,
    time: 1.2,
    playing: false,
    fileName: 'Untitled',
  });
}

export function addTitle(): void {
  const clip: Clip = {
    id: newId(),
    kind: 'title',
    title: 'The End',
    subtitle: 'Thanks for watching!',
    duration: 4,
    transitionIn: 'star',
  };
  setProject({ ...state.project, clips: [...state.project.clips, clip] });
  setState({ selectedId: clip.id });
}

export async function addImages(files: File[]): Promise<void> {
  const added: Clip[] = [];
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const id = newId();
    try {
      await addImageAsset(id, file);
    } catch {
      continue; // undecodable file: skip it
    }
    added.push({ id, kind: 'image', name: file.name, duration: 5, transitionIn: 'star' });
  }
  if (added.length === 0) return;
  setProject({ ...state.project, clips: [...state.project.clips, ...added] });
  setState({ selectedId: added[added.length - 1]!.id, assetRev: state.assetRev + 1 });
}

export function removeClip(id: string): void {
  const clips = state.project.clips.filter((c) => c.id !== id);
  dropAsset(id);
  const idx = state.project.clips.findIndex((c) => c.id === id);
  const next = clips[Math.min(idx, clips.length - 1)]?.id ?? null;
  setProject({ ...state.project, clips });
  setState({ selectedId: state.selectedId === id ? next : state.selectedId, assetRev: state.assetRev + 1 });
}

export function moveClip(from: number, to: number): void {
  const clips = [...state.project.clips];
  if (from === to || from < 0 || to < 0 || from >= clips.length || to >= clips.length) return;
  const [item] = clips.splice(from, 1);
  clips.splice(to, 0, item!);
  setProject({ ...state.project, clips });
}

export function updateClip(id: string, patch: Partial<Clip>): void {
  const clips = state.project.clips.map((c) => (c.id === id ? ({ ...c, ...patch } as Clip) : c));
  setProject({ ...state.project, clips });
}

export function setTransition(id: string, kind: TransitionKind): void {
  updateClip(id, { transitionIn: kind });
}

export function patchProject(patch: Partial<Project>): void {
  setProject({ ...state.project, ...patch });
}

export function patchWatermarks(patch: Partial<Project['watermarks']>): void {
  setProject({ ...state.project, watermarks: { ...state.project.watermarks, ...patch } });
}

/** One switch for the whole 2008 look: forces 4:3 and turns on the mush. */
export function setMode2008(on: boolean): void {
  const p = state.project;
  setProject({
    ...p,
    mode2008: on,
    width: on ? 640 : p.width,
    height: on ? 480 : p.height,
  });
}

export function setResolution(width: number, height: number): void {
  setProject({ ...state.project, width, height });
}
