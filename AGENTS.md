# joelhunt.dev: Windows 98 portfolio

Joel Hunt's portfolio, rebuilt as a mobile-first "Midnight 98" desktop. Astro 7, static output, hosted on Vercel. Every page is a real URL that server-renders one window, so content reads without JavaScript; scripts only upgrade it.

## Commands

- `pnpm dev`: dev server. In agent sessions run `pnpm astro dev --background`, then `astro dev stop|status|logs`.
- `pnpm build`: static build into `dist/`. It must pass before you commit.
- `pnpm check`: type-check `.astro` and `.ts`.
- `pnpm vendor:98`: regenerate `src/styles/vendor/98.css` from the 98.css package. Never edit that file by hand.

## Ground rules

- **Performance budget.** Lighthouse 95+ in every category, on mobile and desktop. The JS loaded on first view, before any window opens, stays under 30 KB gzipped in total. No UI frameworks (no React, Preact, Svelte or Vue); write vanilla TypeScript and custom elements. Games load their code only when their window opens (`import()` from inside the custom element's `connectedCallback`).
- **Colors come from tokens.** `src/styles/tokens.css` is the only place colors are defined. Don't write literal hex values in components; use the variables (`--surface`, `--button-face`, `--button-highlight`, `--button-shadow`, `--window-frame`, `--text-color`, `--dialog-blue`, `--dialog-blue-light`, `--doc-bg`, `--doc-ink`, `--doc-muted`, `--link-blue`, `--select-bg`, `--select-ink`, `--accent`, `--desktop`, `--desktop-ink`, `--crt-*`). Both themes switch through `html[data-theme="light"|"dark"]`.
- **Type.** `--font-chrome` (pixel font) is for chrome only: title bars, menus, buttons, taskbar, labels. Readable content (anything longer than a label) goes in a `.doc` pane in `--font-doc` at 16px or larger. `--font-crt` is for the boot screen.
- **Accessibility.**
  - Every interactive element is reachable by keyboard and shows the amber `:focus-visible` ring.
  - Use real `<button>` and `<a>` elements.
  - Touch targets are at least 44px on coarse pointers (`@media (pointer: coarse)`).
  - Respect `prefers-reduced-motion`.
  - Each page has exactly one `<h1>`; the window title is that heading.
- **Copy.** Plain, specific, active voice. Name things the way a visitor would.
- **Lord of the Rings jokes stay in their agreed places:** the boot screen ("One does not simply walk into production. Booting anyway."), the 404 page ("You shall not pass"), Shut Down ("Not all those who wander are lost.") and the Recycle Bin (`my_precious_cypress_suite.bak`). Nowhere else.
- **Privacy.** No phone number on the site. Bulqit screenshots must have the seed address (1244 Rothesay Cir) and the street-view house photo blurred. Security work is described by category only ("authorization flaw on vendor payouts"); never include endpoint paths, reproduction steps, or findings that were still unresolved.
- **Raw assets.** Private source screenshots and Figma exports live outside this repo, in `/home/joelhunt/workspaces/bulqit/portfolio-assets/` (`figma/`, `screens/`). `scripts/optimize-screens.mjs` reads from there; its optimized, publishable copies go in `src/assets/`.

## Architecture contract

These pieces are shared across work streams, so change them only deliberately:

- **`src/apps/registry.ts`** lists every app: id, title, label, route, icon, kind, desktop/Start-menu placement and default size. The shell, the taskbar, the Start menu and the pages all read from it. If you need a new app, add it here first.
- **`src/layouts/Desktop.astro`** wraps every page. Props are `title`, `description` and `app` (the registry id of the window the page renders). It mounts:
  - `<BootScreen />`
  - `<div id="desktop" transition:persist>` containing `<DesktopShell active>`, which holds the icons, taskbar and Start menu and survives navigation
  - `<main id="windows">` containing the page's single `<Window>`
- **`src/components/Window.astro`** renders `<win-window class="window" data-app data-kind>` with:
  - a title bar whose text is the page `<h1>`
  - the minimize, maximize and close controls (close is a plain link to `/`)
  - an optional menu bar and status bar
  - a body that becomes a sunken white document pane when `doc` is set

  The window manager in `src/scripts/wm.ts` upgrades `win-window` elements.
- **Window behavior.**
  - At 768px wide and below, every window is maximized above the taskbar and dragging is off.
  - Above 768px, windows open at their registry size, cascade, drag by the title bar, and raise on focus.
  - When the visitor moves to a new URL, already-open windows are kept and the new page's window comes to the front.
  - The taskbar lists open windows, and the active one matches the URL.
- **Theme.** The head script sets `html[data-theme]` from `localStorage.theme`, falling back to `prefers-color-scheme` and then to light. The Control Panel writes `localStorage.theme` and updates the attribute.
- **Boot.** It shows on the first visit only (`localStorage.booted`). Any key or tap skips it, and `prefers-reduced-motion` skips it entirely. The desktop HTML is already rendered underneath the boot overlay.
- **Sound.** Off by default. The boot screen offers to turn it on, and the speaker icon in the system tray toggles it (`localStorage.sound = "on"`). Audio files load only after sound is enabled.
- **Content.**
  - `src/content/experience/*.md` holds one file per role.
  - `src/content/projects/{bulqit,fiveq}/*.md` holds the case studies (schema in `src/content.config.ts`).
  - Profile, skills and education live in `src/data/profile.ts`.

## Credits to keep

- 98.css (MIT, Jordan Scales).
- The "Pixelated MS Sans Serif" font (CC BY-SA 3.0, by "lou"); its license files are in `public/fonts/`.
- Atkinson Hyperlegible Next and VT323 (OFL).

All of these are listed in the About Me credits file.
