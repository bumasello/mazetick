// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// `site` é a origem canônica. Ela alimenta o sitemap e a <link rel="canonical">,
// e é deliberadamente fixa: se a canônica saísse da URL de request, cada preview
// da Cloudflare publicaria a sua própria canônica e competiria com a produção
// no índice do Google.
export default defineConfig({
  site: 'https://mazetick.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    sitemap({ changefreq: 'daily', lastmod: new Date() }),
  ],
});
