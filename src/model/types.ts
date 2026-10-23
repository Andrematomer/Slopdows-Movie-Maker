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

export type PictureFit = 'fit' | 'fill' | 'stretch';

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

/** Options shared by pictures and videos. */
interface PictureOptions {
  /** how the picture meets the 4:3 screen (default 'fit') */
  fit?: PictureFit;
  /** "Old camera" look: 24 fps, grain, harsh contrast and colour */
  oldCamera?: boolean;
  /** parody screen-recorder watermark (top left) and website watermark (top centre), per clip */
  wmHyper?: boolean;
  wmSite?: boolean;
  wmHyperText?: string;
  wmSiteText?: string;
}

export const DEFAULT_HYPER_TEXT = 'Unregistered HyperClam 2';
export const DEFAULT_SITE_TEXT = 'www.BandiCRAM.com';

export interface ImageClip extends BaseClip, PictureOptions {
  kind: 'image';
  name: string;
  /** key into the media store (same as the clip id for pictures) */
  mediaId: string;
}

export interface VideoClip extends BaseClip, PictureOptions {
  kind: 'video';
  name: string;
  mediaId: string;
  /** where in the source file this clip starts, seconds */
  trimStart: number;
  /** 0..1, applied to the clip's own sound */
  volume: number;
}

export type Clip = TitleClip | ImageClip | VideoClip;

/** Background music / narration lane. Placed anywhere on the timeline. */
export interface AudioClip {
  id: string;
  name: string;
  mediaId: string;
  /** timeline position, seconds */
  start: number;
  /** where in the source file this clip starts, seconds */
  trimStart: number;
  duration: number;
  volume: number;
}

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
  audioClips: AudioClip[];
  /** old projects (before watermarks became per clip); only read when migrating */
  watermarks?: Watermarks;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function defaultProject(): Project {
  return {
    width: 640,
    height: 480,
    fps: 30,
    mode2008: true,
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
    audioClips: [],
  };
}
