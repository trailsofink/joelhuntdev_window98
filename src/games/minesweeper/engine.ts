// Pure Minesweeper rules: no DOM, no timers, no storage. The UI layer
// (game.ts) drives it and tests (engine.test.ts) exercise it directly.

export type Level = 'beginner' | 'intermediate' | 'expert';

export interface Config {
  w: number;
  h: number;
  mines: number;
}

export const LEVELS: Record<Level, Config> = {
  beginner: { w: 9, h: 9, mines: 10 },
  intermediate: { w: 16, h: 16, mines: 40 },
  expert: { w: 30, h: 16, mines: 99 },
};

export type Status = 'ready' | 'playing' | 'won' | 'lost';

export interface Game {
  w: number;
  h: number;
  mines: number;
  /** 1 where a mine is. Empty until the first reveal places them. */
  mine: Uint8Array;
  /** 1 where a cell is revealed. */
  open: Uint8Array;
  /** 1 where a cell carries a flag. */
  flag: Uint8Array;
  /** Count of adjacent mines per cell. */
  adj: Uint8Array;
  status: Status;
  opened: number;
  flags: number;
  /** Index of the mine that ended the game, or -1. */
  exploded: number;
}

export type Rng = () => number;

export function createGame(cfg: Config): Game {
  const n = cfg.w * cfg.h;
  return {
    w: cfg.w,
    h: cfg.h,
    mines: cfg.mines,
    mine: new Uint8Array(n),
    open: new Uint8Array(n),
    flag: new Uint8Array(n),
    adj: new Uint8Array(n),
    status: 'ready',
    opened: 0,
    flags: 0,
    exploded: -1,
  };
}

/** Indices of the up-to-8 cells around i. */
export function neighbours(g: Pick<Game, 'w' | 'h'>, i: number): number[] {
  const x = i % g.w;
  const y = (i - x) / g.w;
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    const ny = y + dy;
    if (ny < 0 || ny >= g.h) continue;
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      if ((dx === 0 && dy === 0) || nx < 0 || nx >= g.w) continue;
      out.push(ny * g.w + nx);
    }
  }
  return out;
}

/** The counter value: mines minus flags. Goes negative, like the original. */
export function minesLeft(g: Game): number {
  return g.mines - g.flags;
}

/**
 * Lay mines after the first reveal so it is always safe: the clicked cell and
 * its neighbours are excluded (only the clicked cell on a board too crowded
 * to spare all nine).
 */
export function placeMines(g: Game, first: number, rng: Rng = Math.random): void {
  const n = g.w * g.h;
  const banned = new Set([first, ...neighbours(g, first)]);
  if (n - banned.size < g.mines) {
    banned.clear();
    banned.add(first);
  }
  const pool: number[] = [];
  for (let i = 0; i < n; i++) if (!banned.has(i)) pool.push(i);
  // Partial Fisher-Yates: the first `mines` slots end up random.
  const count = Math.min(g.mines, pool.length);
  for (let k = 0; k < count; k++) {
    const j = k + Math.floor(rng() * (pool.length - k));
    const t = pool[k]!;
    pool[k] = pool[j]!;
    pool[j] = t;
    g.mine[pool[k]!] = 1;
  }
  for (let i = 0; i < n; i++) {
    let c = 0;
    for (const j of neighbours(g, i)) c += g.mine[j]!;
    g.adj[i] = c;
  }
}

/** Test helper and puzzle hook: start a game with a fixed mine layout. */
export function setMines(g: Game, indices: number[]): void {
  g.mine.fill(0);
  for (const i of indices) g.mine[i] = 1;
  g.mines = indices.length;
  for (let i = 0; i < g.mine.length; i++) {
    let c = 0;
    for (const j of neighbours(g, i)) c += g.mine[j]!;
    g.adj[i] = c;
  }
  g.status = 'playing';
}

function finished(g: Game): boolean {
  return g.status === 'won' || g.status === 'lost';
}

function lose(g: Game, i: number): void {
  g.status = 'lost';
  g.exploded = i;
}

function checkWin(g: Game): void {
  if (g.status === 'playing' && g.opened === g.w * g.h - g.mines) {
    g.status = 'won';
    // The original flags every mine on a win, which zeroes the counter.
    for (let i = 0; i < g.mine.length; i++) {
      if (g.mine[i] && !g.flag[i]) {
        g.flag[i] = 1;
        g.flags++;
      }
    }
  }
}

/** Open one cell; zeros flood outward. Returns false if it hit a mine. */
function open(g: Game, start: number): boolean {
  if (g.open[start] || g.flag[start]) return true;
  if (g.mine[start]) {
    lose(g, start);
    return false;
  }
  const stack = [start];
  g.open[start] = 1;
  g.opened++;
  while (stack.length) {
    const i = stack.pop()!;
    if (g.adj[i] !== 0) continue;
    for (const j of neighbours(g, i)) {
      if (g.open[j] || g.flag[j] || g.mine[j]) continue;
      g.open[j] = 1;
      g.opened++;
      stack.push(j);
    }
  }
  return true;
}

/**
 * Reveal a cell. On a revealed number this chords instead, so a single click
 * on a satisfied number clears its neighbours.
 */
export function reveal(g: Game, i: number, rng: Rng = Math.random): void {
  if (finished(g) || g.flag[i]) return;
  if (g.status === 'ready') {
    placeMines(g, i, rng);
    g.status = 'playing';
  }
  if (g.open[i]) {
    chord(g, i);
    return;
  }
  open(g, i);
  checkWin(g);
}

/** Toggle a flag on a hidden cell. Flags can outnumber mines. */
export function toggleFlag(g: Game, i: number): void {
  if (finished(g) || g.open[i]) return;
  g.flag[i] = g.flag[i] ? 0 : 1;
  g.flags += g.flag[i] ? 1 : -1;
}

/** Number of flags around i. */
export function flagsAround(g: Game, i: number): number {
  let c = 0;
  for (const j of neighbours(g, i)) c += g.flag[j]!;
  return c;
}

/**
 * Chord: on a revealed number whose adjacent flag count matches, reveal every
 * unflagged neighbour. A wrong flag means a mine gets opened and the game ends.
 */
export function chord(g: Game, i: number): boolean {
  if (g.status !== 'playing' || !g.open[i] || g.adj[i] === 0) return false;
  if (flagsAround(g, i) !== g.adj[i]) return false;
  let hit = -1;
  for (const j of neighbours(g, i)) {
    if (g.open[j] || g.flag[j]) continue;
    if (g.mine[j]) {
      if (hit < 0) hit = j;
      continue;
    }
    open(g, j);
  }
  if (hit >= 0) lose(g, hit);
  else checkWin(g);
  return true;
}

/** Cell appearance for rendering, one code per cell. */
export type CellView =
  | 'h' // hidden
  | 'f' // flagged
  | 'm' // mine shown after a loss
  | 'x' // the mine that was hit
  | 'w' // flag on a cell with no mine, shown after a loss
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

export function view(g: Game, i: number): CellView {
  if (g.open[i]) return String(g.adj[i]) as CellView;
  if (g.status === 'lost') {
    if (i === g.exploded) return 'x';
    if (g.flag[i]) return g.mine[i] ? 'f' : 'w';
    if (g.mine[i]) return 'm';
  }
  return g.flag[i] ? 'f' : 'h';
}
