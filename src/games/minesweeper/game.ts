// Minesweeper UI: loaded lazily by element.ts once <mine-sweeper> connects.
// Wires the pure engine to the server-rendered frame, the window's menu bar,
// pointer/touch/keyboard input, the timer, best times and the dialogs.
import {
  LEVELS, chord, createGame, minesLeft, neighbours, reveal, toggleFlag, view,
  type CellView, type Game, type Level,
} from './engine';
import { SEGMENTS, ledText } from './art';

const BEST_KEY = 'minesweeper.best';
const LEVEL_KEY = 'minesweeper.level';
const LONG_PRESS_MS = 350;
const MOVE_SLOP = 10;
const LEVEL_NAMES: Record<Level, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert',
};
const LEVEL_ORDER: Level[] = ['beginner', 'intermediate', 'expert'];
const secs = (n: number) => `${n} ${n === 1 ? 'second' : 'seconds'}`;

type Best = Partial<Record<Level, number>>;

function readBest(): Best {
  try {
    const v = JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}');
    return v && typeof v === 'object' ? (v as Best) : {};
  } catch {
    return {};
  }
}

function writeBest(best: Best): void {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {}
}

function readLevel(): Level {
  try {
    const v = localStorage.getItem(LEVEL_KEY);
    if (v && v in LEVELS) return v as Level;
  } catch {}
  return 'beginner';
}

// Sound is optional and owned by another module that may not exist yet; a
// glob resolves to nothing when the file is missing instead of failing the build.
const soundModules = import.meta.glob<{ playSound?: (name: string) => unknown }>(
  '../../scripts/sound.{ts,js}',
);

async function play(name: 'ding' | 'error'): Promise<void> {
  try {
    if (localStorage.getItem('sound') !== 'on') return;
  } catch {
    return;
  }
  try {
    const load = Object.values(soundModules)[0];
    if (load) {
      const mod = await load();
      if (typeof mod.playSound === 'function') {
        await mod.playSound(name);
        return;
      }
    }
  } catch {}
  try {
    (window as unknown as { __playSound?: (n: string) => unknown }).__playSound?.(name);
  } catch {}
}

const CELL_LABEL: Record<string, string> = {
  h: 'hidden', f: 'flagged', m: 'mine', x: 'mine, exploded', w: 'wrong flag', '0': 'empty',
};

type Face = 'smile' | 'oh' | 'dead' | 'cool';

interface MenuItem {
  id: string;
  label: string;
  hint?: string;
  level?: Level;
}

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, props: Record<string, string> = {}, text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  return el;
}

export function mount(root: HTMLElement) {
  const frame = root.querySelector<HTMLElement>('.ms')!;
  const grid = root.querySelector<HTMLElement>('.ms-grid')!;
  const ledMines = root.querySelector<HTMLElement>('[data-led="mines"]')!;
  const ledTime = root.querySelector<HTMLElement>('[data-led="time"]')!;
  const faceBtn = root.querySelector<HTMLButtonElement>('.ms-face')!;
  const flagBtn = root.querySelector<HTMLButtonElement>('.ms-flagmode')!;
  const live = root.querySelector<HTMLElement>('[data-live]')!;

  let level: Level = readLevel();
  let g: Game = createGame(LEVELS[level]);
  let cells: HTMLElement[] = [];
  let focusIdx = 0;
  let flagMode = false;
  let startedAt = 0;
  let seconds = 0;
  let tick: ReturnType<typeof setInterval> | undefined;
  let pressed: number[] = [];

  // ---- rendering -----------------------------------------------------------

  function setLed(el: HTMLElement, n: number, label: string) {
    const text = ledText(n);
    el.querySelectorAll<HTMLElement>('.led-d').forEach((d, k) => {
      d.dataset.seg = SEGMENTS[text[k]!] ?? '';
    });
    el.setAttribute('aria-label', label);
  }

  function setFace(face?: Face) {
    root.dataset.face =
      face ?? (g.status === 'lost' ? 'dead' : g.status === 'won' ? 'cool' : 'smile');
  }

  function buildBoard() {
    const { w, h: rows } = g;
    frame.style.setProperty('--cols', String(w));
    grid.setAttribute('aria-rowcount', String(rows));
    grid.setAttribute('aria-colcount', String(w));
    grid.setAttribute('aria-label', `Minefield, ${w} by ${rows}, ${g.mines} mines`);
    focusIdx = Math.min(focusIdx, w * rows - 1);
    cells = [];
    const frag = document.createDocumentFragment();
    for (let y = 0; y < rows; y++) {
      const row = h('div', { role: 'row' });
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const c = h('div', {
          role: 'gridcell', class: 'c', 'data-s': 'h', 'aria-label': 'hidden',
          tabindex: i === focusIdx ? '0' : '-1',
        });
        cells.push(c);
        row.append(c);
      }
      frag.append(row);
    }
    const hadFocus = grid.contains(document.activeElement);
    grid.replaceChildren(frag);
    if (hadFocus) cells[focusIdx]!.focus();
  }

  function render() {
    for (let i = 0; i < cells.length; i++) {
      const v: CellView = view(g, i);
      const c = cells[i]!;
      if (c.dataset.s === v) continue;
      c.dataset.s = v;
      c.textContent = v >= '1' && v <= '8' ? v : '';
      c.setAttribute('aria-label', CELL_LABEL[v] ?? v);
    }
    const left = minesLeft(g);
    setLed(ledMines, left, `${left} mines left`);
    setFace();
    root.dataset.status = g.status;
  }

  function renderTime() {
    setLed(ledTime, seconds, secs(seconds));
  }

  let liveToggle = false;
  function announce(msg: string) {
    // A trailing no-break space makes a repeat of the same text count as a change.
    liveToggle = !liveToggle;
    live.textContent = liveToggle ? msg : `${msg} `;
  }

  // ---- timer ---------------------------------------------------------------

  function elapsed() {
    return Math.min(999, 1 + Math.floor((performance.now() - startedAt) / 1000));
  }

  function runTimer() {
    clearInterval(tick);
    tick = setInterval(() => {
      const s = elapsed();
      if (s !== seconds) {
        seconds = s;
        renderTime();
      }
      if (s >= 999) clearInterval(tick);
    }, 200);
  }

  function stopTimer() {
    clearInterval(tick);
    tick = undefined;
  }

  // ---- game flow -----------------------------------------------------------

  function newGame(next: Level = level) {
    const resize = next !== level || cells.length === 0;
    level = next;
    try {
      localStorage.setItem(LEVEL_KEY, level);
    } catch {}
    stopTimer();
    g = createGame(LEVELS[level]);
    seconds = 0;
    renderTime();
    if (resize) buildBoard();
    clearPress();
    render();
    root.dataset.level = level;
    syncMenuChecks();
  }

  /** Run an engine action, then handle timer, end of game and rendering. */
  function act(fn: () => void) {
    const before = g.status;
    if (before === 'won' || before === 'lost') return;
    fn();
    if (before === 'ready' && g.status !== 'ready') {
      startedAt = performance.now();
      seconds = 1;
      renderTime();
      runTimer();
    }
    render();
    if (g.status === 'won' || g.status === 'lost') finish();
  }

  function finish() {
    stopTimer();
    seconds = elapsed();
    renderTime();
    if (g.status === 'lost') {
      announce('Game over. You hit a mine.');
      void play('error');
      return;
    }
    announce(`You won in ${secs(seconds)}.`);
    void play('ding');
    const best = readBest();
    const prev = best[level];
    if (prev === undefined || seconds < prev) {
      best[level] = seconds;
      writeBest(best);
      const p = h('p', {}, `New best time for ${LEVEL_NAMES[level]}: ${secs(seconds)}.`);
      openDialog('New Record', [p], [{ label: 'OK' }]);
    }
  }

  function flag(i: number) {
    if (g.open[i]) return;
    act(() => toggleFlag(g, i));
    if (g.status === 'playing' || g.status === 'ready') {
      announce(`${g.flag[i] ? 'Flagged' : 'Unflagged'}. ${minesLeft(g)} mines left.`);
    }
  }

  function doReveal(i: number) {
    act(() => reveal(g, i));
  }

  function doChord(i: number) {
    act(() => chord(g, i));
  }

  // ---- press feedback ------------------------------------------------------

  function clearPress() {
    for (const i of pressed) cells[i]?.classList.remove('down');
    pressed = [];
    if (g.status === 'ready' || g.status === 'playing') setFace();
  }

  function showPress(i: number, wide: boolean) {
    for (const j of pressed) cells[j]?.classList.remove('down');
    pressed = [];
    if (i >= 0) {
      const targets = wide || g.open[i] ? [i, ...neighbours(g, i)] : [i];
      for (const j of targets) {
        if (g.open[j] || g.flag[j]) continue;
        cells[j]!.classList.add('down');
        pressed.push(j);
      }
    }
    setFace('oh');
  }

  function playable() {
    return g.status === 'ready' || g.status === 'playing';
  }

  function cellAt(x: number, y: number): number {
    const el = document.elementFromPoint(x, y);
    const c = el?.closest<HTMLElement>('[role="gridcell"]');
    return c ? cells.indexOf(c) : -1;
  }

  function moveFocus(i: number, focus: boolean) {
    if (i < 0 || i >= cells.length) return;
    cells[focusIdx]?.setAttribute('tabindex', '-1');
    focusIdx = i;
    const c = cells[i]!;
    c.setAttribute('tabindex', '0');
    if (focus) {
      c.focus();
      c.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  // ---- mouse ---------------------------------------------------------------
  // Pointer events report button changes mid-press as pointermove, so one
  // handler tracks the buttons mask: left reveals on release, right flags on
  // press, middle or left+right chords on release.

  type MouseMode = 'reveal' | 'chord' | 'flag' | 'done' | null;
  let mouseButtons = 0;
  let mouseMode: MouseMode = null;
  const isChordMask = (b: number) => (b & 3) === 3 || (b & 4) !== 0;

  function mouseChange(e: PointerEvent) {
    const prev = mouseButtons;
    const cur = e.buttons;
    mouseButtons = cur;
    const idx = cellAt(e.clientX, e.clientY);
    const down = cur & ~prev;

    if (cur === 0) {
      if (idx >= 0 && mouseMode === 'reveal') doReveal(idx);
      else if (idx >= 0 && mouseMode === 'chord') doChord(idx);
      mouseMode = null;
      clearPress();
      return;
    }
    if (isChordMask(cur)) {
      if (mouseMode !== 'done') mouseMode = 'chord';
    } else if (mouseMode === 'chord' && isChordMask(prev)) {
      // One of the two chord buttons came up: chord now, ignore the rest.
      if (idx >= 0) doChord(idx);
      mouseMode = 'done';
      clearPress();
      return;
    } else if (down & 2 && mouseMode === null) {
      if (idx >= 0) flag(idx);
      mouseMode = 'flag';
    } else if (cur & 1 && mouseMode === null) {
      mouseMode = 'reveal';
    }
    if (idx >= 0) moveFocus(idx, false);
    updateMousePress(idx);
  }

  function updateMousePress(idx: number) {
    if (!playable()) return;
    if (mouseMode === 'reveal') showPress(idx, false);
    else if (mouseMode === 'chord') showPress(idx, true);
  }

  // ---- touch ---------------------------------------------------------------

  let touch: { id: number; idx: number; x: number; y: number; fired: boolean; timer: number } | null = null;

  function cancelTouch() {
    if (!touch) return;
    clearTimeout(touch.timer);
    touch = null;
    clearPress();
  }

  function touchStart(e: PointerEvent) {
    if (touch) {
      cancelTouch();
      return;
    }
    const idx = cellAt(e.clientX, e.clientY);
    if (idx < 0) return;
    moveFocus(idx, false);
    const t = {
      id: e.pointerId, idx, x: e.clientX, y: e.clientY, fired: false,
      timer: window.setTimeout(() => {
        t.fired = true;
        clearPress();
        if (!g.open[idx]) {
          try {
            navigator.vibrate?.(15);
          } catch {}
          flag(idx);
        }
      }, LONG_PRESS_MS),
    };
    touch = t;
    if (!flagMode) showPress(idx, false);
  }

  function touchEnd(e: PointerEvent) {
    if (!touch || touch.id !== e.pointerId) return;
    const { idx, fired } = touch;
    cancelTouch();
    if (fired) return;
    if (flagMode && !g.open[idx]) flag(idx);
    else doReveal(idx);
  }

  // ---- board listeners -----------------------------------------------------

  grid.addEventListener('pointerdown', (e) => {
    if (!playable()) return;
    if (e.pointerType === 'mouse') {
      e.preventDefault();
      grid.setPointerCapture(e.pointerId);
      mouseChange(e);
    } else {
      // Suppress the compatibility mouse events, whose mousedown would
      // otherwise land on a dialog this tap opens and steal its focus.
      e.preventDefault();
      touchStart(e);
    }
  });
  grid.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      if (e.buttons !== mouseButtons) mouseChange(e);
      else if (mouseMode) updateMousePress(cellAt(e.clientX, e.clientY));
    } else if (touch && touch.id === e.pointerId) {
      if (Math.hypot(e.clientX - touch.x, e.clientY - touch.y) > MOVE_SLOP) cancelTouch();
    }
  });
  grid.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') mouseChange(e);
    else touchEnd(e);
  });
  grid.addEventListener('pointercancel', (e) => {
    if (e.pointerType === 'mouse') {
      mouseButtons = 0;
      mouseMode = null;
      clearPress();
    } else cancelTouch();
  });
  grid.addEventListener('lostpointercapture', (e) => {
    if (e.pointerType === 'mouse' && mouseButtons) {
      mouseButtons = 0;
      mouseMode = null;
      clearPress();
    }
  });
  // Right-click flags; the browser menu stays available outside the board.
  grid.addEventListener('contextmenu', (e) => e.preventDefault());

  grid.addEventListener('focusin', (e) => {
    const i = cells.indexOf(e.target as HTMLElement);
    if (i >= 0 && i !== focusIdx) moveFocus(i, false);
  });

  grid.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const { w } = g;
    const x = focusIdx % w;
    const y = (focusIdx - x) / w;
    let next = -1;
    switch (e.key) {
      case 'ArrowLeft': next = x > 0 ? focusIdx - 1 : focusIdx; break;
      case 'ArrowRight': next = x < w - 1 ? focusIdx + 1 : focusIdx; break;
      case 'ArrowUp': next = y > 0 ? focusIdx - w : focusIdx; break;
      case 'ArrowDown': next = y < g.h - 1 ? focusIdx + w : focusIdx; break;
      case 'Home': next = y * w; break;
      case 'End': next = y * w + w - 1; break;
      case 'PageUp': next = x; break;
      case 'PageDown': next = (g.h - 1) * w + x; break;
      case ' ':
      case 'Enter': doReveal(focusIdx); break;
      case 'f':
      case 'F': flag(focusIdx); break;
      case 'c':
      case 'C':
        if (g.open[focusIdx]) doChord(focusIdx);
        break;
      default: return;
    }
    e.preventDefault();
    if (next >= 0) moveFocus(next, true);
  });

  root.addEventListener('keydown', (e) => {
    if (e.key === 'F2') {
      e.preventDefault();
      newGame();
    }
  });

  faceBtn.addEventListener('click', () => {
    newGame();
    announce(`New game. ${LEVEL_NAMES[level]}, ${g.mines} mines.`);
  });

  flagBtn.addEventListener('click', () => {
    flagMode = !flagMode;
    flagBtn.setAttribute('aria-pressed', String(flagMode));
    root.toggleAttribute('data-flagmode', flagMode);
    announce(flagMode ? 'Flag mode on. Taps place flags.' : 'Flag mode off. Taps reveal.');
  });

  // ---- dialogs -------------------------------------------------------------

  let dialogCount = 0;
  function openDialog(
    title: string, body: Node[], buttons: { label: string; onClick?: () => void }[],
  ) {
    const id = `ms-dlg-${++dialogCount}`;
    const dlg = h('dialog', { class: 'window ms-dialog', 'aria-labelledby': id });
    const bar = h('div', { class: 'title-bar' });
    bar.append(h('h2', { class: 'title-bar-text', id }, title));
    const controls = h('div', { class: 'title-bar-controls' });
    const x = h('button', { type: 'button', 'aria-label': 'Close' });
    x.addEventListener('click', () => dlg.close());
    controls.append(x);
    bar.append(controls);
    const content = h('div', { class: 'window-body' });
    const doc = h('div', { class: 'ms-dialog-doc' });
    doc.append(...body);
    const row = h('div', { class: 'ms-dialog-buttons' });
    for (const b of buttons) {
      const btn = h('button', { type: 'button' }, b.label);
      btn.addEventListener('click', () => {
        b.onClick?.();
        dlg.close();
      });
      row.append(btn);
    }
    content.append(doc, row);
    dlg.append(bar, content);
    dlg.addEventListener('close', () => {
      dlg.remove();
      (cells[focusIdx] ?? faceBtn).focus({ preventScroll: true });
    });
    root.append(dlg);
    dlg.showModal();
    (row.lastElementChild as HTMLElement | null)?.focus();
    return dlg;
  }

  function showBest() {
    const best = readBest();
    const list = h('dl', { class: 'ms-best' });
    const fill = () => {
      list.replaceChildren();
      for (const l of LEVEL_ORDER) {
        list.append(h('dt', {}, LEVEL_NAMES[l]));
        const t = best[l];
        list.append(h('dd', {}, t === undefined ? 'No time yet' : secs(t)));
      }
    };
    fill();
    const dlg = openDialog('Best Times', [list], [{ label: 'OK' }]);
    const reset = h('button', { type: 'button' }, 'Reset Scores');
    reset.addEventListener('click', () => {
      for (const l of LEVEL_ORDER) delete best[l];
      writeBest(best);
      fill();
      announce('Best times cleared.');
    });
    dlg.querySelector('.ms-dialog-buttons')!.prepend(reset);
  }

  function showHowTo() {
    const p = (t: string) => h('p', {}, t);
    openDialog('How to Play', [
      p('Find every square without a mine. A number shows how many mines touch that square.'),
      p('Mouse: left-click reveals, right-click places a flag, and clicking a number whose flags are all placed clears the squares around it (so do the middle button and both buttons together).'),
      p('Touch: tap reveals and a long press places a flag. Turn on Flag mode to place flags with a tap.'),
      p('Keyboard: arrow keys move, Space or Enter reveals, F places a flag, C clears around a number and F2 starts a new game.'),
    ], [{ label: 'OK' }]);
  }

  function showAbout() {
    openDialog('About Minesweeper', [
      h('p', {}, 'A remake of the Windows 98 classic, written for this site in plain TypeScript. Faces, counters and tiles are drawn with CSS and SVG.'),
    ], [{ label: 'OK' }]);
  }

  // ---- menu bar --------------------------------------------------------------
  // The window renders "Game" and "Help" as inert labels so the frame is
  // complete without JavaScript; here they become real menu buttons.

  const menus: { label: string; items: (MenuItem | null)[] }[] = [
    {
      label: 'Game',
      items: [
        { id: 'new', label: 'New', hint: 'F2' },
        null,
        ...LEVEL_ORDER.map((l) => ({ id: `level-${l}`, label: LEVEL_NAMES[l], level: l })),
        null,
        { id: 'best', label: 'Best Times...' },
        null,
        { id: 'exit', label: 'Exit' },
      ],
    },
    {
      label: 'Help',
      items: [
        { id: 'howto', label: 'How to Play' },
        { id: 'about', label: 'About Minesweeper' },
      ],
    },
  ];

  const win = root.closest('win-window');
  let bar = win?.querySelector<HTMLElement>('.win-menu') ?? null;
  if (!bar) {
    bar = h('div', { class: 'win-menu', role: 'menubar', 'aria-label': 'Minesweeper menu' });
    root.prepend(bar);
  }
  bar.classList.add('ms-menubar');
  const barButtons: HTMLButtonElement[] = [];
  const menuEls: HTMLElement[] = [];
  let openIdx = -1;

  function runItem(id: string) {
    if (id === 'new') newGame();
    else if (id.startsWith('level-')) {
      newGame(id.slice(6) as Level);
      announce(`${LEVEL_NAMES[level]}: ${g.w} by ${g.h}, ${g.mines} mines.`);
    } else if (id === 'best') showBest();
    else if (id === 'howto') showHowTo();
    else if (id === 'about') showAbout();
    else if (id === 'exit') {
      const close = win?.querySelector<HTMLElement>('[data-action="close"]');
      if (close) close.click();
      else location.href = '/';
    }
  }

  const itemsOf = (k: number) =>
    [...menuEls[k]!.querySelectorAll<HTMLElement>('[role^="menuitem"]')];

  function onDocPointer(e: PointerEvent) {
    if (!bar!.contains(e.target as Node)) closeMenu(false);
  }

  function openMenu(k: number, focusItem: 'first' | 'last' | null) {
    if (openIdx !== k) closeMenu(false);
    openIdx = k;
    menuEls[k]!.hidden = false;
    barButtons[k]!.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', onDocPointer, true);
    const items = itemsOf(k);
    if (focusItem) (focusItem === 'first' ? items[0] : items[items.length - 1])?.focus();
  }

  function closeMenu(returnFocus: boolean) {
    if (openIdx < 0) return;
    const k = openIdx;
    menuEls[k]!.hidden = true;
    barButtons[k]!.setAttribute('aria-expanded', 'false');
    openIdx = -1;
    document.removeEventListener('pointerdown', onDocPointer, true);
    if (returnFocus) barButtons[k]!.focus();
  }

  function syncMenuChecks() {
    for (const el of menuEls) {
      el.querySelectorAll<HTMLElement>('[data-level]').forEach((it) => {
        it.setAttribute('aria-checked', String(it.dataset.level === level));
      });
    }
  }

  bar.replaceChildren();
  menus.forEach((m, k) => {
    const wrap = h('div', { class: 'ms-mb-item', role: 'none' });
    const btn = h('button', {
      type: 'button', class: 'ms-mb-btn', role: 'menuitem',
      'aria-haspopup': 'menu', 'aria-expanded': 'false', id: `ms-mb-${k}`,
    }, m.label);
    const menu = h('div', { class: 'ms-menu', role: 'menu', 'aria-labelledby': `ms-mb-${k}` });
    menu.hidden = true;
    for (const it of m.items) {
      if (!it) {
        menu.append(h('div', { class: 'ms-menu-sep', role: 'separator' }));
        continue;
      }
      const b = h('button', {
        type: 'button', class: 'ms-menu-item', tabindex: '-1',
        role: it.level ? 'menuitemradio' : 'menuitem',
      });
      if (it.level) b.dataset.level = it.level;
      b.append(h('span', { class: 'ms-menu-label' }, it.label));
      if (it.hint) b.append(h('span', { class: 'ms-menu-hint', 'aria-hidden': 'true' }, it.hint));
      if (it.hint) b.setAttribute('aria-keyshortcuts', it.hint);
      b.addEventListener('click', () => {
        closeMenu(false);
        runItem(it.id);
      });
      menu.append(b);
    }
    btn.addEventListener('click', () => {
      if (openIdx === k) closeMenu(false);
      else openMenu(k, null);
    });
    btn.addEventListener('pointerenter', () => {
      if (openIdx >= 0 && openIdx !== k) openMenu(k, null);
    });
    btn.addEventListener('keydown', (e) => {
      const n = menus.length;
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu(k, 'first');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        openMenu(k, 'last');
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const j = (k + (e.key === 'ArrowRight' ? 1 : n - 1)) % n;
        if (openIdx >= 0) openMenu(j, 'first');
        else barButtons[j]!.focus();
      } else if (e.key === 'Escape') {
        closeMenu(true);
      }
    });
    menu.addEventListener('keydown', (e) => {
      const items = itemsOf(k);
      const at = items.indexOf(document.activeElement as HTMLElement);
      const n = menus.length;
      let to = -1;
      switch (e.key) {
        case 'ArrowDown': to = (at + 1) % items.length; break;
        case 'ArrowUp': to = (at - 1 + items.length) % items.length; break;
        case 'Home': to = 0; break;
        case 'End': to = items.length - 1; break;
        case 'Escape': closeMenu(true); break;
        case 'Tab': closeMenu(false); return;
        case 'ArrowRight':
        case 'ArrowLeft':
          openMenu((k + (e.key === 'ArrowRight' ? 1 : n - 1)) % n, 'first');
          break;
        default: return;
      }
      e.preventDefault();
      if (to >= 0) items[to]!.focus();
    });
    wrap.append(btn, menu);
    bar!.append(wrap);
    barButtons.push(btn);
    menuEls.push(menu);
  });

  // ---- start -----------------------------------------------------------------

  newGame(level);

  return {
    connect() {
      if (g.status === 'playing') runTimer();
    },
    disconnect() {
      stopTimer();
      cancelTouch();
      closeMenu(false);
    },
  };
}
