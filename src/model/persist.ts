import type { Project } from './types';

/**
 * Autosave: project JSON + the original media files, in IndexedDB (this browser only).
 * Everything is best-effort. If storage is blocked or full we silently carry on.
 */
const DB = 'slopdows-movie-faker';

export interface SavedProject {
  project: Project;
  fileName: string;
}
export interface SavedMedia {
  blob: Blob;
  name: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('kv');
      req.result.createObjectStore('media');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMedia(id: string, blob: Blob, name: string): Promise<void> {
  try {
    const db = await open();
    await wrap(db.transaction('media', 'readwrite').objectStore('media').put({ blob, name } satisfies SavedMedia, id));
    db.close();
  } catch {
    /* ignore */
  }
}

export async function saveProject(data: SavedProject, keepMedia: Set<string>): Promise<void> {
  try {
    const db = await open();
    const tx = db.transaction(['kv', 'media'], 'readwrite');
    tx.objectStore('kv').put(data, 'project');
    const media = tx.objectStore('media');
    const keys = await wrap(media.getAllKeys());
    for (const k of keys) if (!keepMedia.has(String(k))) media.delete(k);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

export async function loadProject(): Promise<{ saved: SavedProject; media: Map<string, SavedMedia> } | null> {
  try {
    const db = await open();
    const saved = (await wrap(db.transaction('kv').objectStore('kv').get('project'))) as SavedProject | undefined;
    if (!saved || !Array.isArray(saved.project?.clips)) {
      db.close();
      return null;
    }
    const store = db.transaction('media').objectStore('media');
    const media = new Map<string, SavedMedia>();
    for (const key of await wrap(store.getAllKeys())) {
      media.set(String(key), (await wrap(store.get(key))) as SavedMedia);
    }
    db.close();
    return { saved, media };
  } catch {
    return null;
  }
}

export async function clearSaved(): Promise<void> {
  try {
    const db = await open();
    const tx = db.transaction(['kv', 'media'], 'readwrite');
    tx.objectStore('kv').clear();
    tx.objectStore('media').clear();
    db.close();
  } catch {
    /* ignore */
  }
}
