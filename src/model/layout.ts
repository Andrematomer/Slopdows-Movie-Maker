import type { Clip, Project } from './types';

/** Transitions are slow and cheesy on purpose. */
export const TRANSITION_SECONDS = 1.5;

export interface Segment {
  clip: Clip;
  index: number;
  start: number;
  end: number;
  /** length of the transition from the previous clip into this one (0 = cut) */
  overlap: number;
}

export function layout(project: Project): { segments: Segment[]; total: number } {
  const segments: Segment[] = [];
  let prevEnd = 0;
  project.clips.forEach((clip, index) => {
    let overlap = 0;
    if (index > 0 && clip.transitionIn !== 'cut') {
      const prev = project.clips[index - 1]!;
      // 0.45 keeps the in- and out-transitions of one clip from overlapping each other
      overlap = Math.min(TRANSITION_SECONDS, prev.duration * 0.45, clip.duration * 0.45);
    }
    const start = index === 0 ? 0 : prevEnd - overlap;
    const end = start + clip.duration;
    segments.push({ clip, index, start, end, overlap });
    prevEnd = end;
  });
  return { segments, total: prevEnd };
}
