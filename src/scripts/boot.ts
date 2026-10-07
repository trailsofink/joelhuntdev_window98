// Drives the first-visit boot overlay (src/components/boot/BootScreen.astro).
// CSS animation delays own the timeline, so it finishes on time even when the
// main thread is busy; this script ticks the counters, handles skip and the
// sound offer, and removes the overlay when the fade ends.
import { playSound, setSound, soundOn } from './sound';

const root = document.documentElement;
const boot = document.getElementById('boot');

if (boot && 'boot' in root.dataset) run(boot);
else boot?.remove();

// After a client-side navigation the new page brings its own (hidden) overlay.
document.addEventListener('astro:after-swap', () => {
  if (!('boot' in root.dataset)) document.getElementById('boot')?.remove();
});

function run(el: HTMLElement) {
  const $ = <T extends Element>(s: string) => el.querySelector<T>(s);
  const skipBtn = $<HTMLButtonElement>('.boot-skip')!;
  const offer = $<HTMLElement>('.boot-offer')!;
  const state = $<HTMLElement>('.boot-sound-state')!;
  const soundBtns = [...el.querySelectorAll<HTMLButtonElement>('[data-sound]')];
  const counters = [...el.querySelectorAll<HTMLElement>('[data-count]')];

  // Keep the desktop out of the tab order and away from screen readers.
  const behind = [...document.body.children].filter(
    (n): n is HTMLElement => n instanceof HTMLElement && n !== el && !n.inert && n.tagName !== 'SCRIPT',
  );
  behind.forEach((n) => (n.inert = true));
  el.focus({ preventScroll: true });

  // Times are relative to when the overlay's CSS timeline started.
  const anim = el.getAnimations()[0];
  const t0 = Number(anim?.startTime ?? document.timeline.currentTime ?? 0);

  let ended = false;
  let skipping = false;
  let splash = false;
  let chimed = false;
  let offerOpen = true;
  let wantSound = false;

  const chime = () => {
    if (wantSound && !chimed) {
      chimed = true;
      playSound('startup');
    }
  };

  const tick = (now: number) => {
    let pending = false;
    for (const c of counters) {
      const to = Number(c.dataset.count);
      const from = Number(c.dataset.from);
      const until = Number(c.dataset.until);
      const p = Math.min(1, Math.max(0, (now - t0 - from) / (until - from)));
      c.textContent = String(Math.round(to * p)).padStart(String(to).length, ' ');
      if (p < 1) pending = true;
    }
    if (pending && !ended && !skipping) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const skip = () => {
    if (ended || skipping) return;
    skipping = true;
    counters.forEach((c) => (c.textContent = c.dataset.count ?? ''));
    chime();
    el.classList.add('is-skipping');
  };

  const choose = (on: boolean) => {
    wantSound = on;
    setSound(on);
    soundBtns.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.sound === 'on') === on)));
    state.textContent = on ? 'Sound on' : 'Sound off';
    if (splash) chime();
  };

  const finish = () => {
    if (ended) return;
    ended = true;
    try {
      localStorage.setItem('booted', '1');
    } catch {}
    removeEventListener('keydown', onKey, true);
    el.setAttribute('aria-hidden', 'true');
    const hadFocus = el.contains(document.activeElement);
    behind.forEach((n) => (n.inert = false));
    delete root.dataset.boot;
    el.remove();
    if (hadFocus) (document.activeElement as HTMLElement | null)?.blur?.();
  };

  function onKey(e: KeyboardEvent) {
    if (['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
    const k = e.key.toLowerCase();
    if (offerOpen && !e.ctrlKey && !e.metaKey && (k === 'y' || k === 'n')) {
      e.preventDefault();
      choose(k === 'y');
      return;
    }
    // Enter/Space on a focused button activates it instead of skipping.
    if ((k === 'enter' || k === ' ') && e.target instanceof Element && e.target.closest('.boot button')) return;
    e.preventDefault();
    skip();
  }
  addEventListener('keydown', onKey, true);

  el.addEventListener('pointerdown', (e) => {
    if (!(e.target instanceof Element && e.target.closest('[data-sound]'))) skip();
  });
  skipBtn.addEventListener('click', skip);
  soundBtns.forEach((b) => b.addEventListener('click', () => choose(b.dataset.sound === 'on')));

  // A replay (Restart from Shut Down) starts from the choice already saved on
  // this device instead of asking from scratch.
  let saved: string | null = null;
  try { saved = localStorage.getItem('sound'); } catch {}
  if (saved === 'on' || saved === 'off') {
    wantSound = soundOn();
    soundBtns.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.sound === 'on') === wantSound)));
    state.textContent = wantSound ? 'Sound on' : 'Sound off';
  }

  el.addEventListener('animationstart', (e) => {
    if (e.animationName === 'boot-splash') {
      splash = true;
      chime();
    }
  });
  el.addEventListener('animationend', (e) => {
    if (e.target === el) return finish();
    if (e.target === offer) {
      offerOpen = false;
      if (offer.contains(document.activeElement)) skipBtn.focus();
    }
  });
}
