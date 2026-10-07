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
- **Type.** `--font-chrome` (pixel font) is for chrome only: title bars, menus, buttons, taskbar, labels. Readable content (anything longer than a label) goes in a `.doc` pane in `--font-doc` at 16px or larger. `--font-crt` is for the boot screen. The pixel font blurs on half pixels: keep window geometry and line heights in whole pixels, and `src/scripts/pixel-snap.ts` nudges any pixel-font text that still lands between pixels (it can't move inline boxes, so give a wrapped label's words their own inline-block spans).
- **Accessibility.**
  - Every interactive element is reachable by keyboard and shows the amber `:focus-visible` ring.
  - Use real `<button>` and `<a>` elements.
  - Touch targets are at least 44px on coarse pointers (`@media (pointer: coarse)`).
  - Respect `prefers-reduced-motion`.
  - Each page has exactly one `<h1>`; the window title is that heading.
- **Copy.** Plain, specific, active voice. Name things the way a visitor would.
- **Lord of the Rings jokes stay in their agreed places:** the boot screen ("One does not simply walk into production. Booting anyway."), the 404 page ("You shall not pass"), Shut Down ("Not all those who wander are lost.") and the Recycle Bin (`my_precious_cypress_suite.bak`). Nowhere else.
- **Privacy.** No phone number on the site. Bulqit screenshots must have the seed address (1244 Rothesay Cir) and the street-view house photo blurred. Security work is described by category only ("authorization flaw on vendor payouts"); never include endpoint paths, reproduction steps, or findings that were still unresolved.
- **Raw assets.** Source screenshots, Figma exports and the script that publishes them (`optimize-screens.mjs`) live outside this repo in `~/workspaces/portfolio-assets/`. Its optimized WebP output is committed here in `src/assets/screens/`; never commit raw captures.

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
  - Closing the last open window leaves an empty desktop. Its URL is `/`, but the About Me window stays closed until it is opened again.
- **About Me is the file explorer.** The home folder, Projects, Work Experience, every case study and role, and Credits.txt all render in the About Me window (`app="about"`, `<Explorer nav>`), so moving between them swaps that one window's contents. Registry entries with `opensIn: 'about'` (Projects, Work Experience) are shortcuts to folders in it and get no taskbar button of their own. The Explorer toolbar has:
  - the Folders button (hamburger), which shows or hides the folder tree. On wide windows the tree is a left column and the choice is remembered (`localStorage.tree`, applied as `html[data-tree]` by the head script). On narrow windows it is a full-width drawer that starts closed, with the +/- buttons on the right and a shallow indent.
  - Home, a link to `C:\Joel Hunt\` (`/`).
  - Back and Forward, which step through the window's own history (`src/scripts/explorer.ts`). Closing the window resets it.

  The tree is built from the content collections in `src/components/explorer/tree.ts`. Resume.doc and Email Joel still open their own programs.
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
