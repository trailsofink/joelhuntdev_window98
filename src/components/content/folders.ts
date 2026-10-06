// The two project folders under About Me > Projects. Each folder page and
// every case study in it reads its context from here, so the "who/when"
// framing is written once.

export type FolderId = 'bulqit' | 'fiveq';

export interface FolderInfo {
  id: FolderId;
  name: string;
  /** One line under the folder name in the details pane. */
  tagline: string;
  /** Context shown at the top of every case study in the folder. */
  context: string;
  site?: { label: string; href: string };
  /** Matching role in Work Experience. */
  experience: string;
  description: string;
}

export const folders: Record<FolderId, FolderInfo> = {
  bulqit: {
    id: 'bulqit',
    name: 'Bulqit',
    tagline: 'Director of Product Engineering, May–Oct 2026',
    context:
      'Bulqit was a five-person home-services startup that wound down in October 2026. Joel was one of two in-house engineers.',
    site: { label: 'bulqit.com', href: 'https://bulqit.com' },
    experience: '/experience/bulqit',
    description:
      'Case studies from Bulqit, a home-services marketplace: rebuilding the front end, vendor activation, performance, testing, security and billing, and an AI-agent workflow.',
  },
  fiveq: {
    id: 'fiveq',
    name: 'FiveQ',
    tagline: 'Full Stack Developer (Contract), Apr 2025–May 2026',
    context:
      'Joel worked with FiveQ as a contract full-stack developer, building features for client websites on its Kirby CMS platform.',
    experience: '/experience/fiveq',
    description:
      'Case studies from FiveQ client work: Algolia search across several sites, and the live player and schedule for Life Changing Radio.',
  },
};

export const folderIds = Object.keys(folders) as FolderId[];
