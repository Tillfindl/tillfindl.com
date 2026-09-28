// @ts-check
import { defineConfig } from 'astro/config';

// The site is served from the custom domain at the root, so there is no `base` path.
export default defineConfig({
  site: 'https://tillfindl.com',
});
