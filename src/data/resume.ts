// The phone number on the PDF is left out: it stays off the public site.
// Experience ids link each role to its page in Work Experience.

export const resume = {
  summary:
    'Product engineer bridging design and code, with six years of experience building and launching web products from concept to production; most recently, as an engineering lead at an early-stage startup through a redesign and public launch. Specialize in React and Next.js, design systems, accessibility, performance, and robust test/CI infrastructure. Developed an AI-agent workflow with automated tests to verify agent-written code.',
  skills: [
    ['Frontend', 'React, Next.js, Tailwind CSS 4, Bootstrap 5, Radix UI / shadcn/ui, Redux Toolkit, Storybook'],
    ['Design Systems & UX', 'Figma, design systems and design tokens, WCAG 2.1 accessibility, responsive design, usability testing, prototyping'],
    ['Backend & Data', 'Node.js, REST APIs, PostgreSQL, Drizzle ORM, Temporal workflows, Stripe, Clerk auth, Ruby on Rails, Sanity CMS, Algolia, Kirby CMS, Magento 2, Moodle / Totara'],
    ['Cloud & DevOps', 'Vercel, Fly.io, Docker, CI/CD with GitHub Actions, Neon, Turborepo, Twilio, SendGrid'],
    ['Testing & Quality', 'Playwright, Vitest, Testing Library, Cypress, Sentry, Lighthouse'],
    ['Practices', 'Agile, Linear, Jira, code review, AI-assisted development, technical documentation'],
  ],
  recent: {
    experience: 'bulqit',
    role: 'Director of Product Engineering',
    company: 'Bulqit',
    dates: 'May 2026 – Oct 2026',
    context:
      'Engineering lead at a home-services marketplace, owning the codebase after an agency handoff through soft launch (Jul 2026) and public launch (Aug 2026); company closed Oct 2026.',
    bullets: [
      'Redesigned the product pre-launch, implementing a unified Figma design system across the vendor app, member app, and marketing site: 45 routes in five weeks, to WCAG 2.1 and responsive standards.',
      'Implemented a Figma-based design system across 619 files by merging four competing type systems into a unified, cohesive system, removed redundant, conflicting, and outdated styling frameworks, and upgraded to Tailwind CSS 4 with no visual regressions.',
      'Rebuilt core vendor and member workflows and shipped guided onboarding (75% self-service activation/compliance). Built a customer migration flow and automated email-driven reporting pipeline for a partner integration.',
      'Drove performance and accessibility improvements across 12 public pages; Mobile Performance rose from 53 to 86-100 across marketing pages, Total Blocking Time fell from 17.2 s to 0.2 s, and page weight fell from 5.7 MB to 1.7 MB. Every page now scores 91+ for Accessibility and 100 for SEO.',
      'Stabilized an inherited codebase (checkout, coupons, SMS masking, email delivery); led recovery through launch and caught billing defects before release, achieving zero errors in production payments and recurring services.',
      'Directed launch QA with persona-based test cases and coordinated internal/external testers, achieving zero downtime on core web systems. Replaced inadequate E2E tests with a Playwright suite (113 full user-role coverage tests, CI integration).',
      'Led an AI-assisted security audit and development workflow, closing critical authorization flaws, with each fix validated by CI guard tests. Wrote 23 of the repository’s 39 CI guard tests and the team’s engineering handbook so agent-written code was verified by tests, not only review.',
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
