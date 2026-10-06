// Run: node --experimental-strip-types src/games/solitaire/engine.test.mjs
import assert from 'node:assert/strict';
import { Klondike, deal, rankOf, suitOf } from './engine.ts';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok', name); };
const id = (suit, rank) => suit * 13 + rank - 1;
const up = (i) => ({ id: i, up: true });
const down = (i) => ({ id: i, up: false });
const empty = () => ({ stock: [], waste: [], f: [[], [], [], []], t: [[], [], [], [], [], [], []], moves: 0 });

test('deal: 28 tableau, 24 stock, no duplicates, one face-up per column', () => {
  for (let k = 0; k < 50; k++) {
    const s = deal();
    const tab = s.t.flat();
    assert.equal(tab.length, 28);
    assert.equal(s.stock.length, 24);
    s.t.forEach((col, i) => {
      assert.equal(col.length, i + 1);
      col.forEach((c, j) => assert.equal(c.up, j === i));
    });
    assert.ok(s.stock.every((c) => !c.up));
    const ids = new Set([...tab, ...s.stock].map((c) => c.id));
    assert.equal(ids.size, 52);
    assert.ok([...ids].every((x) => x >= 0 && x < 52));
  }
});

test('tableau: alternate colors, descending; only kings to empty', () => {
  const s = empty();
  s.t[0] = [up(id(0, 8))]; // 8 spades
  s.t[1] = [up(id(1, 7))]; // 7 hearts
  s.t[2] = [up(id(3, 7))]; // 7 clubs
  s.t[3] = [down(id(2, 2)), up(id(0, 13))]; // king spades over a face-down card
  const g = new Klondike(1, s);
  assert.ok(g.canMove('t1', 0, 't0'));
  assert.ok(!g.canMove('t2', 0, 't0'), 'same color');
  assert.ok(!g.canMove('t0', 0, 't1'), 'ascending');
  assert.ok(!g.canMove('t1', 0, 't4'), 'non-king to empty');
  assert.ok(g.canMove('t3', 1, 't4'), 'king to empty');
  assert.ok(!g.canMove('t3', 0, 't4'), 'face-down card');
  const r = g.move('t3', 1, 't4');
  assert.equal(r.flipped, id(2, 2), 'exposed card turns up');
  assert.ok(g.s.t[3][0].up);
  assert.equal(g.move('t2', 0, 't0'), null);
  assert.equal(g.s.moves, 1);
});

test('stacks move together; broken runs do not', () => {
  const s = empty();
  s.t[0] = [up(id(0, 9)), up(id(1, 8)), up(id(0, 7))];
  s.t[1] = [up(id(2, 10))];
  s.t[2] = [up(id(1, 9)), up(id(1, 8))]; // not a valid run
  const g = new Klondike(1, s);
  assert.ok(g.movable('t0', 0));
  assert.ok(!g.movable('t2', 0));
  assert.ok(g.move('t0', 0, 't1'));
  assert.deepEqual(g.s.t[1].map((c) => c.id), [id(2, 10), id(0, 9), id(1, 8), id(0, 7)]);
});

test('foundations: ace first, then same suit up; single cards only', () => {
  const s = empty();
  s.t[0] = [up(id(1, 2)), up(id(0, 1))];
  s.waste = [up(id(1, 1))];
  const g = new Klondike(1, s);
  assert.ok(g.canMove('waste', 0, 'f0'));
  assert.ok(!g.canMove('t0', 0, 'f0'), 'stack to foundation');
  g.move('waste', 0, 'f0');
  g.move('t0', 1, 'f1');
  assert.ok(!g.canMove('t0', 0, 'f1'), 'wrong suit');
  assert.ok(g.canMove('t0', 0, 'f0'));
  assert.equal(g.bestTarget('t0', 0), 'f0');
});

test('stock: draw 1, draw 3, recycle, undo', () => {
  const g = new Klondike(3);
  const top = g.s.stock.at(-1).id;
  assert.deepEqual(g.drawStock(), [top, g.s.waste[1].id, g.s.waste[2].id]);
  assert.equal(g.s.waste.length, 3);
  assert.equal(g.s.stock.length, 21);
  for (let i = 0; i < 7; i++) g.drawStock();
  assert.equal(g.s.stock.length, 0);
  assert.equal(g.s.waste.length, 24);
  assert.deepEqual(g.drawStock(), [], 'recycle');
  assert.equal(g.s.stock.length, 24);
  assert.equal(g.s.stock.at(-1).id, top, 'recycled in original order');
  assert.ok(g.s.stock.every((c) => !c.up));
  g.undo();
  assert.equal(g.s.waste.length, 24);
  const g1 = new Klondike(1);
  g1.drawStock();
  assert.equal(g1.s.waste.length, 1);
  assert.equal(new Klondike(1, empty()).drawStock(), null);
});

test('undo restores the exact previous state', () => {
  const g = new Klondike(1);
  const before = JSON.stringify(g.s);
  assert.ok(!g.undo());
  g.drawStock();
  g.drawStock();
  g.undo();
  g.undo();
  assert.equal(JSON.stringify(g.s), before);
  assert.ok(!g.canUndo());
});

test('near-win: auto-finish and win detection', () => {
  const s = empty();
  for (let su = 0; su < 4; su++) for (let r = 1; r <= 11; r++) s.f[su].push(up(id(su, r)));
  s.t[0] = [up(id(0, 13)), up(id(1, 12))];
  s.t[1] = [up(id(1, 13)), up(id(0, 12))];
  s.t[2] = [up(id(2, 13)), up(id(3, 12))];
  s.t[3] = [up(id(3, 13)), up(id(2, 12))];
  const g = new Klondike(1, s);
  assert.ok(!g.isWon());
  assert.ok(g.canAutoFinish());
  let steps = 0;
  while (g.autoStep()) steps++;
  assert.equal(steps, 8);
  assert.ok(g.isWon());
  assert.ok(!g.canAutoFinish());
  assert.ok(g.s.f.every((f) => f.every((c, i) => rankOf(c.id) === i + 1 && suitOf(c.id) === suitOf(f[0].id))));
  g.undo();
  assert.ok(!g.isWon());
});

test('auto-finish is not offered with cards in the stock or face down', () => {
  const s = empty();
  s.t[0] = [down(id(0, 2)), up(id(0, 1))];
  assert.ok(!new Klondike(1, s).canAutoFinish());
  const s2 = empty();
  s2.stock = [down(id(0, 1))];
  assert.ok(!new Klondike(1, s2).canAutoFinish());
});

console.log(`${n} tests passed`);
