// The phone number on the PDF is left out: it stays off the public site.
// Experience ids link each role to its page in Work Experience.

export const resume = {
  summary:
    'Product engineer working between design and code, with six years taking web products from Figma to production. Most recently led front-end engineering at an early-stage marketplace through its redesign and public launch. Strongest in React and Next.js, design systems, accessibility, performance, and the test and CI infrastructure that lets a small team ship safely.',
  skills: [
    ['Front End', 'React, Next.js (App Router, Server Components, Server Actions), TypeScript, Tailwind CSS, Radix UI / shadcn/ui, Storybook'],
    ['Design Systems & UX', 'Figma, design tokens, component libraries, WCAG 2.1 accessibility, responsive design, usability testing'],
    ['Back End & Data', 'Node.js, PostgreSQL, Drizzle ORM, REST APIs, Stripe, Ruby on Rails'],
    ['Testing & DevOps', 'Playwright, Vitest, Cypress, GitHub Actions CI, Vercel, Docker, Sentry, Lighthouse'],
    ['Also', 'JavaScript, PHP, SQL, HTML/CSS, WordPress, Kirby CMS, Magento 2, Moodle / Totara, Linear, Jira, Claude Code'],
  ],
  recent: {
    experience: 'bulqit',
    role: 'Director of Product Engineering',
    company: 'Bulqit',
    dates: 'May 2026 – Oct 2026',
    context:
      'Engineering lead at a five-person home-services marketplace, owning the codebase after an agency handoff through soft launch (Jul 2026) and public launch (Aug 2026); company closed Oct 2026.',
    bullets: [
      'Led the pre-launch redesign, building the lead designer’s Figma system in Next.js and React across the vendor app, member app and marketing site: 45 routes in five weeks, to WCAG 2.1 and fully responsive. Rebuilt vendor workflows and guided onboarding, and about 75% of vendor signups then completed compliance with no staff follow-up.',
      'Made Figma the source of truth for the front end: migrated 619 files to design tokens and unified four competing type systems into Figma text styles (728 files), enforced by a lint rule against hard-coded colors. Upgraded to Tailwind CSS 4 with no visual regressions.',
      'Led a Lighthouse performance and accessibility push across 12 public pages. On the vendor landing page, mobile Performance rose from 53 to 86, Total Blocking Time fell from 17.2 s to 0.2 s, and page weight fell from 5.7 MB to 1.7 MB. Every page now scores 91+ for Accessibility and 100 for SEO.',
      'Replaced a non-functional Cypress suite with 113 Playwright end-to-end tests covering seven user roles from signup to card payment, run in CI on every pull request, and closed authorization flaws found in a security audit, each backed by a CI guard test that fails if the gap returns.',
      'Built a partner integration so field techs could keep working in their existing software: each post-visit report automatically completes the job, charges the customer and delivers a branded report to the homeowner. Caught three billing defects before release, with zero billing errors in production.',
      'Built a parallel AI-agent development workflow (several coding agents in separate git worktrees) with automated guardrails: wrote 23 of the repository’s 39 CI guard tests and the team’s engineering handbook so agent-written code was verified by tests, not only review.',
    ],
  },
  earlier: {
    heading: 'Full Stack, Web Design & UX',
    dates: 'May 2020 – May 2026',
    roles: [
      {
        experience: 'fiveq',
        role: 'Full Stack Developer',
        company: 'Five Q',
        text: 'Built a reusable Algolia search plugin for in-house Kirby CMS platform, deployed to 3+ client sites, including a bespoke school-finder map serving 1,000+ records with sub-200 ms responses. Designed and built the live player and integrated program schedule for a regional broadcaster running six stations. Wrote a reusable audio and video player plugin with Google Analytics tracking, and set up a CI pipeline with Cypress automated tests.',
      },
      {
        experience: 'goodheart-willcox',
        role: 'Product Designer',
        company: 'Goodheart-Willcox',
        text: 'Rebuilt 25+ image-based accounting ledgers as accessible, interactive HTML tables for the G-W Ignite Accounting course, turning static figures into a quiz tool shipped to students in the LMS. Built prototypes for Ignite courses and supported the rollout of a new assessment tool in an Agile, Jira-tracked team.',
      },
      {
        experience: 'synergy-learning',
        role: 'UX Developer',
        company: 'Synergy Learning',
        text: 'Built and redesigned compliance-training portals on Moodle and Totara for enterprise clients. Refined designs through usability testing, wrote documentation and estimates, and explained web best practices to non-technical staff.',
      },
      {
        experience: 'visionworks-interactive',
        role: 'Web Designer',
        company: 'Visionworks Interactive',
        text: 'Designed and co-built the UI/UX redesign of a 15,000+ product Magento 2 e-commerce store, owning the design end to end and splitting implementation with one other developer. Managed server infrastructure for 40+ client WordPress sites and built responsive client websites.',
      },
      {
        experience: 'marketus-group',
        role: 'Web Designer',
        company: 'MarketUs Group',
        text: 'Designed and built responsive client websites across industries, covering design, animation, video, and pre-launch QA.',
      },
    ],
  },
} as const;
