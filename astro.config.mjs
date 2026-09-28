// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The site is served from the custom domain at the root, so there is no `base` path.
// English lives at /, German at /de/.
export default defineConfig({
  site: 'https://tillfindl.com',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'de'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', de: 'de' } },
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
