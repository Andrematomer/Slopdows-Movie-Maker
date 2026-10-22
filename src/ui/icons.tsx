/** Original 16x16 pixel icons (drawn here, not copied from anything). */
const PALETTE: Record<string, string> = {
  k: '#1c1c1c', w: '#ffffff', b: '#2a5bd7', l: '#8fb4ff', y: '#f2c230', o: '#d9822b',
  g: '#3a9a3a', r: '#c8382d', s: '#9a9a9a', n: '#000080',
};

const ART: Record<string, string[]> = {
  picture: [
    '................', '.kkkkkkkkkkkkkk.', '.kllllllllllllk.', '.klllllyyllllllk'.slice(0, 16),
    '.kllllyyyylllk..'.slice(0, 16), '.klllllyyllllllk'.slice(0, 16), '.kllllllllllllk..'.slice(0, 16),
    '.klllllgllllllk..'.slice(0, 16), '.kllllgggllllgk..'.slice(0, 16), '.klllgggggllgggk'.slice(0, 16),
    '.kllgggggggggggk', '.kggggggggggggk.', '.kkkkkkkkkkkkkk.', '................', '................', '................',
  ],
  film: [
    '................', '.kkkkkkkkkkkkkk.', '.kwkkkkkkkkkkwk.', '.kkkbbbbbbbbkkk.', '.kwkblllllllbkwk'.slice(0, 16),
    '.kkkblllllllbkk.', '.kwkblllllllbkwk'.slice(0, 16), '.kkkblllllllbkk.', '.kwkblllllllbkwk'.slice(0, 16),
    '.kkkbbbbbbbbkkk.', '.kwkkkkkkkkkkwk.', '.kkkkkkkkkkkkkk.', '................', '................', '................', '................',
  ],
  music: [
    '................', '......kkkkkkk...', '......kyyyyyk...', '......kk....k...', '......k.....k...', '......k.....k...',
    '......k.....k...', '......k...kkk...', '...kkkk..kyyk...', '..kyyyyk.kyyk...', '..kyyyyk..kk....', '...kkkk.........',
    '................', '................', '................', '................',
  ],
  title: [
    '................', '.nnnnnnnnnnnnnn.', '.nnnnnnnnnnnnnn.', '.nnwwwwwwwwwwnn.', '.nnnnnnwwnnnnnn.', '.nnnnnnwwnnnnnn.',
    '.nnnnnnwwnnnnnn.', '.nnnnnnwwnnnnnn.', '.nnnnnnwwnnnnnn.', '.nnnnnnnnnnnnnn.', '.nnnnnnnnnnnnnn.', '................',
    '................', '................', '................', '................',
  ],
  save: [
    '................', '.kkkkkkkkkkkkk..', '.kbbwwwwwwwbbk..', '.kbbwwwwwwwbbk..', '.kbbbbbbbbbbbk..', '.kbbbbbbbbbbbk..',
    '.kbllllllllbbk..', '.kblllllllllbk..', '.kblllllllllbk..', '.kblllllllllbk..', '.kkkkkkkkkkkkk..', '................',
    '................', '................', '................', '................',
  ],
  scissors: [
    '................', '..kk......kk....', '..kk.....kk.....', '...kk...kk......', '....kk.kk.......', '.....kkk........',
    '......kk........', '.....kkkk.......', '....kk..kk......', '...kkk..kkk.....', '...kk....kk.....', '................',
    '................', '................', '................', '................',
  ],
  full: [
    '................', '.kkkk......kkkk.', '.kwwk......kwwk.', '.kwk........kwk.', '.kk..........kk.', '................',
    '................', '................', '................', '.kk..........kk.', '.kwk........kwk.', '.kwwk......kwwk.',
    '.kkkk......kkkk.', '................', '................', '................',
  ],
};

export function Icon({ name, size = 16 }: { name: keyof typeof ART; size?: number }) {
  const rows = ART[name]!;
  const rects: preact.JSX.Element[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const c = PALETTE[row[x] ?? '.'];
      if (c) rects.push(<rect key={`${x},${y}`} x={x} y={y} width="1" height="1" fill={c} />);
    }
  });
  return (
    <svg class="icon" width={size} height={size} viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
      {rects}
    </svg>
  );
}

// ---------- transition icons ----------
// Each transition gets its own little "A becomes B" picture, drawn from a formula (no copied artwork).
import type { TransitionKind } from '../model/types';

const GW = 16;
const GH = 12;
const A = '#4f7fe0';
const B = '#f5c542';
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function starPoly(cx: number, cy: number, outer: number, inner: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}
function inside(poly: [number, number][], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const STAR = starPoly(GW / 2, GH / 2 + 0.3, 6.6, 2.8);

/** true = show picture B at this pixel */
function isB(kind: TransitionKind, x: number, y: number): boolean {
  const px = x + 0.5;
  const py = y + 0.5;
  switch (kind) {
    case 'cut':
      return x >= GW / 2;
    case 'fade':
      return BAYER[(y % 4) * 4 + (x % 4)]! / 16 < (x + 0.5) / GW;
    case 'star':
      return inside(STAR, px, py);
    case 'iris':
      return Math.hypot(px - GW / 2, py - GH / 2) < 4.6;
    case 'checker':
      return (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0;
    case 'pixelate': {
      const bx = Math.floor(x / 4);
      const by = Math.floor(y / 4);
      return (bx * 5 + by * 3 + bx * by) % 3 === 0;
    }
    case 'spin': {
      const ang = Math.atan2(py - GH / 2, px - GW / 2);
      const r = Math.hypot(px - GW / 2, (py - GH / 2) * 1.3);
      return Math.sin(ang * 3 + r * 0.55) > 0;
    }
  }
}

export function TransitionIcon({ kind, scale = 2 }: { kind: TransitionKind; scale?: number }) {
  const rects: preact.JSX.Element[] = [];
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      rects.push(<rect key={`${x},${y}`} x={x} y={y} width="1" height="1" fill={isB(kind, x, y) ? B : A} />);
    }
  }
  return (
    <svg class="icon tr-icon" width={GW * scale} height={GH * scale} viewBox={`0 0 ${GW} ${GH}`} shape-rendering="crispEdges" aria-hidden="true">
      {rects}
    </svg>
  );
}
