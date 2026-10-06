// Desktop shell behavior: Start menu keyboard support, desktop icon
// selection, the tray (sound toggle, clock) and the Shut Down dialogs.
// The shell sits in the persistent #desktop, so this runs once per full load.
//
// Without JavaScript the Start menu still opens: it is a popover the Start
// button controls declaratively, so the browser handles open, outside click
// and Esc. Submenus then open on hover or focus.

import { navigate } from 'astro:transitions/client';
import { isSoundOn, setSound } from './settings';
import { closeAll } from './wm';

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

// --- Start menu --------------------------------------------------------------

const startBtn = byId<HTMLButtonElement>('start-button');
const menu = byId<HTMLElement>('start-menu');
let leaving = false;

const itemsOf = (list: Element) =>
  [...list.children].map((li) => li.querySelector<HTMLElement>(':scope > .start-item')).filter((x): x is HTMLElement => !!x);

function setSub(btn: HTMLElement, open: boolean) {
  btn.setAttribute('aria-expanded', String(open));
}
function collapseAll(except?: Element | null) {
  menu?.querySelectorAll<HTMLElement>('.has-sub > [aria-expanded="true"]').forEach((b) => { if (b !== except) setSub(b, false); });
}
function closeMenu(focusStart: boolean) {
  if (!menu?.matches(':popover-open')) return;
  menu.hidePopover();
  if (focusStart) startBtn?.focus();
}

if (startBtn && menu) {
  menu.dataset.enhanced = '';

  menu.addEventListener('toggle', (e) => {
    const open = (e as ToggleEvent).newState === 'open';
    startBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      leaving = false;
      itemsOf(menu.querySelector('.start-list')!)[0]?.focus();
    } else {
      collapseAll();
      const a = document.activeElement;
      if (!leaving && (!a || a === document.body || menu.contains(a))) startBtn.focus();
    }
  });

  menu.addEventListener('click', (e) => {
    const t = e.target as Element;
    const sub = t.closest<HTMLElement>('.has-sub > .start-item');
    if (sub) {
      const open = sub.getAttribute('aria-expanded') !== 'true';
      collapseAll(sub);
      setSub(sub, open);
      return;
    }
    if (t.closest('a')) { leaving = true; menu.hidePopover(); }
  });

  // Pointing at another top-level entry closes a submenu opened by keyboard.
  menu.addEventListener('pointerover', (e) => {
    const li = (e.target as Element).closest('.start-list > li');
    if (li) collapseAll(li.querySelector(':scope > .start-item'));
  });

  menu.addEventListener('keydown', (e) => {
    const item = (e.target as Element).closest<HTMLElement>('.start-item');
    if (!item) return;
    const list = item.closest('ul')!;
    const items = itemsOf(list);
    const i = items.indexOf(item);
    const inSub = list.classList.contains('start-sub');
    const parentBtn = inSub ? list.parentElement?.querySelector<HTMLElement>(':scope > .start-item') : null;
    const isSubBtn = item.parentElement?.classList.contains('has-sub');
    let handled = true;
    switch (e.key) {
      case 'ArrowDown': items[(i + 1) % items.length]?.focus(); break;
      case 'ArrowUp': items[(i - 1 + items.length) % items.length]?.focus(); break;
      case 'Home': items[0]?.focus(); break;
      case 'End': items[items.length - 1]?.focus(); break;
      case 'ArrowRight':
        if (isSubBtn) {
          collapseAll(item);
          setSub(item, true);
          itemsOf(item.nextElementSibling!)[0]?.focus();
        }
        break;
      case 'ArrowLeft':
        if (parentBtn) { setSub(parentBtn, false); parentBtn.focus(); }
        break;
      case 'Escape':
        if (parentBtn) { setSub(parentBtn, false); parentBtn.focus(); }
        else closeMenu(true);
        break;
      default: handled = false;
    }
    if (handled) { e.preventDefault(); e.stopPropagation(); }
  });

  document.addEventListener('astro:before-preparation', () => { leaving = true; closeMenu(false); });
}

// --- Desktop icons -----------------------------------------------------------
// Mouse: one click selects, a double click opens. Touch and keyboard (Enter on
// the link) open right away, which is just the link doing its job.

const icons = document.querySelector<HTMLElement>('.desk-icons');
let pointerType = '';
if (icons) {
  const select = (a: Element | null) =>
    icons.querySelectorAll('.desk-icon').forEach((el) => el.classList.toggle('is-selected', el === a));
  icons.addEventListener('pointerdown', (e) => { pointerType = e.pointerType; });
  icons.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('.desk-icon');
    if (!a) { select(null); return; }
    if (e.detail === 0 || pointerType !== 'mouse' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    select(a);
    a.focus();
    if (e.detail >= 2) { select(null); navigate(a.href); }
  });
}

// --- Tray --------------------------------------------------------------------

const sound = byId<HTMLButtonElement>('tray-sound');
if (sound) {
  const paint = () => {
    const on = isSoundOn();
    sound.setAttribute('aria-pressed', String(on));
    sound.title = on ? 'Sound is on' : 'Sound is off';
  };
  paint();
  sound.addEventListener('click', () => setSound(!isSoundOn()));
  addEventListener('sound-change', paint);
  addEventListener('storage', (e) => { if (e.key === 'sound') paint(); });
}

const clock = byId<HTMLTimeElement>('tray-clock');
if (clock) {
  const tick = () => {
    const d = new Date();
    clock.textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    clock.dateTime = d.toISOString();
    clock.title = d.toLocaleDateString([], { dateStyle: 'full' });
  };
  tick();
  setTimeout(() => { tick(); setInterval(tick, 60_000); }, 60_000 - (Date.now() % 60_000));
}

// --- Shut Down ---------------------------------------------------------------

const dialog = byId<HTMLDialogElement>('shutdown-dialog');
const safeOff = byId<HTMLDialogElement>('safe-off');

document.addEventListener('click', (e) => {
  const t = e.target as Element;
  if (t.closest('[data-shutdown]') && dialog) {
    leaving = true;
    menu?.hidePopover();
    dialog.returnValue = '';
    dialog.showModal();
  } else if (t.closest('[data-dialog-cancel]')) {
    t.closest('dialog')?.close('cancel');
  } else if (t.closest('[data-power-on]')) {
    safeOff?.close();
  }
});

dialog?.addEventListener('close', () => {
  const choice = dialog.returnValue === 'ok'
    ? dialog.querySelector<HTMLInputElement>('input[name="shutdown"]:checked')?.value
    : null;
  dialog.returnValue = '';
  if (choice === 'off' && safeOff) {
    safeOff.showModal();
  } else if (choice === 'restart') {
    try { localStorage.removeItem('booted'); } catch { /* boot shows anyway */ }
    location.reload();
  } else if (choice === 'logoff') {
    closeAll();
  } else {
    startBtn?.focus();
  }
});

safeOff?.addEventListener('close', () => startBtn?.focus());
