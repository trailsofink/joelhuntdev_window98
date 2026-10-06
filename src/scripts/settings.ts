// Theme setting shared by the head script's rules and the Control Panel.
// Sound lives in src/scripts/sound.ts.
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
