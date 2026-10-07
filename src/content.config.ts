import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One Markdown file per role. These become the files in About Me > Work
// Experience and the sections of Resume.doc.
const experience = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/experience' }),
  schema: z.object({
    company: z.string(),
    file: z.string().optional(), // file name in Work Experience, if not the company's ("Five_Q")
    role: z.string(),
    start: z.string(), // "May 2026", as printed on the resume
    end: z.string(),
    location: z.string().optional(),
    blurb: z.string(), // one line under the role
    order: z.number(), // 1 = most recent
  }),
});

// Case studies, grouped into project folders (bulqit, fiveq). The file path
// gives the slug: src/content/projects/bulqit/lighthouse.md -> /projects/bulqit/lighthouse
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      folder: z.enum(['bulqit', 'fiveq']),
      summary: z.string(), // shown in Explorer's details pane and meta description
      order: z.number(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      // Facts that appear in the window's status bar, e.g. "113 tests".
      stats: z.array(z.string()).max(3).default([]),
      links: z.array(z.object({ label: z.string(), href: z.string().url() })).default([]),
    }),
});

export const collections = { experience, projects };
