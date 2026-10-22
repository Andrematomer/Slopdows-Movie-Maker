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
