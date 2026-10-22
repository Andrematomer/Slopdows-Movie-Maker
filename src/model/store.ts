import { useEffect, useState } from 'preact/hooks';
import {
  UnsupportedMediaError,
  addAudioAsset,
  addImageAsset,
  addVideoAsset,
  dropAllMedia,
  dropMedia,
  getMediaDuration,
  hasMedia,
  usedMediaIds,
} from './assets';
import { layout } from './layout';
import { clearSaved, loadProject, saveMedia, saveProject } from './persist';
import { defaultProject, newId, type AudioClip, type Clip, type Project, type TransitionKind } from './types';

export interface AppState {
  project: Project;
  selectedId: string | null;
  /** playhead, seconds */
  time: number;
  playing: boolean;
  /** bumps when an image finishes decoding so the preview repaints */
  assetRev: number;
  fileName: string;
  /** one-line message for the status bar */
  notice: string;
}

let state: AppState = {
  project: defaultProject(),
  selectedId: null,
  time: 1.2, // past the title's fade-in so the first preview isn't a blank blue screen
  playing: false,
  assetRev: 0,
  fileName: 'Untitled',
  notice: 'Ready',
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
  dropAllMedia();
  void clearSaved();
  const project = defaultProject();
  setState({
    project,
    selectedId: project.clips[0]!.id,
    time: 1.2,
    playing: false,
    fileName: 'Untitled',
    notice: 'Ready',
    assetRev: state.assetRev + 1,
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

type Kind = 'image' | 'video' | 'audio';

function kindOf(file: File): Kind | null {
  const t = file.type;
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'm4v', 'mov', 'webm', 'mkv', 'ogv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus'].includes(ext)) return 'audio';
  return null;
}

const NO_CONVERTER =
  'There is no built-in converter, so only formats this browser can decode work (try MP4/H.264, WebM or MOV).';

/** Imports pictures, videos and music. Anything the browser can't decode is skipped with a notice. */
export async function addMedia(files: File[]): Promise<void> {
  const clips: Clip[] = [];
  const audio: AudioClip[] = [];
  const problems: string[] = [];
  for (const file of files) {
    const kind = kindOf(file);
    if (!kind) {
      problems.push(`${file.name}: not a picture, video or audio file`);
      continue;
    }
    const id = newId();
    setState({ notice: `Importing ${file.name}…` });
    try {
      if (kind === 'image') {
        await addImageAsset(id, file);
        clips.push({ id, kind: 'image', mediaId: id, name: file.name, duration: 5, transitionIn: 'star' });
      } else if (kind === 'video') {
        const { duration } = await addVideoAsset(id, file);
        clips.push({
          id,
          kind: 'video',
          mediaId: id,
          name: file.name,
          duration: Math.max(0.5, duration),
          trimStart: 0,
          volume: 1,
          transitionIn: 'star',
        });
      } else {
        const { duration } = await addAudioAsset(id, file);
        audio.push({ id, name: file.name, mediaId: id, start: 0, trimStart: 0, duration, volume: 1 });
      }
      void saveMedia(id, file, file.name);
    } catch (e) {
      const why = e instanceof UnsupportedMediaError ? `${e.message}. ${NO_CONVERTER}` : 'could not be read';
      problems.push(`${file.name}: ${why}`);
    }
  }
  if (clips.length || audio.length) {
    setProject({
      ...state.project,
      clips: [...state.project.clips, ...clips],
      audioClips: [...state.project.audioClips, ...audio],
    });
    const last = clips[clips.length - 1] ?? audio[audio.length - 1];
    setState({ selectedId: last!.id, assetRev: state.assetRev + 1 });
  }
  setState({ notice: problems.length ? `Skipped: ${problems.join(' | ')}` : 'Ready' });
}

function releaseUnusedMedia(project: Project): void {
  const used = usedMediaIds(project);
  const all = new Set<string>();
  state.project.clips.forEach((c) => c.kind !== 'title' && all.add(c.mediaId));
  state.project.audioClips.forEach((a) => all.add(a.mediaId));
  all.forEach((id) => !used.has(id) && dropMedia(id));
}

export function removeClip(id: string): void {
  const clips = state.project.clips.filter((c) => c.id !== id);
  const audioClips = state.project.audioClips.filter((a) => a.id !== id);
  const idx = state.project.clips.findIndex((c) => c.id === id);
  const next = clips[Math.min(idx, clips.length - 1)]?.id ?? null;
  const project = { ...state.project, clips, audioClips };
  releaseUnusedMedia(project);
  setProject(project);
  setState({ selectedId: state.selectedId === id ? next : state.selectedId, assetRev: state.assetRev + 1 });
}

/** Cuts the selected clip in two at the playhead. */
export function splitAtPlayhead(): void {
  const id = state.selectedId;
  const t = state.time;
  const MIN = 0.3;
  const audio = state.project.audioClips.find((a) => a.id === id);
  if (audio) {
    const local = t - audio.start;
    if (local < MIN || local > audio.duration - MIN) return setState({ notice: 'Move the playhead inside the selected clip to split it.' });
    const b: AudioClip = { ...audio, id: newId(), start: audio.start + local, trimStart: audio.trimStart + local, duration: audio.duration - local };
    const list = state.project.audioClips.flatMap((a) => (a.id === audio.id ? [{ ...a, duration: local }, b] : [a]));
    setProject({ ...state.project, audioClips: list });
    return setState({ selectedId: b.id });
  }
  const seg = layout(state.project).segments.find((s) => s.clip.id === id);
  if (!seg || seg.clip.kind === 'title') return setState({ notice: 'Select a picture, video or music clip to split.' });
  const local = t - seg.start;
  if (local < MIN || local > seg.clip.duration - MIN) return setState({ notice: 'Move the playhead inside the selected clip to split it.' });
  const a = seg.clip;
  const b: Clip = {
    ...a,
    id: newId(),
    transitionIn: 'cut',
    duration: a.duration - local,
    ...(a.kind === 'video' ? { trimStart: a.trimStart + local } : {}),
  } as Clip;
  const clips = state.project.clips.flatMap((c) => (c.id === a.id ? [{ ...c, duration: local } as Clip, b] : [c]));
  setProject({ ...state.project, clips });
  setState({ selectedId: b.id, assetRev: state.assetRev + 1 });
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

export function updateAudioClip(id: string, patch: Partial<AudioClip>): void {
  setProject({ ...state.project, audioClips: state.project.audioClips.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
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

// ---------- autosave / restore ----------

let autosaveOn = false;

/** Loads the last session from IndexedDB, then starts saving changes. */
export async function restoreAndAutosave(): Promise<void> {
  const loaded = await loadProject();
  if (loaded) {
    const { saved, media } = loaded;
    const project: Project = { ...defaultProject(), ...saved.project, audioClips: saved.project.audioClips ?? [] };
    const clips: Clip[] = [];
    for (const c of project.clips) {
      if (c.kind === 'title') {
        clips.push(c);
        continue;
      }
      const m = media.get(c.mediaId);
      try {
        if (!m) throw new Error('missing');
        if (!hasMedia(c.mediaId)) {
          if (c.kind === 'image') await addImageAsset(c.mediaId, m.blob);
          else await addVideoAsset(c.mediaId, m.blob);
        }
        clips.push(c);
      } catch {
        /* media gone or undecodable: drop the clip */
      }
    }
    const audioClips: AudioClip[] = [];
    for (const a of project.audioClips) {
      const m = media.get(a.mediaId);
      try {
        if (!m) throw new Error('missing');
        if (!hasMedia(a.mediaId)) await addAudioAsset(a.mediaId, m.blob);
        audioClips.push(a);
      } catch {
        /* skip */
      }
    }
    if (clips.length === 0) clips.push(...defaultProject().clips);
    const restored = { ...project, clips, audioClips };
    setState({
      project: restored,
      fileName: saved.fileName || 'Untitled',
      selectedId: clips[0]!.id,
      time: Math.min(1.2, layout(restored).total),
      assetRev: state.assetRev + 1,
      notice: clips.length < project.clips.length ? 'Restored last session (some media could not be reloaded)' : 'Restored last session',
    });
  }
  if (autosaveOn) return;
  autosaveOn = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last = state.project;
  let lastName = state.fileName;
  listeners.add(() => {
    if (state.project === last && state.fileName === lastName) return;
    last = state.project;
    lastName = state.fileName;
    clearTimeout(timer);
    timer = setTimeout(() => {
      void saveProject({ project: state.project, fileName: state.fileName }, usedMediaIds(state.project));
    }, 700);
  });
}

export { getMediaDuration };
