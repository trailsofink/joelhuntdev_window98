---
company: Bulqit
role: Director of Product Engineering
start: May 2026
end: Oct 2026
blurb: Home-services marketplace connecting homeowners with vendors for recurring services.
order: 1
---

A five-person startup with two in-house engineers, after an external agency handoff. Soft launch in July 2026, public launch in August 2026; the company wound down in October 2026.

- Stabilized a codebase inherited from a dismissed agency, with broken checkout, coupons, SMS number masking and email delivery. Owned the front-end recovery and personally resolved ~350 user and QA feedback reports, including ~130 already open at handoff; 898 of the 902 reports filed in that period were resolved before wind-down.
- Led the pre-launch product redesign, building the lead designer's Figma system in Next.js and React across the vendor app, member app and marketing site: about 28 pull requests over 45 routes in five weeks, to WCAG 2.1 and responsive requirements. Closed 300+ UI, UX and usability tickets across the vendor, member and admin apps.
- Drove vendor activation through product design: rebuilt the core vendor workflows (scheduling calendar, field-staff jobs, bidding, inbox, homes) and shipped guided onboarding with dashboard action items. About 75% of ~45 vendor signups submitted insurance and compliance documents with no staff follow-up, producing 31 approved vendors.
- Moved the front end onto Figma design tokens across 619 files, with a lint rule against hard-coded colors. After launch, merged four competing type systems into Figma text styles (728 files) and upgraded to Tailwind CSS 4 with no visual regressions.
- Led a Lighthouse performance and accessibility push across 12 public pages, measured as medians of three production runs: average mobile Performance 75 to 85, desktop 94 to 99. On the vendor landing page, mobile Performance rose from 53 to 86, Total Blocking Time fell from 17.2 s to 0.2 s, and page weight from 5.7 MB to 1.7 MB. Every page scores 91+ for Accessibility and 100 for SEO.
- Replaced a Cypress suite that checked nothing with a Playwright end-to-end suite that builds the app, seeds its own database and walks seven user roles from signup to card payment: 113 tests, run in CI on every pull request.
- Found and closed authorization flaws in vendor payouts, vendor account email changes and access to private conversations. Each fix shipped with a CI guard test that fails if the flaw returns.
- Caught three billing defects before release in the Stripe and PostgreSQL charge path (duplicate charges from concurrent job completions, coupons applied only to the first visit, unbilled units on count-priced services): zero billing errors in production across ~80 recurring services a month and $5.8K in card payments.
- Directed launch QA: wrote persona-based test cases and checklist flows for every user role, and ran up to five external testers plus internal staff through each release; several releases returned zero defect reports. Zero downtime on core web systems from launch to wind-down.
- Led technical discovery for an SSO partnership with a neighbourhood-app partner and wrote the integration spec: a signed JWT / JWKS handoff so partner users arrive already authenticated and placed in their verified neighbourhood. The partner accepted the spec; the company wound down before implementation.
- Built the email-driven reporting pipeline for partner Blue Ocean: a vendor's report email marks the job complete, takes payment and forwards a branded report to the homeowner. Also built the migration flow that moved Blue Ocean's existing customers onto the platform without a signup.
- Ran issue triage and delivery in Linear and Sentry with the COO: completed 646 issues in five months. In the final release cycle, which Linear scoped at 487% of team capacity, the team completed 154 of 195 issues (79%), 83 of them personally.
- Designed a parallel AI-agent development workflow, running several coding agents in separate git worktrees, which produced a large share of 454 personally merged pull requests (49% of everything merged to the main branch). Wrote 23 of the repository's 39 CI guard tests and the team's engineering handbook so agent-written code was checked automatically as well as in review.
