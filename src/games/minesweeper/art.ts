// Drawing helpers shared by the server-rendered frame and the runtime.
// The smiley is original pixel art, generated as one SVG whose feature
// groups are switched by CSS (`mine-sweeper[data-face]`), so changing the
// face never touches the DOM beyond one attribute.

/** Lit segments per LED glyph, 7-segment letters a-g. */
export const SEGMENTS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg',
  '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
  '-': 'g',
};

/** Three LED glyphs for a counter value; negatives show a leading minus. */
export function ledText(n: number): string {
  n = Math.trunc(n);
  if (n < 0) return '-' + String(Math.min(99, -n)).padStart(2, '0');
  return String(Math.min(999, n)).padStart(3, '0');
}

type Px = [number, number];

/** Merge pixels into one path of horizontal runs. */
function path(px: Px[]): string {
  const rows = new Map<number, number[]>();
  for (const [x, y] of px) {
    const r = rows.get(y) ?? [];
    r.push(x);
    rows.set(y, r);
  }
  let d = '';
  for (const [y, xs] of [...rows].sort((a, b) => a[0] - b[0])) {
    xs.sort((a, b) => a - b);
    let s = xs[0]!;
    let prev = s;
    for (let k = 1; k <= xs.length; k++) {
      const x = xs[k];
      if (x === prev + 1) { prev = x; continue; }
      d += `M${s} ${y}h${prev - s + 1}v1h${-(prev - s + 1)}z`;
      if (x !== undefined) { s = x; prev = x; }
    }
  }
  return d;
}

function rect(x: number, y: number, w: number, h: number): Px[] {
  const out: Px[] = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push([x + i, y + j]);
  return out;
}

const pts = (...xy: number[]): Px[] => {
  const out: Px[] = [];
  for (let k = 0; k < xy.length; k += 2) out.push([xy[k]!, xy[k + 1]!]);
  return out;
};

function faceSvg(): string {
  const size = 17;
  const c = 8;
  const fill: Px[] = [];
  const ring: Px[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d <= 6.6) fill.push([x, y]);
      else if (d <= 7.9) ring.push([x, y]);
    }
  }
  const eyes = [...rect(5, 5, 2, 2), ...rect(10, 5, 2, 2)];
  const smile = pts(4, 10, 5, 11, 11, 11, 12, 10).concat(rect(6, 12, 5, 1));
  const oh = rect(7, 10, 3, 1).concat(pts(6, 11, 10, 11, 6, 12, 10, 12), rect(7, 13, 3, 1));
  const xEyes = pts(4, 4, 6, 4, 5, 5, 4, 6, 6, 6, 10, 4, 12, 4, 11, 5, 10, 6, 12, 6);
  const frown = rect(6, 11, 5, 1).concat(pts(5, 12, 11, 12, 4, 13, 12, 13));
  const shades = rect(3, 5, 11, 1).concat(rect(4, 6, 4, 2), rect(9, 6, 4, 2), pts(2, 6, 14, 6, 5, 8, 6, 8, 10, 8, 11, 8));
  const g = (cls: string, px: Px[]) => `<path class="${cls}" d="${path(px)}"/>`;
  return (
    `<svg class="ms-face-art" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true" shape-rendering="crispEdges">` +
    g('f-fill', fill) + g('f-ink', ring) +
    g('f-ink f-eyes', eyes) + g('f-ink f-smile', smile) + g('f-ink f-oh', oh) +
    g('f-ink f-x', xEyes) + g('f-ink f-frown', frown) + g('f-ink f-shades', shades) +
    `</svg>`
  );
}

export const FACE_SVG = /* @__PURE__ */ faceSvg();

/** Markup for one LED digit; `seg` lists the lit segments. */
export function ledDigit(ch: string): string {
  return `<span class="led-d" data-seg="${SEGMENTS[ch] ?? ''}"><i class="sa"></i><i class="sb"></i><i class="sc"></i><i class="sd"></i><i class="se"></i><i class="sf"></i><i class="sg"></i></span>`;
}
