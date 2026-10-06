// Klondike rules, with no DOM. The renderer drives it and the node test in
// engine.test.mjs exercises it directly.
//
// A card is a number 0..51: suit = id / 13 (0 spades, 1 hearts, 2 diamonds,
// 3 clubs) and rank = id % 13 + 1 (1 ace .. 13 king).

export type PileId =
  | 'stock' | 'waste'
  | 'f0' | 'f1' | 'f2' | 'f3'
  | 't0' | 't1' | 't2' | 't3' | 't4' | 't5' | 't6';

export interface Card { id: number; up: boolean }

export interface State {
  stock: Card[];
  waste: Card[];
  f: Card[][];
  t: Card[][];
  moves: number;
}

export type Draw = 1 | 3;

export const SUITS = ['♠', '♥', '♦', '♣'] as const;
const SUIT_NAMES = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANK_NAMES = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
export const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const suitOf = (id: number) => (id / 13) | 0;
export const rankOf = (id: number) => (id % 13) + 1;
export const isRed = (id: number) => suitOf(id) === 1 || suitOf(id) === 2;
export const cardName = (id: number) => `${RANK_NAMES[rankOf(id)]} of ${SUIT_NAMES[suitOf(id)]}`;

export const PILES: PileId[] = ['stock', 'waste', 'f0', 'f1', 'f2', 'f3', 't0', 't1', 't2', 't3', 't4', 't5', 't6'];

export function pileName(p: PileId): string {
  if (p === 'stock') return 'stock';
  if (p === 'waste') return 'waste pile';
  if (p[0] === 'f') return 'foundation';
  return `column ${+p[1] + 1}`;
}

export function deal(rng: () => number = Math.random): State {
  const ids = Array.from({ length: 52 }, (_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const t: Card[][] = [];
  let k = 0;
  for (let c = 0; c < 7; c++) {
    const col: Card[] = [];
    for (let r = 0; r <= c; r++) col.push({ id: ids[k++], up: r === c });
    t.push(col);
  }
  const stock = ids.slice(k).map((id) => ({ id, up: false }));
  return { stock, waste: [], f: [[], [], [], []], t, moves: 0 };
}

export interface MoveResult {
  cards: number[];
  from: PileId;
  to: PileId;
  /** Card turned face up in the source column, if any. */
  flipped?: number;
}

export class Klondike {
  s: State;
  draw: Draw;
  private hist: string[] = [];

  constructor(draw: Draw = 1, state: State = deal()) {
    this.draw = draw;
    this.s = state;
  }

  pile(p: PileId): Card[] {
    if (p === 'stock') return this.s.stock;
    if (p === 'waste') return this.s.waste;
    return p[0] === 'f' ? this.s.f[+p[1]] : this.s.t[+p[1]];
  }

  /** Can the cards from `index` to the top of `from` be picked up? */
  movable(from: PileId, index: number): boolean {
    const pile = this.pile(from);
    if (from === 'stock' || index < 0 || index >= pile.length) return false;
    if (from[0] !== 't') return index === pile.length - 1;
    for (let i = index; i < pile.length; i++) {
      const c = pile[i];
      if (!c.up) return false;
      if (i > index) {
        const p = pile[i - 1].id;
        if (isRed(p) === isRed(c.id) || rankOf(p) !== rankOf(c.id) + 1) return false;
      }
    }
    return true;
  }

  canMove(from: PileId, index: number, to: PileId): boolean {
    if (from === to || to === 'stock' || to === 'waste' || !this.movable(from, index)) return false;
    const src = this.pile(from);
    const card = src[index].id;
    const dst = this.pile(to);
    const top = dst[dst.length - 1];
    if (to[0] === 'f') {
      if (index !== src.length - 1) return false;
      return top ? suitOf(top.id) === suitOf(card) && rankOf(card) === rankOf(top.id) + 1 : rankOf(card) === 1;
    }
    if (!top) return rankOf(card) === 13;
    return top.up && isRed(top.id) !== isRed(card) && rankOf(top.id) === rankOf(card) + 1;
  }

  private save() {
    this.hist.push(JSON.stringify(this.s));
    if (this.hist.length > 500) this.hist.shift();
  }

  move(from: PileId, index: number, to: PileId): MoveResult | null {
    if (!this.canMove(from, index, to)) return null;
    this.save();
    const src = this.pile(from);
    const cards = src.splice(index);
    this.pile(to).push(...cards);
    const res: MoveResult = { cards: cards.map((c) => c.id), from, to };
    const top = src[src.length - 1];
    if (from[0] === 't' && top && !top.up) {
      top.up = true;
      res.flipped = top.id;
    }
    this.s.moves++;
    return res;
  }

  /** Turn cards from the stock onto the waste, or recycle the waste when the stock is empty. */
  drawStock(): number[] | null {
    const { stock, waste } = this.s;
    if (!stock.length && !waste.length) return null;
    this.save();
    this.s.moves++;
    if (!stock.length) {
      while (waste.length) {
        const c = waste.pop()!;
        c.up = false;
        stock.push(c);
      }
      return [];
    }
    const drawn: number[] = [];
    for (let i = 0; i < this.draw && stock.length; i++) {
      const c = stock.pop()!;
      c.up = true;
      waste.push(c);
      drawn.push(c.id);
    }
    return drawn;
  }

  canUndo() { return this.hist.length > 0; }

  undo(): boolean {
    const prev = this.hist.pop();
    if (!prev) return false;
    this.s = JSON.parse(prev);
    return true;
  }

  /** Best legal destination: a foundation, then a built column, then an empty one. */
  bestTarget(from: PileId, index: number): PileId | null {
    const order: PileId[] = ['f0', 'f1', 'f2', 'f3'];
    const empties: PileId[] = [];
    for (let i = 0; i < 7; i++) {
      const p = `t${i}` as PileId;
      (this.s.t[i].length ? order : empties).push(p);
    }
    // A king already at the bottom of a column gains nothing from an empty one.
    if (!(from[0] === 't' && index === 0)) order.push(...empties);
    return order.find((p) => this.canMove(from, index, p)) ?? null;
  }

  isWon(): boolean { return this.s.f.every((f) => f.length === 13); }

  canAutoFinish(): boolean {
    return !this.isWon() && !this.s.stock.length && !this.s.waste.length && this.s.t.every((c) => c.every((x) => x.up));
  }

  /** Move the lowest card that can go to a foundation. */
  autoStep(): MoveResult | null {
    let best: { from: PileId; index: number; rank: number } | null = null;
    const sources: PileId[] = ['waste', 't0', 't1', 't2', 't3', 't4', 't5', 't6'];
    for (const from of sources) {
      const pile = this.pile(from);
      const index = pile.length - 1;
      if (index < 0) continue;
      const rank = rankOf(pile[index].id);
      if (best && rank >= best.rank) continue;
      if (['f0', 'f1', 'f2', 'f3'].some((f) => this.canMove(from, index, f as PileId))) best = { from, index, rank };
    }
    if (!best) return null;
    const to = (['f0', 'f1', 'f2', 'f3'] as PileId[]).find((f) => this.canMove(best!.from, best!.index, f))!;
    return this.move(best.from, best.index, to);
  }
}
