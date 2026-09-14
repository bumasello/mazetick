/**
 * A URL canônica da página, derivada de `site` e NUNCA da URL de request.
 *
 * Por que é função partilhada e não duas linhas em cada layout: o `BaseLayout`
 * normalizava e o `ArticleLayout` não, e por isso o JSON-LD de artigo saiu com
 * `"url": ".../backing-the-favourite.html"` nas cinco páginas enquanto a
 * <link rel="canonical"> dizia `.../backing-the-favourite`. Duas
 * implementações da mesma regra divergem em silêncio — é a mesma lição do hash
 * da CSP, que o verify importa de headers.mjs em vez de reimplementar.
 *
 * `build.format: 'file'` faz o pathname sair como "/about.html" no build, mas o
 * que a Cloudflare serve e o que o sitemap lista é "/about".
 */
export const canonicalPath = (pathname: string): string =>
  pathname
    .replace(/\.html$/, '')
    .replace(/\/index$/, '/')
    .replace(/^$/, '/');

export const canonicalUrl = (pathname: string, site: URL | undefined): string =>
  new URL(canonicalPath(pathname), site).href;
