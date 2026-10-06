// Facts about Joel used across windows, the boot screen and metadata.
// The phone number is deliberately absent: it stays off the public site.

export const profile = {
  name: 'Joel Hunt',
  title: 'Senior Full-Stack Engineer | UX Product Engineer',
  location: 'Chicago, IL',
  email: 'itsjoelhunt@gmail.com',
  summary:
    'Full-stack and UX product engineer with 6 years of experience taking web products from Figma to production. Most recently Director of Product Engineering at Bulqit, a home-services marketplace, where I was one of two in-house engineers: I took over a codebase inherited from a dismissed agency, rebuilt its front end, and took the platform through public launch.',
  // Two sentences for tight spaces such as the About Me details pane.
  shortSummary:
    'Full-stack and UX product engineer with 6 years of experience taking web products from Figma to production. Most recently Director of Product Engineering at Bulqit, a home-services marketplace, which I took through public launch.',
  resumePdf: '/Joel_Hunt_Resume.pdf',
  links: [
    { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/joel-hunt', handle: 'linkedin.com/in/joel-hunt' },
    { id: 'github', label: 'GitHub', href: 'https://github.com/trailsofink', handle: 'github.com/trailsofink' },
    { id: 'email', label: 'Email', href: 'mailto:itsjoelhunt@gmail.com', handle: 'itsjoelhunt@gmail.com' },
  ],
} as const;

// Grouped as on the resume. The Control Panel and the boot screen read these.
export const skills = {
  Languages: ['TypeScript', 'JavaScript (ES2023)', 'SQL', 'PHP', 'Ruby', 'HTML5', 'CSS3'],
  Frontend: ['React 19', 'Next.js 16 (App Router, Server Components, Server Actions)', 'Tailwind CSS 4', 'Bootstrap 5', 'Radix UI / shadcn/ui', 'Redux Toolkit', 'Storybook'],
  'Backend & Data': ['Node.js', 'REST APIs', 'PostgreSQL (Neon)', 'Drizzle ORM', 'Temporal workflows', 'Stripe', 'Clerk auth', 'Sanity CMS', 'Algolia', 'Kirby CMS', 'Magento 2', 'Moodle / Totara'],
  'Cloud & DevOps': ['Vercel', 'Fly.io', 'Docker', 'CI/CD with GitHub Actions', 'Turborepo', 'Google Maps Platform', 'Twilio', 'SendGrid'],
  'Testing & Quality': ['Playwright', 'Vitest', 'Testing Library', 'Cypress', 'Sentry', 'Lighthouse'],
  Security: ['Authorization and access control', 'JWT / JWKS single sign-on', 'Content-Security-Policy', 'Rate limiting', 'PII protection'],
  'Design & UX': ['Figma', 'Design systems and design tokens', 'WCAG 2.1 accessibility', 'Responsive design', 'Usability testing', 'Prototyping'],
  Practices: ['Agile', 'Linear', 'Jira', 'Code review', 'AI-assisted development (Claude Code, Hermes, OpenCode, Ollama)', 'Technical documentation'],
} as const;

export const education = [
  { school: 'Discovery Partners Institute', credential: 'Software Developer Program (480+ hours)', dates: 'Oct 2024 – Oct 2025', note: 'Full-stack program in Ruby on Rails, Sinatra, SQL and REST APIs; built a Qualtrics-to-Salesforce ELT web application.' },
  { school: 'University of Cumbria (Belfast Bible College)', credential: 'Bachelor of Arts, Theological Studies', dates: '2021', note: '' },
] as const;
