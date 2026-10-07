// Explorer behavior for <win-explorer> (src/components/Explorer.astro with
// `nav`): Home, Back and Forward, the Folders button and the tree's +/- buttons.
//
// Every explorer page (home, Projects, a case study…) is its own URL, and they
// all render in the About Me window, so the window manager swaps that one
// window's contents as the visitor moves around. This script gives the window
// its own history, separate from the browser's: it records each explorer page
// the window shows, Back and Forward step through that list, and closing the
// window (the wm:close event from wm.ts) starts it over.
//
// The Folders button shows or hides the tree. On wide windows the choice is
// remembered (localStorage.tree, applied as html[data-tree] by the head script
// so it is right on first paint); on narrow ones the tree is a drawer that
// starts closed on every page.

import { navigate } from 'astro:transitions/client';

type Trail = { app: string; urls: string[]; i: number };

const TRAIL = 'explorer:history';
const COLLAPSED = 'explorer:collapsed';
const MAX = 50;
/** Matches @container explorer (min-width: 600px) in explorer.css. */
const WIDE = 600;

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(sessionStorage.getItem(key) ?? '') ?? fallback; } catch { return fallback; }
}
function save(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

let trail: Trail = load(TRAIL, { app: '', urls: [], i: -1 });
let collapsed = new Set<string>(load<string[]>(COLLAPSED, []));
/** The trail index a Back/Forward click is heading to. */
let pending: number | null = null;
/** What to focus in the new page's window after a navigation started here. */
let refocus: 'home' | 'back' | 'forward' | 'tree' | null = null;
/** The tree's scroll position, carried over to the next page's copy of the window. */
let treeScroll = 0;

const here = () =>
  location.pathname.replace(/\.html$/, '').replace(/(^|\/)index$/, '$1').replace(/(.)\/+$/, '$1') || '/';

function record(app: string) {
  const url = here();
  if (trail.app !== app) trail = { app, urls: [], i: -1 };
  if (trail.urls[trail.i] !== url) {
    if (pending !== null && trail.urls[pending] === url) trail.i = pending;
    else if (trail.urls[trail.i - 1] === url) trail.i -= 1; // browser Back
    else if (trail.urls[trail.i + 1] === url) trail.i += 1; // browser Forward
    else {
      trail.urls = [...trail.urls.slice(Math.max(0, trail.i + 2 - MAX), trail.i + 1), url];
      trail.i = trail.urls.length - 1;
    }
    save(TRAIL, trail);
  }
  pending = null;
}

function step(by: -1 | 1) {
  const target = trail.i + by;
  const url = trail.urls[target];
  if (!url) return;
  pending = target;
  refocus = by < 0 ? 'back' : 'forward';
  navigate(url);
}

class WinExplorer extends HTMLElement {
  #ro?: ResizeObserver;

  get #treeButton() { return this.querySelector<HTMLButtonElement>('[data-explorer="tree"]'); }
  get #wide() { return this.getBoundingClientRect().width >= WIDE; }
  get #isPage() { return !!this.closest('#windows'); }

  connectedCallback() {
    if (!this.hasAttribute('data-ready')) {
      this.setAttribute('data-ready', '');
      this.addEventListener('click', this.#onClick);
      this.addEventListener('keydown', this.#onKey);
      this.#restoreFolders();
    }
    this.#ro ??= new ResizeObserver(() => {
      if (this.#wide) this.classList.remove('is-tree-open');
      this.#syncTreeButton();
    });
    this.#ro.observe(this);
    this.syncHistory();
  }

  disconnectedCallback() { this.#ro?.disconnect(); }
  /** Moved between <main> and the background layer with moveBefore(): nothing to redo. */
  connectedMoveCallback() {}

  syncHistory() {
    const back = this.querySelector<HTMLButtonElement>('[data-explorer="back"]');
    const fwd = this.querySelector<HTMLButtonElement>('[data-explorer="forward"]');
    const mine = trail.app === this.closest<HTMLElement>('win-window')?.dataset.app;
    if (back) back.disabled = !mine || trail.i <= 0;
    if (fwd) fwd.disabled = !mine || trail.i >= trail.urls.length - 1;
  }

  restoreTreeScroll(top: number) {
    const tree = this.querySelector<HTMLElement>('.explorer-tree');
    if (!tree) return;
    tree.scrollTop = top;
    // Keep the current page's row in view, scrolling only the tree.
    const link = this.querySelector('.tree-link[aria-current="page"]');
    if (!link || !tree.clientHeight) return;
    const l = link.getBoundingClientRect();
    const t = tree.getBoundingClientRect();
    if (l.top < t.top) tree.scrollTop += l.top - t.top;
    else if (l.bottom > t.bottom) tree.scrollTop += l.bottom - t.bottom;
  }

  focusAfterNavigation(what: NonNullable<typeof refocus>) {
    if (what === 'home') {
      this.querySelector<HTMLElement>('[data-explorer="home"]')?.focus();
      return;
    }
    if (what === 'tree') {
      if (this.#treeShown()) this.querySelector<HTMLElement>('.tree-link[aria-current="page"]')?.focus();
      return;
    }
    const want = this.querySelector<HTMLButtonElement>(`[data-explorer="${what}"]`);
    const other = this.querySelector<HTMLButtonElement>(`[data-explorer="${what === 'back' ? 'forward' : 'back'}"]`);
    (want && !want.disabled ? want : other)?.focus();
  }

  #treeShown() {
    return this.#wide ? document.documentElement.dataset.tree !== 'hidden' : this.classList.contains('is-tree-open');
  }

  #syncTreeButton() {
    this.#treeButton?.setAttribute('aria-expanded', String(this.#treeShown()));
  }

  #toggleTree() {
    if (this.#wide) {
      const value = this.#treeShown() ? 'hidden' : 'shown';
      document.documentElement.dataset.tree = value;
      try { localStorage.setItem('tree', value); } catch { /* private mode */ }
      for (const ex of document.querySelectorAll<WinExplorer>('win-explorer')) ex.#syncTreeButton();
      return;
    }
    const open = this.classList.toggle('is-tree-open');
    this.#syncTreeButton();
    if (open) {
      const target =
        this.querySelector<HTMLElement>('.tree-link[aria-current="page"]') ??
        this.querySelector<HTMLElement>('.tree-link');
      target?.focus();
    }
  }

  #closeDrawer(focusButton: boolean) {
    if (!this.classList.contains('is-tree-open')) return;
    this.classList.remove('is-tree-open');
    this.#syncTreeButton();
    if (focusButton) this.#treeButton?.focus();
  }

  /** Re-applies folders the visitor collapsed, but always shows the way to the current page. */
  #restoreFolders() {
    for (const btn of this.querySelectorAll<HTMLButtonElement>('button.tree-twisty')) {
      if (collapsed.has(btn.dataset.folder!)) this.#setFolder(btn, false);
    }
    let list = this.querySelector('.tree-link[aria-current="page"]')?.closest('.tree-list');
    while (list) {
      const btn = list.previousElementSibling?.querySelector<HTMLButtonElement>('button.tree-twisty');
      if (btn) this.#setFolder(btn, true);
      list = list.parentElement?.closest('.tree-list');
    }
  }

  #setFolder(btn: HTMLButtonElement, open: boolean) {
    btn.setAttribute('aria-expanded', String(open));
    const group = btn.closest('.tree-row')?.nextElementSibling as HTMLElement | null;
    if (group) group.hidden = !open;
  }

  #onClick = (e: MouseEvent) => {
    const t = e.target as Element;
    // A background window's buttons just bring it forward (wm.ts handles that).
    if (!this.#isPage) return;

    const tool = t.closest<HTMLElement>('[data-explorer]');
    if (tool) {
      const action = tool.dataset.explorer;
      if (action === 'home') refocus = 'home'; // a plain link; the router takes it
      else if (action === 'tree') this.#toggleTree();
      else if (action === 'back') step(-1);
      else if (action === 'forward') step(1);
      return;
    }

    const twisty = t.closest<HTMLButtonElement>('button.tree-twisty');
    if (twisty) {
      const open = twisty.getAttribute('aria-expanded') !== 'true';
      this.#setFolder(twisty, open);
      if (open) collapsed.delete(twisty.dataset.folder!);
      else collapsed.add(twisty.dataset.folder!);
      save(COLLAPSED, [...collapsed]);
      return;
    }

    const link = t.closest<HTMLAnchorElement>('.tree-link');
    if (link) {
      if (!link.target && !link.hasAttribute('download')) refocus = 'tree';
      return;
    }

    // A tap on the contents closes the drawer.
    if (t.closest('.explorer-pane')) this.#closeDrawer(false);
  };

  #onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.classList.contains('is-tree-open')) {
      e.stopPropagation();
      this.#closeDrawer(true);
    }
  };
}

/** After each navigation: record the page the explorer window now shows. */
function refresh() {
  const ex = document.querySelector<WinExplorer>('#windows win-explorer');
  const app = ex?.closest<HTMLElement>('win-window')?.dataset.app;
  if (!ex || !app) { pending = null; refocus = null; return; }
  record(app);
  ex.syncHistory();
  ex.restoreTreeScroll(treeScroll);
  if (refocus) { ex.focusAfterNavigation(refocus); refocus = null; }
}

if (!customElements.get('win-explorer')) customElements.define('win-explorer', WinExplorer);
document.addEventListener('astro:before-swap', () => {
  const tree = document.querySelector('#windows win-explorer .explorer-tree');
  if (tree) treeScroll = tree.scrollTop;
});
document.addEventListener('astro:after-swap', refresh);
document.addEventListener('wm:close', (e) => {
  if ((e as CustomEvent<{ app: string }>).detail.app !== trail.app) return;
  trail = { app: '', urls: [], i: -1 };
  save(TRAIL, trail);
});
refresh();
