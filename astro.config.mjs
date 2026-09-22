// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';

// ---------------------------------------------------------------- lastmod
//
// O `lastmod` do sitemap era `new Date()` — a hora do build, carimbada nas
// 3.888 URLs. Como o site reconstrói ~4x por dia, ele avisava o Google quatro
// vezes ao dia de que /cookies, /privacy e 3.847 páginas de cavalo tinham
// mudado todas juntas. O Google só usa `lastmod` de quem se mostra confiável;
// um sitemap assim ensina a ignorá-lo, e é justamente `lastmod` o mecanismo
// que faz o rastreio voltar sozinho, sem reenvio manual.
//
// Aqui cada URL leva a data do que de fato a muda. Onde não há data honesta
// — as páginas estáticas —, o campo sai fora: sitemap sem `lastmod` é válido,
// e o Google cai no histórico de rastreio dele. Ausência é melhor que mentira,
// a mesma regra que vale para os números do site.
//
// `changefreq` sai de vez: o Google declara que ignora, então ele só podia
// custar bytes e credibilidade.

/** @param {string} caminho */
const lerJson = (caminho) => JSON.parse(fs.readFileSync(caminho, 'utf8'));

const indiceCavalos = lerJson('src/data/horses-index.json');
const movers = lerJson('src/data/movers.json');
const extraPlaces = lerJson('src/data/extra-places.json');

/** @param {string|null|undefined} a @param {string|null|undefined} b @returns {string|null} */
const maior = (a, b) => {
  if (!a) return b ?? null;
  if (!b) return a;
  return a > b ? a : b;
};

// ⚠️ Repete `letterOf` de `src/lib/horses.ts` (primeira letra do slug, `#`
// fora de a–z). A duplicação é consciente: o config é .mjs e não importa o TS.
// A checagem 25 do verify.mjs não confia nesta cópia — ela confere a data da
// página de letra contra os cavalos que a página REALMENTE lista no HTML, e
// por isso acusa se as duas lógicas se separarem.
/** @param {string} slug */
const letraDo = (slug) => {
  const c = slug[0]?.toLowerCase() ?? '#';
  return /[a-z]/.test(c) ? c : '#';
};

/** @type {Map<string,string>} */
const dataPorCavalo = new Map();
/** @type {Map<string,string>} */
const dataPorLetra = new Map();
for (const h of indiceCavalos.horses) {
  if (!h.last_declared) continue;
  dataPorCavalo.set(h.slug, h.last_declared);
  const l = letraDo(h.slug);
  const anterior = dataPorLetra.get(l);
  if (!anterior || h.last_declared > anterior) dataPorLetra.set(l, h.last_declared);
}

// `published` do frontmatter, lido a seco: não vale uma dependência de YAML
// para uma linha, e o formato é fixo (`published: AAAA-MM-DD`).
/** @type {Map<string,string>} */
const dataPorArtigo = new Map();
for (const arq of fs.readdirSync('src/content/research')) {
  if (!arq.endsWith('.md') && !arq.endsWith('.mdx')) continue;
  const d = fs.readFileSync(`src/content/research/${arq}`, 'utf8')
    .match(/^published:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
  if (d) dataPorArtigo.set(arq.replace(/\.mdx?$/, ''), d);
}
const ultimoArtigo = [...dataPorArtigo.values()].reduce(maior, null);

// A home mostra movers e o acervo, então ela muda com os dois.
const dataDaHome = maior(movers.generated_at, indiceCavalos.generated_at);

/** @param {string} url @returns {string|null} */
function lastmodDe(url) {
  const rota = new URL(url).pathname.replace(/\/$/, '') || '/';

  const cavalo = rota.match(/^\/horse\/([^/]+)$/)?.[1];
  if (cavalo) return dataPorCavalo.get(cavalo) ?? null;

  const letra = rota.match(/^\/horse\/letter\/([^/]+)$/)?.[1];
  if (letra) return dataPorLetra.get(letra) ?? null;

  const artigo = rota.match(/^\/research\/([^/]+)$/)?.[1];
  if (artigo) return dataPorArtigo.get(artigo) ?? null;

  switch (rota) {
    case '/': return dataDaHome;
    case '/horse': return indiceCavalos.generated_at;
    case '/movers': return movers.generated_at;
    case '/extra-places': return extraPlaces.generated_at;
    case '/research': return ultimoArtigo;
    // /about, /contact, /cookies, /privacy, /responsible-gambling: mudam
    // quando alguém as edita, e o build não sabe quando foi. Sem lastmod.
    default: return null;
  }
}

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
    sitemap({
      serialize(item) {
        delete item.changefreq;
        const lm = lastmodDe(item.url);
        if (lm) item.lastmod = lm;
        else delete item.lastmod;
        return item;
      },
    }),
  ],
  markdown: {
    // O realce de sintaxe do Astro injeta um tema com background-color
    // hardcoded no próprio HTML — um bloco escuro fora do sistema de tokens.
    // Desligado: os blocos de código aqui são caminhos e comandos, sem sintaxe
    // a realçar, e `.prose pre` os estiliza com os tokens.
    syntaxHighlight: false,
  },
});
