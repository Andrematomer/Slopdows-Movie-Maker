export type TransitionKind =
  | 'cut'
  | 'fade'
  | 'star'
  | 'iris'
  | 'checker'
  | 'pixelate'
  | 'spin';

export const TRANSITIONS: { kind: TransitionKind; label: string }[] = [
  { kind: 'cut', label: 'Cut (none)' },
  { kind: 'fade', label: 'Fade' },
  { kind: 'star', label: 'Star Wipe' },
  { kind: 'iris', label: 'Iris' },
  { kind: 'checker', label: 'Checkerboard' },
  { kind: 'pixelate', label: 'Pixelate' },
  { kind: 'spin', label: 'Spin In' },
];

interface BaseClip {
  id: string;
  /** seconds */
  duration: number;
  /** transition between the previous clip and this one (ignored for the first clip) */
  transitionIn: TransitionKind;
}

export interface TitleClip extends BaseClip {
  kind: 'title';
  title: string;
  subtitle: string;
}

export interface ImageClip extends BaseClip {
  kind: 'image';
  name: string;
}

export type Clip = TitleClip | ImageClip;

export interface Watermarks {
  hypercam: boolean;
  hypercamText: string;
  bandi: boolean;
  bandiText: string;
}

export interface Project {
  width: number;
  height: number;
  fps: number;
  /** "2008 YouTube Mode": blurry, low bitrate */
  mode2008: boolean;
  clips: Clip[];
  watermarks: Watermarks;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function defaultProject(): Project {
  return {
    width: 640,
    height: 480,
    fps: 30,
    mode2008: false,
    clips: [
      {
        id: newId(),
        kind: 'title',
        title: 'My Movie',
        subtitle: 'Directed by Me',
        duration: 4,
        transitionIn: 'cut',
      },
    ],
    watermarks: {
      hypercam: false,
      hypercamText: 'Unregistered HyperClam 2',
      bandi: false,
      bandiText: 'www.BandiCRAM.com',
    },
  };
}
