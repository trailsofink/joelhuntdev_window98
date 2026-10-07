// Keeps the pixel font on whole pixels.
//
// "Pixelated MS Sans Serif" is drawn for exact pixel positions. Centered text
// whose width or height has the wrong parity for its box (an odd-width label
// under an icon, 12px text in a 33px taskbar button, a list below a document
// with fractional line heights) starts on a half pixel, and the browser smooths
// it across two pixels. This nudges each such element back with the
// `translate` property, which moves what is painted without changing layout.
// It runs again after anything that can move text: a navigation, a resize,
// fonts loading, or a click or keypress (menus, the folder tree, games).

const CHROME = 'Pixelated';
const NUDGED = 'data-snap';
const fontOf = new WeakMap<Element, boolean>();

function isChrome(el: Element) {
  let v = fontOf.get(el);
  if (v === undefined) {
    v = getComputedStyle(el).fontFamily.includes(CHROME);
    fontOf.set(el, v);
  }
  return v;
}

const off = (v: number) => v - Math.round(v);

function snap() {
  const seen = new Set<HTMLElement>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || seen.has(el) || !n.textContent?.trim()) continue;
    seen.add(el);
    if (!isChrome(el)) continue;
    // translate does nothing on inline boxes; leave alone anything already
    // moved by its own styles.
    const cs = getComputedStyle(el);
    if (cs.display === 'inline') continue;
    if (!el.hasAttribute(NUDGED) && cs.translate !== 'none') continue;
    range.selectNodeContents(n);
    const r = range.getClientRects()[0];
    if (!r || !r.width) continue;
    const dx = off(r.x);
    const dy = off(r.y);
    if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) continue;
    const [x0 = 0, y0 = 0] = (el.getAttribute(NUDGED) ?? '').split(' ').map(Number);
    const x = +(x0 - dx).toFixed(3) % 1;
    const y = +(y0 - dy).toFixed(3) % 1;
    el.setAttribute(NUDGED, `${x} ${y}`);
    el.style.translate = `${x}px ${y}px`;
  }
}

let frame = 0;
function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => { frame = 0; snap(); });
  });
}

document.fonts.ready.then(schedule);
schedule();
addEventListener('resize', schedule);
document.addEventListener('astro:after-swap', schedule);
document.addEventListener('click', schedule, true);
document.addEventListener('keyup', schedule, true);
document.addEventListener('scroll', schedule, true);
