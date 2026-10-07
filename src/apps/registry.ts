// Every window the desktop can open. This is the single source for desktop
// icons, the Start menu, taskbar labels and window defaults, so pages, the
// shell and the games all read from here rather than repeating titles or
// routes. Add an app here before building its page.

export type AppKind = 'explorer' | 'document' | 'game' | 'mail' | 'settings' | 'dialog';

export type StartGroup = 'top' | 'programs' | 'games' | 'settings';

export interface AppDef {
  id: string;
  /** Title-bar text. Documents append " - WordPad" etc. themselves. */
  title: string;
  /** Short label under the desktop icon and in the Start menu. */
  label: string;
  route: string;
  /** Icon file in src/assets/icons, without extension. */
  icon: string;
  kind: AppKind;
  desktop: boolean;
  start: StartGroup | null;
  /** Default window size on screens wider than 768px. Phones always maximize. */
  size: { width: number; height: number };
  resizable: boolean;
  /** Opens as a folder inside another app's window instead of its own. */
  opensIn?: string;
}

export const apps = [
  {
    id: 'about', title: 'About Me', label: 'About Me', route: '/',
    icon: 'my-computer', kind: 'explorer', desktop: true, start: 'top',
    size: { width: 860, height: 640 }, resizable: true,
  },
  {
    id: 'resume', title: 'Resume.doc - WordPad', label: 'Resume.doc', route: '/resume',
    icon: 'wordpad-doc', kind: 'document', desktop: true, start: 'top',
    size: { width: 720, height: 600 }, resizable: true,
  },
  {
    id: 'projects', title: 'Projects', label: 'Projects', route: '/projects',
    icon: 'folder', kind: 'explorer', desktop: true, start: 'programs',
    size: { width: 640, height: 460 }, resizable: true, opensIn: 'about',
  },
  {
    id: 'experience', title: 'Work Experience', label: 'Work Experience', route: '/experience',
    icon: 'folder', kind: 'explorer', desktop: false, start: 'programs',
    size: { width: 640, height: 460 }, resizable: true, opensIn: 'about',
  },
  {
    id: 'contact', title: 'New Message - Outlook Express', label: 'Outlook Express', route: '/contact',
    icon: 'outlook', kind: 'mail', desktop: true, start: 'programs',
    size: { width: 560, height: 420 }, resizable: true,
  },
  {
    id: 'control-panel', title: 'Control Panel', label: 'Control Panel', route: '/control-panel',
    icon: 'control-panel', kind: 'settings', desktop: false, start: 'settings',
    size: { width: 600, height: 480 }, resizable: true,
  },
  {
    id: 'minesweeper', title: 'Minesweeper', label: 'Minesweeper', route: '/games/minesweeper',
    icon: 'minesweeper', kind: 'game', desktop: true, start: 'games',
    size: { width: 0, height: 0 }, resizable: false,
  },
  {
    id: 'solitaire', title: 'Solitaire', label: 'Solitaire', route: '/games/solitaire',
    icon: 'solitaire', kind: 'game', desktop: true, start: 'games',
    size: { width: 760, height: 560 }, resizable: true,
  },
  {
    id: 'recycle-bin', title: 'Recycle Bin', label: 'Recycle Bin', route: '/recycle-bin',
    icon: 'recycle-bin', kind: 'explorer', desktop: true, start: null,
    size: { width: 520, height: 380 }, resizable: true,
  },
] as const satisfies readonly AppDef[];

export type AppId = (typeof apps)[number]['id'];

export function getApp(id: AppId): AppDef {
  const app = apps.find((a) => a.id === id);
  if (!app) throw new Error(`Unknown app: ${id}`);
  return app;
}
