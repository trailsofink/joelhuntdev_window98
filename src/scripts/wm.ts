// Window manager for <win-window> (rendered by src/components/Window.astro).
//
// Every page server-renders exactly one window inside <main id="windows">,
// already in its final place (CSS centers it, or maximizes it on phones), so
// nothing moves when this script arrives. This script adds the desktop
// behavior: focus and z-order, dragging, minimize/maximize/close, the taskbar
// buttons, remembered positions, and keeping windows open across pages.
//
// How windows survive navigation
// ------------------------------
// The ClientRouter swaps <main> on every navigation, but #desktop is
// transition:persist, so anything inside it survives. It holds an empty
// #win-layer for that purpose:
//
//  1. astro:before-swap: the current page's window moves from <main> into
//     #win-layer ("background"). If the layer already holds a window for the
//     incoming page's app, it is either kept for reuse (same URL, so the same
//     content, and any game state is preserved) or dropped (same app at a
//     different URL, e.g. another case study; the fresh copy replaces it).
//  2. astro:after-swap: a kept window goes back into <main> in place of the
//     freshly rendered copy. Then the page's window is focused and the
//     taskbar is redrawn.
//
// Moves use Element.moveBefore() where the browser has it, which keeps
// focus, iframes and running state intact (Astro's persist uses it too).
//
// One h1 and no duplicate ids: the window title is the page's <h1>. When a
// window goes into the background its h1 becomes <div role="heading"
// aria-level="2">, and every id inside it (and every for / aria-* / #href
// reference to those ids) gets a "bg-" prefix. Coming back to the foreground
// reverses both. So the document always has exactly one h1, the page's, and
// background windows can't collide with ids on the new page.

import { navigate } from 'astro:transitions/client';

type Win = HTMLElement;
type Pos = { x?: number; y?: number; max?: boolean };

const STORE = 'wm:windows';
const BG = 'bg-';
const CASCADE = 24;
const REF_ATTRS = ['for', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant', 'list', 'form', 'headers'];
const phone = matchMedia('(max-width: 768px)');

let saved: Record<string, Pos> = {};
try { saved = JSON.parse(sessionStorage.getItem(STORE) || '{}'); } catch { /* fresh session */ }

/** App ids in the order their windows opened; the taskbar uses this order. */
let openOrder: string[] = [];
/** Windows bottom to top. */
let stack: Win[] = [];
let active: Win | null = null;
/** A background window that the incoming page will reuse. */
let reclaim: Win | null = null;

const layer = () => document.getElementById('win-layer');
const pageWin = () => document.querySelector<Win>('#windows win-window');
const allWins = () => [...document.querySelectorAll<Win>('win-window')];
const byApp = (app: string) => allWins().find((w) => w.dataset.app === app) ?? null;
const isMin = (w: Win) => w.hasAttribute('data-min');
const titleBar = (w: Win) => w.querySelector<HTMLElement>(':scope > .title-bar');
const normPath = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p);

function persist() {
  try { sessionStorage.setItem(STORE, JSON.stringify(saved)); } catch { /* ignore */ }
}

function move(node: Node, parent: Node, before: Node | null = null) {
  const p = parent as Node & { moveBefore?: (n: Node, c: Node | null) => void };
  if (typeof p.moveBefore === 'function' && node.isConnected && parent.isConnected) p.moveBefore(node, before);
  else parent.insertBefore(node, before);
}

// --- background / foreground ------------------------------------------------

function shiftIds(win: Win, toBackground: boolean) {
  const map = new Map<string, string>();
  for (const el of win.querySelectorAll<HTMLElement>('[id]')) {
    const id = el.id;
    const next = toBackground ? (id.startsWith(BG) ? id : BG + id) : id.startsWith(BG) ? id.slice(BG.length) : id;
    if (next !== id) { map.set(id, next); el.id = next; }
  }
  if (!map.size) return;
  for (const el of [win, ...win.querySelectorAll('*')]) {
    for (const a of REF_ATTRS) {
      const v = el.getAttribute(a);
      if (!v) continue;
      const nv = v.split(/\s+/).map((t) => map.get(t) ?? t).join(' ');
      if (nv !== v) el.setAttribute(a, nv);
    }
    const href = el.localName === 'a' ? el.getAttribute('href') : null;
    if (href?.startsWith('#') && map.has(href.slice(1))) el.setAttribute('href', '#' + map.get(href.slice(1)));
  }
}

function retag(el: Element, tag: string, attrs: Record<string, string | null>) {
  const next = document.createElement(tag);
  for (const a of el.attributes) next.setAttribute(a.name, a.value);
  for (const [k, v] of Object.entries(attrs)) v === null ? next.removeAttribute(k) : next.setAttribute(k, v);
  while (el.firstChild) next.append(el.firstChild);
  el.replaceWith(next);
}

function toBackground(win: Win) {
  const h = win.querySelector(':scope > .title-bar > h1');
  if (h) retag(h, 'div', { role: 'heading', 'aria-level': '2' });
  shiftIds(win, true);
  const l = layer();
  if (l) move(win, l);
}

function toForeground(win: Win) {
  const h = win.querySelector(':scope > .title-bar > [role="heading"]');
  if (h) retag(h, 'h1', { role: null, 'aria-level': null });
  shiftIds(win, false);
}

// --- placement ---------------------------------------------------------------

function bounds() {
  const tb = document.querySelector<HTMLElement>('[data-taskbar]');
  return { w: innerWidth, h: innerHeight - (tb?.offsetHeight ?? 40) };
}

/** Keeps at least part of the title bar on screen. */
function clampPos(win: Win, x: number, y: number) {
  const b = bounds();
  const w = win.offsetWidth;
  return {
    x: Math.round(Math.min(Math.max(x, 64 - w), b.w - 64)),
    y: Math.round(Math.min(Math.max(y, 0), b.h - 24)),
  };
}

function setPos(win: Win, x: number, y: number, save = true) {
  const p = clampPos(win, x, y);
  win.style.setProperty('--x', p.x + 'px');
  win.style.setProperty('--y', p.y + 'px');
  win.style.setProperty('--t', '0 0');
  if (save) {
    const app = win.dataset.app!;
    saved[app] = { ...saved[app], x: p.x, y: p.y };
    persist();
  }
}

function setMax(win: Win, on: boolean, save = true) {
  win.classList.toggle('is-max', on);
  const btn = win.querySelector<HTMLButtonElement>('[data-action="maximize"]');
  if (btn) btn.setAttribute('aria-label', on ? 'Restore' : 'Maximize');
  if (save) {
    const app = win.dataset.app!;
    saved[app] = { ...saved[app], max: on };
    persist();
  }
}

/** A window opening for the first time: remembered spot, else cascade from the others. */
function place(win: Win) {
  const s = saved[win.dataset.app!];
  if (s?.max) setMax(win, true, false);
  if (s && s.x !== undefined && s.y !== undefined) { setPos(win, s.x, s.y, false); return; }
  const others = allWins().filter((w) => w !== win && !isMin(w));
  if (!others.length) return; // the CSS default (centered) is already right
  const r = win.getBoundingClientRect();
  const n = others.length % 6;
  setPos(win, r.left + n * CASCADE, r.top + n * CASCADE, false);
}

// --- focus, z-order and the taskbar -------------------------------------------

function register(win: Win) {
  if (win.hasAttribute('data-wm')) return;
  win.setAttribute('data-wm', '');
  win.tabIndex = -1;
  const app = win.dataset.app!;
  if (!openOrder.includes(app)) openOrder.push(app);
  stack.push(win);
  place(win);
}

function activate(win: Win | null) {
  stack = stack.filter((w) => w.isConnected && w !== win);
  if (win) stack.push(win);
  stack.forEach((w, i) => { w.style.zIndex = String(10 + i); });
  active = win;
  for (const w of allWins()) {
    const on = w === win;
    titleBar(w)?.classList.toggle('inactive', !on);
    if (on) w.setAttribute('aria-current', 'true');
    else w.removeAttribute('aria-current');
  }
  renderTaskbar();
}

function topVisible(except?: Win) {
  for (let i = stack.length - 1; i >= 0; i--) {
    const w = stack[i];
    if (w !== except && w.isConnected && !isMin(w)) return w;
  }
  return null;
}

function renderTaskbar() {
  const wins = allWins();
  openOrder = openOrder.filter((app) => wins.some((w) => w.dataset.app === app));
  for (const li of document.querySelectorAll<HTMLElement>('.task-buttons > li')) {
    const app = li.dataset.app!;
    const win = wins.find((w) => w.dataset.app === app);
    li.hidden = !win;
    li.style.order = String(openOrder.indexOf(app));
    li.querySelector('button')?.setAttribute('aria-pressed', String(!!win && win === active && !isMin(win)));
    // An explorer window shows different folders; its button names the current one.
    const label = li.querySelector('.task-label');
    if (win?.dataset.kind === 'explorer' && label) label.textContent = titleBar(win)?.querySelector('.title-bar-text')?.textContent ?? label.textContent;
  }
}

/** Brings a window forward; if it isn't the page's window, go to its URL so the address matches. */
function focusWin(win: Win) {
  win.removeAttribute('data-min');
  activate(win);
  if (win !== pageWin() && win.dataset.url) navigate(win.dataset.url);
}

function minimize(win: Win) {
  win.setAttribute('data-min', '');
  if (win.contains(document.activeElement)) (document.getElementById('start-button') as HTMLElement | null)?.focus();
  const next = topVisible(win);
  if (next) focusWin(next);
  else activate(null);
}

function close(win: Win) {
  const wasPage = win === pageWin();
  win.remove();
  stack = stack.filter((w) => w !== win);
  closed(win.dataset.app!);
  if (!wasPage) { activate(active === win ? null : active); return; }
  const next = topVisible();
  if (next?.dataset.url) { refocus = true; navigate(next.dataset.url); return; }
  // Nothing left open: show the bare desktop. Its URL is "/", which also
  // renders About Me, so the next swap drops that window instead of showing it.
  if (normPath(location.pathname) !== '/') { emptyDesktop = true; navigate('/'); return; }
  activate(null);
  (document.getElementById('start-button') as HTMLElement | null)?.focus();
}

let refocus = false;
let emptyDesktop = false;

/** Tells other scripts (the explorer's Back/Forward history) a window closed. */
function closed(app: string) {
  document.dispatchEvent(new CustomEvent('wm:close', { detail: { app } }));
}

/** Shut Down > Log off: every window closes and the session forgets positions. */
export function closeAll() {
  for (const w of allWins()) { w.remove(); closed(w.dataset.app!); }
  stack = []; openOrder = []; saved = {}; active = null;
  persist();
  emptyDesktop = true;
  navigate('/');
}

// --- the page lifecycle ---------------------------------------------------------

function sync() {
  for (const w of allWins()) register(w);
  const page = pageWin();
  if (page) {
    page.dataset.url = normPath(location.pathname);
    page.removeAttribute('data-min');
    activate(page);
  } else {
    activate(topVisible());
  }
  if (refocus && page) { refocus = false; page.focus({ preventScroll: true }); }
}

let queued = false;
function schedule() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => { queued = false; sync(); });
}

document.addEventListener('astro:before-swap', (e) => {
  const ev = e as Event & { newDocument: Document; to: URL };
  const incoming = ev.newDocument.querySelector('#windows win-window');
  const inApp = incoming?.getAttribute('data-app');
  const inUrl = normPath(ev.to.pathname);
  const cur = pageWin();
  if (cur) toBackground(cur);
  reclaim = null;
  for (const w of [...(layer()?.querySelectorAll<Win>('win-window') ?? [])]) {
    if (!inApp || w.dataset.app !== inApp) continue;
    if (!reclaim && w.dataset.url === inUrl) reclaim = w;
    else { w.remove(); stack = stack.filter((s) => s !== w); }
  }
  if (layer()?.querySelector('win-window')) keepStyles(ev.newDocument);
});

// The router drops head elements the incoming page doesn't have, which would
// strip the CSS of any window kept in the background (a game, a case study).
// Copy the current page's stylesheets into the incoming head; the router sees
// matching elements on both sides and leaves the live ones in place.
function keepStyles(next: Document) {
  const has = (el: Element) =>
    el instanceof HTMLLinkElement
      ? !!next.head.querySelector(`link[rel="stylesheet"][href="${CSS.escape(el.getAttribute('href') ?? '')}"]`)
      : [...next.head.querySelectorAll('style')].some((s) => s.textContent === el.textContent);
  for (const el of document.head.querySelectorAll('link[rel="stylesheet"], style')) {
    if (!has(el)) next.head.append(next.importNode(el, true));
  }
}

document.addEventListener('astro:after-swap', () => {
  const fresh = pageWin();
  if (reclaim && fresh?.parentNode) {
    toForeground(reclaim);
    move(reclaim, fresh.parentNode, fresh);
    fresh.remove();
  }
  reclaim = null;
  if (emptyDesktop) {
    emptyDesktop = false;
    pageWin()?.remove();
    sync();
    (document.getElementById('start-button') as HTMLElement | null)?.focus();
    return;
  }
  sync();
});

// --- input -------------------------------------------------------------------------

let drag: { win: Win; sx: number; sy: number; x0: number; y0: number; dx: number; dy: number; frame: number } | null = null;
let dragged = false;

document.addEventListener('pointerdown', (e) => {
  const t = e.target as Element;
  const win = t.closest<Win>('win-window');
  if (!win || !win.hasAttribute('data-wm')) return;
  if (win !== active) activate(win);
  dragged = false;
  const bar = t.closest('.title-bar');
  if (!bar || t.closest('.title-bar-controls') || e.button !== 0) return;
  if (phone.matches || win.classList.contains('is-max')) return;
  const r = win.getBoundingClientRect();
  drag = { win, sx: e.clientX, sy: e.clientY, x0: r.left, y0: r.top, dx: 0, dy: 0, frame: 0 };
  (bar as HTMLElement).setPointerCapture(e.pointerId);
  win.classList.add('is-dragging');
  e.preventDefault();
});

document.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const c = clampPos(drag.win, drag.x0 + e.clientX - drag.sx, drag.y0 + e.clientY - drag.sy);
  drag.dx = c.x - drag.x0;
  drag.dy = c.y - drag.y0;
  if (Math.abs(drag.dx) + Math.abs(drag.dy) > 3) dragged = true;
  if (!drag.frame) {
    drag.frame = requestAnimationFrame(() => {
      if (!drag) return;
      drag.frame = 0;
      drag.win.style.transform = `translate(${drag.dx}px, ${drag.dy}px)`;
    });
  }
});

function endDrag() {
  if (!drag) return;
  const { win, x0, y0, dx, dy, frame } = drag;
  drag = null;
  cancelAnimationFrame(frame);
  win.style.transform = '';
  win.classList.remove('is-dragging');
  if (!dx && !dy) return; // a plain click; the click handler takes it from here
  setPos(win, x0 + dx, y0 + dy);
  if (win !== pageWin() && win.dataset.url) navigate(win.dataset.url);
}
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);

document.addEventListener('dblclick', (e) => {
  const t = e.target as Element;
  const win = t.closest<Win>('win-window');
  if (!win || !t.closest('.title-bar') || t.closest('.title-bar-controls')) return;
  if (win.hasAttribute('data-resizable') && !phone.matches) setMax(win, !win.classList.contains('is-max'));
});

// Close is a link to "/" so it works without JavaScript. The ClientRouter
// follows links from its own document click listener, which runs before the
// one below, so cancel window controls in the capture phase; otherwise the
// router reloads "/" and About Me reopens the moment it is closed.
document.addEventListener('click', (e) => {
  if ((e.target as Element).closest('win-window[data-wm] [data-action]')) e.preventDefault();
}, true);

document.addEventListener('click', (e) => {
  const t = e.target as Element;

  const task = t.closest<HTMLElement>('.task-button');
  if (task) {
    const win = byApp(task.dataset.app!);
    if (!win) return;
    if (win === active && !isMin(win)) minimize(win);
    else focusWin(win);
    return;
  }

  const win = t.closest<Win>('win-window');
  if (!win || !win.hasAttribute('data-wm')) return;
  const action = t.closest<HTMLElement>('[data-action]');
  if (action && win.contains(action)) {
    e.preventDefault();
    const a = action.dataset.action;
    if (a === 'minimize') minimize(win);
    else if (a === 'maximize') setMax(win, !win.classList.contains('is-max'));
    else if (a === 'close') close(win);
    return;
  }
  // A click inside a background window (not on a link, which navigates by
  // itself, and not the end of a drag) makes it the page's window.
  if (win !== pageWin() && !dragged && !t.closest('a') && win.dataset.url) navigate(win.dataset.url);
});

let resizeFrame = 0;
addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    for (const w of allWins()) {
      const s = saved[w.dataset.app!];
      if (s?.x !== undefined && s.y !== undefined) setPos(w, s.x, s.y, false);
    }
  });
});

class WinWindow extends HTMLElement {
  connectedCallback() { schedule(); }
  /** Called instead of disconnect/connect when moved with moveBefore(); nothing to redo. */
  connectedMoveCallback() {}
}
if (!customElements.get('win-window')) customElements.define('win-window', WinWindow);
// Pages without a window (404) still need the taskbar brought up to date.
schedule();
