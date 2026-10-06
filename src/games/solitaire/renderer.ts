// Draws a Klondike game into the server-rendered table in Solitaire.astro and
// turns pointer, touch and keyboard input into engine moves. Loaded lazily by
// element.ts.

import {
  Klondike, PILES, RANKS, SUITS, cardName, isRed, pileName, rankOf, suitOf,
  type Draw, type MoveResult, type PileId,
} from './engine';

const OPTIONS_KEY = 'solitaire.options';
const TOP_TO_COL: Partial<Record<PileId, PileId>> = { stock: 't0', waste: 't1', f0: 't3', f1: 't4', f2: 't5', f3: 't6' };
const COL_TO_TOP: PileId[] = ['stock', 'waste', 'waste', 'f0', 'f1', 'f2', 'f3'];

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function loadDraw(): Draw {
  try { return JSON.parse(localStorage.getItem(OPTIONS_KEY) || '{}').draw === 3 ? 3 : 1; } catch { return 1; }
}

function saveDraw(draw: Draw) {
  try { localStorage.setItem(OPTIONS_KEY, JSON.stringify({ draw })); } catch { /* private mode */ }
}

function makeCard(id: number): HTMLElement {
  const el = document.createElement('span');
  el.className = isRed(id) ? 'sol-card sol-red' : 'sol-card';
  const rank = RANKS[rankOf(id)];
  // U+FE0E keeps hearts and diamonds as text glyphs, not emoji, on phones.
  const suit = SUITS[suitOf(id)] + '︎';
  const face = rankOf(id) > 10;
  el.innerHTML =
    `<span class="sol-i">${rank}${suit}</span>` +
    `<span class="sol-pip${face ? ' sol-court' : ''}">${face ? rank : suit}</span>` +
    `<span class="sol-i sol-i2">${rank}${suit}</span>`;
  return el;
}

const isTab = (p: PileId) => p[0] === 't';

interface Press { pile: PileId; index: number; x: number; y: number; id: number; drag: boolean }
interface Drag { ghost: HTMLElement; offX: number; offY: number; ox: number; oy: number; target: PileId | null }

export function mount(el: HTMLElement) { return new Table(el); }

class Table {
  private game: Klondike;
  private felt: HTMLElement;
  private live: HTMLElement;
  private piles = new Map<PileId, HTMLButtonElement>();
  private cards: HTMLElement[] = [];
  private sel: { pile: PileId; index: number } | null = null;
  private depth = 0;
  private kb = false;
  private press: Press | null = null;
  private dragging: Drag | null = null;
  private seconds = 0;
  private running = false;
  private interval = 0;
  private won = false;
  private busy = false;
  private stopCascade: (() => void) | null = null;

  constructor(private el: HTMLElement) {
    this.felt = el.querySelector('.sol-felt')!;
    this.live = el.querySelector('[data-live]')!;
    for (const p of PILES) this.piles.set(p, this.felt.querySelector(`[data-pile="${p}"]`)!);
    for (let id = 0; id < 52; id++) {
      const c = makeCard(id);
      c.dataset.id = String(id);
      this.cards.push(c);
    }
    this.game = new Klondike(loadDraw());
    const select = el.querySelector<HTMLSelectElement>('[data-cmd="draw"]')!;
    select.value = String(this.game.draw);
    el.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('[data-cmd]').forEach((b) => (b.disabled = false));

    el.addEventListener('click', (e) => this.onCommand(e));
    select.addEventListener('change', () => {
      const draw: Draw = select.value === '3' ? 3 : 1;
      saveDraw(draw);
      this.newGame(draw);
      this.say(`New game, draw ${draw === 3 ? 'three' : 'one'}`);
    });
    this.felt.addEventListener('pointerdown', (e) => this.onDown(e));
    this.felt.addEventListener('pointermove', (e) => this.onMove(e));
    this.felt.addEventListener('pointerup', (e) => this.onUp(e));
    this.felt.addEventListener('pointercancel', () => this.cancelDrag());
    this.felt.addEventListener('keydown', (e) => this.onKey(e));
    this.felt.addEventListener('focusin', () => { this.depth = 0; this.render(); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Tab') this.kb = true; });

    if (import.meta.env.DEV) {
      // Test hooks: ?debug=near sets up an auto-finish, ?debug=win plays it out.
      const debug = new URLSearchParams(location.search).get('debug');
      if (debug === 'near' || debug === 'win') {
        const up = (id: number) => ({ id, up: true });
        const s = this.game.s;
        s.stock = []; s.waste = [];
        s.f = [0, 1, 2, 3].map((su) => Array.from({ length: 11 }, (_, r) => up(su * 13 + r)));
        s.t = [[12, 24], [25, 11], [38, 50], [51, 37], [], [], []].map((col) => col.map(up));
        if (debug === 'win') { while (this.game.autoStep()); this.render(); this.win(); }
      }
    }
    this.render();
    this.connect();
  }

  connect() {
    if (this.running && !this.interval) this.interval = window.setInterval(() => this.tick(), 1000);
    this.status();
  }

  disconnect() {
    clearInterval(this.interval);
    this.interval = 0;
    this.stopCascade?.();
  }

  // ---- state changes -------------------------------------------------------

  private newGame(draw: Draw = this.game.draw) {
    this.stopCascade?.();
    this.el.querySelector('dialog')?.close();
    this.game = new Klondike(draw);
    this.sel = null;
    this.won = false;
    this.busy = false;
    this.running = false;
    this.seconds = 0;
    clearInterval(this.interval);
    this.interval = 0;
    this.render();
  }

  private started() {
    if (this.running || this.won) return;
    this.running = true;
    this.connect();
  }

  private tick() {
    if (document.hidden) return;
    this.seconds++;
    this.status();
  }

  private after() {
    this.sel = null;
    this.depth = 0;
    this.started();
    this.render();
    if (this.game.isWon()) this.win();
  }

  private doMove(from: PileId, index: number, to: PileId): boolean {
    const r = this.game.move(from, index, to);
    if (!r) return false;
    this.say(describe(r));
    this.after();
    return true;
  }

  private drawStock() {
    const drawn = this.game.drawStock();
    if (!drawn) return;
    this.say(
      !drawn.length ? 'Turned the waste pile over'
        : drawn.length === 1 ? `Drew ${cardName(drawn[0])}`
          : `Drew ${drawn.length} cards, ${cardName(drawn[drawn.length - 1])} on top`,
    );
    this.after();
  }

  private autoMove(pile: PileId, index: number) {
    const to = this.game.bestTarget(pile, index);
    if (to && this.doMove(pile, index, to)) return;
    this.sel = null;
    this.say(`No move for ${cardName(this.game.pile(pile)[index].id)}`);
    this.render();
  }

  /** One tap, click, or Enter on a pile; `index` is the card hit, or -1. */
  private tap(pile: PileId, index: number) {
    if (this.won || this.busy) return;
    const g = this.game;
    if (pile === 'stock') { this.sel = null; this.drawStock(); return; }
    if (!isTab(pile)) index = g.pile(pile).length - 1;
    const sel = this.sel;
    if (sel) {
      if (sel.pile === pile && sel.index === index) return this.autoMove(pile, index);
      if (this.doMove(sel.pile, sel.index, pile)) return;
    }
    if (index >= 0 && g.movable(pile, index)) {
      this.sel = { pile, index };
      this.say(`Selected ${cardName(g.pile(pile)[index].id)}`);
    } else {
      if (sel) this.say(`Can't move ${cardName(g.pile(sel.pile)[sel.index].id)} to the ${pileName(pile)}`);
      this.sel = null;
    }
    this.render();
  }

  private undo() {
    if (this.busy || !this.game.undo()) return;
    this.won = false;
    this.sel = null;
    this.say('Undid the last move');
    this.render();
  }

  private finish() {
    if (!this.game.canAutoFinish() || this.busy) return;
    this.busy = true;
    this.sel = null;
    const step = () => {
      if (!this.busy) return;
      if (this.game.autoStep()) {
        this.render();
        if (reducedMotion()) step();
        else setTimeout(step, 70);
        return;
      }
      this.busy = false;
      this.after();
    };
    step();
  }

  private win() {
    this.won = true;
    this.running = false;
    clearInterval(this.interval);
    this.interval = 0;
    this.status();
    this.say(`You won in ${this.game.s.moves} moves`);
    try {
      if (localStorage.getItem('sound') === 'on') (window as { __playSound?: (s: string) => void }).__playSound?.('ding');
    } catch { /* sound is optional */ }
    if (reducedMotion()) this.showDialog();
    else this.cascade();
  }

  // ---- win animation ---------------------------------------------------------

  private cascade() {
    const felt = this.felt;
    const W = felt.clientWidth;
    const H = felt.clientHeight;
    const canvas = document.createElement('canvas');
    canvas.className = 'sol-canvas';
    canvas.width = W;
    canvas.height = H;
    canvas.setAttribute('aria-hidden', 'true');
    felt.append(canvas);
    const ctx = canvas.getContext('2d')!;
    const css = getComputedStyle(felt);
    const color = (n: string) => css.getPropertyValue(n).trim();
    const [face, ink, red, edge] = ['--sol-face', '--sol-ink', '--sol-red', '--sol-edge'].map(color);
    const base = felt.getBoundingClientRect();
    const rects = (['f0', 'f1', 'f2', 'f3'] as const).map((p) => this.piles.get(p)!.getBoundingClientRect());
    const w = rects[0].width;
    const h = rects[0].height;
    const queue: { id: number; x: number; y: number }[] = [];
    for (let r = 12; r >= 0; r--) {
      this.game.s.f.forEach((f, i) => {
        if (f[r]) queue.push({ id: f[r].id, x: rects[i].left - base.left, y: rects[i].top - base.top });
      });
    }
    ctx.font = `bold ${Math.round(w * 0.26)}px sans-serif`;
    ctx.textBaseline = 'top';
    let cur: { id: number; x: number; y: number; vx: number; vy: number } | null = null;
    let raf = 0;
    const t0 = performance.now();
    const stop = () => {
      cancelAnimationFrame(raf);
      canvas.remove();
      this.stopCascade = null;
      this.showDialog();
    };
    const frame = (now: number) => {
      if (now - t0 > 10000) return stop();
      for (let k = 0; k < 2; k++) {
        if (!cur) {
          const next = queue.shift();
          if (!next) return stop();
          cur = { ...next, vx: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 4), vy: -Math.random() * 7 };
        }
        cur.vy += 0.5;
        cur.x += cur.vx;
        cur.y += cur.vy;
        if (cur.y + h > H) { cur.y = H - h; cur.vy *= -0.8; }
        ctx.fillStyle = edge;
        ctx.fillRect(cur.x, cur.y, w, h);
        ctx.fillStyle = face;
        ctx.fillRect(cur.x + 1, cur.y + 1, w - 2, h - 2);
        ctx.fillStyle = isRed(cur.id) ? red : ink;
        ctx.fillText(RANKS[rankOf(cur.id)] + SUITS[suitOf(cur.id)], cur.x + 3, cur.y + 3);
        if (cur.x + w < 0 || cur.x > W) cur = null;
      }
      raf = requestAnimationFrame(frame);
    };
    canvas.addEventListener('pointerdown', stop, { once: true });
    this.stopCascade = stop;
    raf = requestAnimationFrame(frame);
  }

  private showDialog() {
    let d = this.el.querySelector('dialog');
    if (!d) {
      d = document.createElement('dialog');
      d.className = 'window sol-dialog';
      d.setAttribute('aria-labelledby', 'sol-won');
      d.innerHTML =
        '<div class="title-bar"><h2 class="title-bar-text" id="sol-won">You won</h2></div>' +
        '<div class="window-body"><p data-msg></p><div class="sol-dlg-btns">' +
        '<button type="button" data-cmd="new">Deal again</button>' +
        '<button type="button" data-cmd="close">Close</button></div></div>';
      this.el.append(d);
    }
    const s = this.seconds;
    d.querySelector('[data-msg]')!.textContent =
      `You won in ${this.game.s.moves} moves and ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}.`;
    if (!d.open) d.showModal();
  }

  // ---- input ---------------------------------------------------------------

  private onCommand(e: MouseEvent) {
    const cmd = (e.target as Element).closest<HTMLElement>('[data-cmd]')?.dataset.cmd;
    if (cmd === 'new') { this.newGame(); this.say('New game'); }
    else if (cmd === 'undo') this.undo();
    else if (cmd === 'finish') this.finish();
    else if (cmd === 'close') this.el.querySelector('dialog')?.close();
  }

  private hit(target: EventTarget | null): { pile: PileId; index: number } | null {
    const t = target as Element | null;
    const pileEl = t?.closest?.<HTMLElement>('.sol-pile');
    if (!pileEl || !this.felt.contains(pileEl)) return null;
    const pile = pileEl.dataset.pile as PileId;
    const cardEl = t!.closest<HTMLElement>('.sol-card');
    const cards = this.game.pile(pile);
    const index = cardEl ? cards.findIndex((c) => c.id === +cardEl.dataset.id!) : -1;
    return { pile, index: isTab(pile) ? index : cards.length - 1 };
  }

  private onDown(e: PointerEvent) {
    if (e.button !== 0 || this.won || this.busy || this.dragging) return;
    const h = this.hit(e.target);
    if (!h) return;
    this.kb = false;
    this.press = { ...h, x: e.clientX, y: e.clientY, id: e.pointerId, drag: false };
    if (h.pile !== 'stock' && this.game.movable(h.pile, h.index)) {
      try { this.felt.setPointerCapture(e.pointerId); } catch { /* already released */ }
    }
  }

  private onMove(e: PointerEvent) {
    const p = this.press;
    if (!p || p.id !== e.pointerId) return;
    if (!this.dragging) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
      if (p.pile === 'stock' || !this.game.movable(p.pile, p.index)) return;
      this.startDrag(p);
    }
    const d = this.dragging!;
    const x = e.clientX - d.offX;
    const y = e.clientY - d.offY;
    d.ghost.style.transform = `translate(${x - d.ox}px, ${y - d.oy}px)`;
    const card = d.ghost.firstElementChild!.getBoundingClientRect();
    let over = this.hit(document.elementFromPoint(x + card.width / 2, y + Math.min(card.height / 3, 20)));
    if (!over || !this.game.canMove(p.pile, p.index, over.pile)) over = this.hit(document.elementFromPoint(e.clientX, e.clientY));
    const target = over && this.game.canMove(p.pile, p.index, over.pile) ? over.pile : null;
    if (target !== d.target) {
      if (d.target) this.piles.get(d.target)!.classList.remove('sol-drop');
      if (target) this.piles.get(target)!.classList.add('sol-drop');
      d.target = target;
    }
  }

  private startDrag(p: Press) {
    p.drag = true;
    const cards = this.game.pile(p.pile).slice(p.index);
    const first = this.cards[cards[0].id];
    const r = first.getBoundingClientRect();
    const base = this.felt.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'sol-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    cards.forEach((c, i) => {
      const clone = this.cards[c.id].cloneNode(true) as HTMLElement;
      clone.classList.remove('sol-sel', 'sol-cur');
      clone.style.cssText = `--u:${i};--d:0;--x:0`;
      ghost.append(clone);
      this.cards[c.id].classList.add('sol-lift');
    });
    this.felt.append(ghost);
    this.dragging = { ghost, offX: p.x - r.left, offY: p.y - r.top, ox: base.left, oy: base.top, target: null };
    this.sel = null;
  }

  private cancelDrag() {
    const d = this.dragging;
    this.dragging = null;
    this.press = null;
    if (!d) return null;
    d.ghost.remove();
    if (d.target) this.piles.get(d.target)!.classList.remove('sol-drop');
    this.felt.querySelectorAll('.sol-lift').forEach((c) => c.classList.remove('sol-lift'));
    this.render();
    return d.target;
  }

  private onUp(e: PointerEvent) {
    const p = this.press;
    if (!p || p.id !== e.pointerId) return;
    if (p.drag) {
      const target = this.cancelDrag();
      if (target) this.doMove(p.pile, p.index, target);
      return;
    }
    this.press = null;
    this.tap(p.pile, p.index);
  }

  private focusPile(p: PileId) {
    this.piles.get(p)!.focus();
  }

  private onKey(e: KeyboardEvent) {
    const h = this.hit(e.target);
    if (!h) return;
    this.kb = true;
    const { pile } = h;
    const cards = this.game.pile(pile);
    const i = PILES.indexOf(pile);
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
        this.focusPile(PILES[(i + (e.key === 'ArrowLeft' ? 12 : 1)) % 13]);
        break;
      case 'ArrowDown':
        if (!isTab(pile)) this.focusPile(TOP_TO_COL[pile]!);
        else if (this.depth > 0) { this.depth--; this.render(); }
        break;
      case 'ArrowUp': {
        const next = cards.length - 2 - this.depth;
        if (isTab(pile) && next >= 0 && this.game.movable(pile, next)) { this.depth++; this.render(); }
        else if (isTab(pile)) this.focusPile(COL_TO_TOP[+pile[1]]);
        break;
      }
      case 'Enter':
      case ' ':
        this.tap(pile, isTab(pile) ? cards.length - 1 - this.depth : cards.length - 1);
        break;
      case 'Escape':
        if (!this.sel) return;
        this.sel = null;
        this.say('Selection cleared');
        this.render();
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  // ---- output --------------------------------------------------------------

  private say(msg: string) {
    this.live.textContent = this.live.textContent === msg ? `${msg} ` : msg;
  }

  private status() {
    const fields = this.el.closest('win-window')?.querySelectorAll('.status-bar-field');
    if (!fields || fields.length < 2) return;
    const s = this.seconds;
    fields[0].textContent = `Moves: ${this.game.s.moves}`;
    fields[1].textContent = `Time: ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  private render() {
    const g = this.game;
    const focused = this.kb ? (document.activeElement as HTMLElement | null)?.dataset?.pile : undefined;
    for (const p of PILES) {
      const pileEl = this.piles.get(p)!;
      const cards = g.pile(p);
      const n = cards.length;
      const fan = p === 'waste' ? Math.min(n, g.draw) : 0;
      let downs = 0;
      let ups = 0;
      cards.forEach((c, i) => {
        const e = this.cards[c.id];
        if (pileEl.children[i] !== e) pileEl.insertBefore(e, pileEl.children[i] ?? null);
        e.classList.toggle('sol-down', !c.up);
        e.classList.toggle('sol-sel', !!this.sel && this.sel.pile === p && i >= this.sel.index);
        e.classList.toggle('sol-cur', focused === p && isTab(p) && i === n - 1 - this.depth);
        e.style.cssText = isTab(p)
          ? `--d:${downs};--u:${ups}`
          : p === 'waste' ? `--x:${Math.max(0, i - (n - fan))}` : '';
        if (isTab(p)) c.up ? ups++ : downs++;
      });
      // Squeeze long columns so a full run still fits on a phone.
      if (isTab(p)) pileEl.style.setProperty('--ou', ups > 10 ? 'calc(var(--cw) * 0.2)' : '');
      pileEl.setAttribute('aria-label', label(p, g, downs, ups) + (this.sel?.pile === p ? ', selected' : ''));
    }
    const undo = this.el.querySelector<HTMLButtonElement>('[data-cmd="undo"]')!;
    undo.disabled = !g.canUndo() || this.busy;
    this.el.querySelector<HTMLButtonElement>('[data-cmd="finish"]')!.hidden = !g.canAutoFinish();
    this.status();
  }
}

function describe(r: MoveResult): string {
  const more = r.cards.length > 1 ? ` and ${r.cards.length - 1} more` : '';
  const flip = r.flipped !== undefined ? `. Turned over ${cardName(r.flipped)}` : '';
  return `${cardName(r.cards[0])}${more} to ${pileName(r.to)}${flip}`;
}

function label(p: PileId, g: Klondike, downs: number, ups: number): string {
  const cards = g.pile(p);
  const top = cards.length ? cardName(cards[cards.length - 1].id) : '';
  if (p === 'stock') return `Stock, ${cards.length} cards, press to ${cards.length ? 'draw' : 'turn the waste over'}`;
  if (p === 'waste') return top ? `Waste pile, ${top}` : 'Waste pile, empty';
  if (p[0] === 'f') return `Foundation ${+p[1] + 1}, ${top || 'empty'}`;
  if (!cards.length) return `Column ${+p[1] + 1}, empty`;
  return `Column ${+p[1] + 1}, ${downs} face down, ${ups} face up, ${top} on top`;
}
