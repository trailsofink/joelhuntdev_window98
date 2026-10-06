// Visitor settings shared by the tray, the Control Panel and the boot screen.
// Storage can throw (private mode, blocked site data), so every access is
// guarded and the defaults hold: sound off, theme from the browser.

export type ThemeChoice = 'light' | 'dark' | 'browser';

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* setting just won't persist */ }
}

export function getThemeChoice(): ThemeChoice {
  const t = read('theme');
  return t === 'light' || t === 'dark' ? t : 'browser';
}

export function setThemeChoice(choice: ThemeChoice) {
  write('theme', choice === 'browser' ? null : choice);
  const resolved = choice === 'browser'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : choice;
  document.documentElement.dataset.theme = resolved;
}

export function isSoundOn(): boolean {
  return read('sound') === 'on';
}

/** Saves the sound setting and tells every listener: `sound-change` on window, detail `{ on }`. */
export function setSound(on: boolean) {
  write('sound', on ? 'on' : 'off');
  window.dispatchEvent(new CustomEvent('sound-change', { detail: { on } }));
}
