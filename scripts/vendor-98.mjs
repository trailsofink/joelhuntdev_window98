// Builds src/styles/vendor/98.css from the 98.css source stylesheet.
//
// The published dist/98.css has every color baked in as a hex value, so it
// cannot be themed. This keeps the source's custom properties, drops its color
// values (src/styles/tokens.css owns them), and inlines each icon as a data URI.
// Data URIs cannot read CSS variables, so every icon is recolored once per theme
// and the dark set is emitted as overrides under :root[data-theme="dark"].
//
// Run with `pnpm vendor:98` after upgrading the 98.css package.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = join(root, 'node_modules/98.css');
const outDir = join(root, 'src/styles/vendor');

// Source icon colors, grouped by the role they play in the bevel.
const ROLE_OF = {
  black: 'ink', '#000': 'ink', '#000000': 'ink',
  '#0a0a0a': 'frame',
  '#808080': 'shadow', grey: 'shadow', gray: 'shadow', '#87888f': 'shadow',
  white: 'highlight', '#fff': 'highlight', '#ffffff': 'highlight',
  '#dfdfdf': 'face',
  '#c0c0c0': 'surface', '#c0c7c8': 'surface',
};

// Icons that draw bevel lines, where black is the frame rather than a glyph.
const BORDER_ICONS = new Set([
  'groupbox-border.svg', 'sunken-panel-border.svg',
  'radio-border.svg', 'radio-border-disabled.svg',
]);

// Must stay in step with the matching tokens in src/styles/tokens.css.
const THEMES = {
  light: {
    ink: '#0f172a', frame: '#0f172a', shadow: '#7a8394',
    highlight: '#ffffff', face: '#dde2ea', surface: '#c3c9d3',
  },
  dark: {
    ink: '#e2e8f0', frame: '#03060d', shadow: '#111a2c',
    highlight: '#50617f', face: '#33425c', surface: '#253248',
  },
};

// Color variables 98.css declares on :root that tokens.css now owns.
const OWNED_VARS = new Set([
  '--text-color', '--surface', '--button-highlight', '--button-face',
  '--button-shadow', '--window-frame', '--dialog-blue', '--dialog-blue-light',
  '--dialog-gray', '--dialog-gray-light', '--link-blue',
]);

function recolor(file, theme) {
  const svg = readFileSync(join(pkg, 'icon', file), 'utf8');
  const palette = THEMES[theme];
  // Arrow buttons (scrollbars, selects) draw their outer bottom-right bevel in
  // black before the black arrow; that edge is frame, not ink, or the button
  // looks pressed in the dark theme.
  let blackSeen = 0;
  return svg.replace(/(fill|stroke)="([^"]+)"/g, (match, attr, value) => {
    let role = ROLE_OF[value.toLowerCase()];
    if (!role) return match;
    if (role === 'ink' && BORDER_ICONS.has(file)) role = 'frame';
    if (role === 'ink' && /^button-/.test(file) && blackSeen++ === 0) role = 'frame';
    return `${attr}="${palette[role]}"`;
  });
}

function dataUri(svg) {
  const compact = svg.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
  return `url("data:image/svg+xml,${encodeURIComponent(compact)}")`;
}

const source = readFileSync(join(pkg, 'style.css'), 'utf8');
const ast = postcss.parse(source);
const darkRules = [];
// Scrollbar parts: Chrome ignores ::-webkit-scrollbar-* rules that start with
// an ancestor selector, so `:root[data-theme="dark"] ::-webkit-scrollbar-button`
// never applies. Their icons go through custom properties instead, which the
// scrollbar inherits from its element; the theme switches the variables.
const scrollbarVars = { light: [], dark: [] };

ast.walkDecls((decl) => {
  if (decl.parent.type === 'rule' && decl.parent.selector === ':root' && OWNED_VARS.has(decl.prop)) {
    decl.remove();
    return;
  }
  const match = decl.value.match(/svg-load\("\.\/icon\/([^"]+)"\)/);
  if (!match) return;
  const file = match[1];
  const light = decl.value.replace(match[0], dataUri(recolor(file, 'light')));
  const dark = decl.value.replace(match[0], dataUri(recolor(file, 'dark')));
  decl.value = light;

  if (decl.parent.selector.includes('::-webkit-scrollbar')) {
    const name = `--sb-${scrollbarVars.light.length + 1}`;
    scrollbarVars.light.push(`  ${name}: ${light};`);
    scrollbarVars.dark.push(`  ${name}: ${dark};`);
    decl.value = `var(${name})`;
    return;
  }

  const scoped = decl.parent.selectors
    .map((s) => `:root[data-theme="dark"] ${s}`)
    .join(',\n');
  darkRules.push(`${scoped} {\n  ${decl.prop}: ${dark};\n}`);
});

// Fonts are self-hosted from /fonts and preloaded by the layout. The source
// lists woff then woff2 as two src declarations, so only the second ever
// applied; keep woff2 alone and add font-display.
ast.walkAtRules('font-face', (rule) => {
  rule.walkDecls('src', (decl) => {
    if (decl.value.includes('.woff"')) decl.remove();
    else decl.value = decl.value.replace('fonts/converted/', '/fonts/');
  });
  rule.append({ prop: 'font-display', value: 'swap' });
});

// `@media (not(hover))` is not valid media query syntax and fails minification.
ast.walkAtRules('media', (rule) => {
  if (rule.params.replace(/\s/g, '') === '(not(hover))') rule.params = '(hover: none)';
});

const header = `/* Generated by scripts/vendor-98.mjs from 98.css (MIT, Jordan Scales).
   Do not edit by hand. Colors live in src/styles/tokens.css. */\n`;

mkdirSync(outDir, { recursive: true });
const scrollbarCss =
  `/* Scrollbar icons, switched by theme through variables */\n` +
  `:root {\n${scrollbarVars.light.join('\n')}\n}\n\n` +
  `:root[data-theme="dark"] {\n${scrollbarVars.dark.join('\n')}\n}\n`;
writeFileSync(
  join(outDir, '98.css'),
  `${header}${ast.toString()}\n\n/* Dark-theme icon set */\n${darkRules.join('\n\n')}\n\n${scrollbarCss}`,
);

// The pixel font is CC BY-SA 3.0 and must ship with its license files.
const fontsOut = join(root, 'public/fonts');
mkdirSync(fontsOut, { recursive: true });
for (const f of ['ms_sans_serif.woff2', 'ms_sans_serif_bold.woff2']) {
  copyFileSync(join(pkg, 'dist', f), join(fontsOut, f));
}
for (const f of ['license.txt', 'readme.txt']) {
  copyFileSync(join(pkg, 'fonts/src/ms-sans-serif', f), join(fontsOut, `ms_sans_serif_${f}`));
}

console.log(`98.css vendored: ${darkRules.length} icon overrides for dark theme`);
