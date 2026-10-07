// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static output. Vercel serves it from its CDN with no adapter needed.
export default defineConfig({
  site: 'https://joelhunt.dev',
  trailingSlash: 'never',
  integrations: [sitemap()],
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  build: { inlineStylesheets: 'auto', format: 'file' },
});
