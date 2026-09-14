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
  build: {
    format: 'file',
    // Sem CSS inlineado no HTML. O padrão ('auto') inlineia folhas pequenas,
    // o que obrigaria a CSP a aceitar `style-src 'unsafe-inline'` — e uma CSP
    // que aceita inline protege bem menos. Com tudo externo, `style-src 'self'`
    // basta e é honesta.
    inlineStylesheets: 'never',
  },
  integrations: [
    sitemap({ changefreq: 'daily', lastmod: new Date() }),
  ],
  markdown: {
    // O realce de sintaxe do Astro injeta um tema com background-color
    // hardcoded no próprio HTML — um bloco escuro fora do sistema de tokens.
    // Desligado: os blocos de código aqui são caminhos e comandos, sem sintaxe
    // a realçar, e `.prose pre` os estiliza com os tokens.
    syntaxHighlight: false,
  },
});
