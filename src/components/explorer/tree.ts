// The folder tree in the About Me window's left pane: every folder and file a
// visitor can open from C:\Joel Hunt\, built from the content collections so
// a new case study or role shows up without touching this file.
import { getCollection } from 'astro:content';
import { folders, folderIds } from '../content/folders';
import { profile } from '../../data/profile';

export interface TreeNode {
  label: string;
  href: string;
  icon: string;
  /** Adds the download attribute with this file name. */
  download?: string;
  /** Opens in a new tab. */
  external?: boolean;
  children?: TreeNode[];
}

const byOrder = (a: { data: { order: number } }, b: { data: { order: number } }) => a.data.order - b.data.order;

export async function getTree(): Promise<TreeNode> {
  const studies = (await getCollection('projects')).sort(byOrder);
  const roles = (await getCollection('experience')).sort(byOrder);
  const link = (id: string) => profile.links.find((l) => l.id === id)!;

  return {
    label: 'C:\\Joel Hunt',
    href: '/',
    icon: 'my-computer',
    children: [
      {
        label: 'Projects',
        href: '/projects',
        icon: 'folder',
        children: folderIds.map((id) => ({
          label: folders[id].name,
          href: `/projects/${id}`,
          icon: 'folder',
          children: studies
            .filter((s) => s.data.folder === id)
            .map((s) => ({ label: `${s.data.title}.doc`, href: `/projects/${s.id}`, icon: 'wordpad-doc' })),
        })),
      },
      {
        label: 'Work Experience',
        href: '/experience',
        icon: 'folder',
        children: roles.map((r) => ({ label: `${r.data.company}.doc`, href: `/experience/${r.id}`, icon: 'wordpad-doc' })),
      },
      { label: 'Resume.doc', href: '/resume', icon: 'wordpad-doc' },
      { label: 'Joel_Hunt_Resume.pdf', href: profile.resumePdf, icon: 'pdf', download: 'Joel_Hunt_Resume.pdf' },
      { label: 'Email Joel', href: '/contact', icon: 'mail' },
      { label: 'LinkedIn', href: link('linkedin').href, icon: 'linkedin', external: true },
      { label: 'GitHub', href: link('github').href, icon: 'github', external: true },
      { label: 'Credits.txt', href: '/credits', icon: 'text-doc' },
    ],
  };
}
