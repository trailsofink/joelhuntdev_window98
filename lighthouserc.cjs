// Lighthouse CI gate: every category must score 95 or better. Runs against
// the static build. LHCI_PRESET=desktop switches to desktop emulation; the
// default is Lighthouse's mobile profile. Each URL is the median of 3 runs.
const desktop = process.env.LHCI_PRESET === 'desktop';

module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      numberOfRuns: 3,
      url: [
        'http://localhost/',
        'http://localhost/resume',
        'http://localhost/projects/bulqit/lighthouse',
        'http://localhost/games/minesweeper',
      ],
      settings: desktop ? { preset: 'desktop' } : {},
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
