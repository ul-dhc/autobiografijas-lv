import { defineConfig } from 'astro/config';

// Matches the SITE_URL / BASE_PATH convention used by digitalhumanities.lv.
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base: process.env.BASE_PATH || '/',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
