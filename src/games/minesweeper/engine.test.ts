// Run with: node --experimental-strip-types src/games/minesweeper/engine.test.ts
// Plain assertions, no test framework.
import assert from 'node:assert/strict';
import {
  LEVELS, chord, createGame, minesLeft, neighbours, reveal, setMines, toggleFlag, view,
} from './engine.ts';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`ok - ${name}`);
}

// Small deterministic PRNG so failures reproduce.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

test('first click is always safe, with its 3x3 clear', () => {
  for (const level of Object.values(LEVELS)) {
    for (let s = 0; s < 300; s++) {
      const g = createGame(level);
      const first = Math.floor(seeded(s * 7 + 1)() * level.w * level.h);
      reveal(g, first, seeded(s));
      assert.notEqual(g.status, 'lost');
      assert.equal(g.mine[first], 0);
      for (const j of neighbours(g, first)) assert.equal(g.mine[j], 0);
      assert.equal(g.mine.reduce((a, b) => a + b, 0), level.mines);
      assert.equal(g.adj[first], 0, 'first cell opens as a zero');
    }
  }
});

test('crowded board still keeps the first cell safe', () => {
  const g = createGame({ w: 3, h: 3, mines: 8 });
  reveal(g, 4, seeded(1));
  assert.equal(g.mine[4], 0);
  assert.equal(g.status, 'won');
});

test('flood fill opens the zero region and its border', () => {
  // 5x5, one mine in the corner (24). Clicking 0 opens everything else.
  const g = createGame({ w: 5, h: 5, mines: 1 });
  setMines(g, [24]);
  reveal(g, 0);
  assert.equal(g.opened, 24);
  assert.equal(g.status, 'won');
  assert.equal(g.flag[24], 1, 'win flags remaining mines');
  assert.equal(minesLeft(g), 0);
});

test('flood fill stops at numbers and walls of mines', () => {
  // Column of mines at x=2 on a 5x3 board splits it.
  const g = createGame({ w: 5, h: 3, mines: 3 });
  setMines(g, [2, 7, 12]);
  reveal(g, 0);
  // Left side: x=0 zeros, x=1 numbers -> 6 cells
  assert.equal(g.opened, 6);
  for (const i of [3, 4, 8, 9, 13, 14]) assert.equal(g.open[i], 0);
  assert.equal(g.status, 'playing');
});

test('flags block reveal and the counter goes negative', () => {
  const g = createGame({ w: 4, h: 1, mines: 1 });
  setMines(g, [3]);
  toggleFlag(g, 0);
  toggleFlag(g, 1);
  assert.equal(minesLeft(g), -1);
  reveal(g, 0);
  assert.equal(g.open[0], 0);
  toggleFlag(g, 1);
  assert.equal(minesLeft(g), 0);
});

test('chord reveals neighbours only when flags match', () => {
  // 3x3, mine at 0. Cell 4 shows 1.
  const g = createGame({ w: 3, h: 3, mines: 1 });
  setMines(g, [0]);
  reveal(g, 4);
  assert.equal(view(g, 4), '1');
  assert.equal(chord(g, 4), false, 'no flags yet');
  assert.equal(g.opened, 1);
  toggleFlag(g, 0);
  assert.equal(chord(g, 4), true);
  assert.equal(g.status, 'won');
});

test('clicking a satisfied number chords', () => {
  const g = createGame({ w: 3, h: 3, mines: 1 });
  setMines(g, [0]);
  reveal(g, 4);
  toggleFlag(g, 0);
  reveal(g, 4);
  assert.equal(g.status, 'won');
});

test('chord with a wrong flag loses and marks the wrong flag', () => {
  const g = createGame({ w: 3, h: 3, mines: 1 });
  setMines(g, [0]);
  reveal(g, 4);
  toggleFlag(g, 8); // wrong
  chord(g, 4);
  assert.equal(g.status, 'lost');
  assert.equal(g.exploded, 0);
  assert.equal(view(g, 0), 'x');
  assert.equal(view(g, 8), 'w');
});

test('revealing a mine loses and shows all mines', () => {
  const g = createGame({ w: 3, h: 3, mines: 2 });
  setMines(g, [0, 8]);
  reveal(g, 0);
  assert.equal(g.status, 'lost');
  assert.equal(view(g, 0), 'x');
  assert.equal(view(g, 8), 'm');
  reveal(g, 4);
  assert.equal(g.open[4], 0, 'no moves after a loss');
});

test('win needs every safe cell open, flags optional', () => {
  const g = createGame({ w: 2, h: 2, mines: 1 });
  setMines(g, [3]);
  reveal(g, 0);
  reveal(g, 1);
  assert.equal(g.status, 'playing');
  reveal(g, 2);
  assert.equal(g.status, 'won');
});

console.log(`\n${passed} tests passed`);
