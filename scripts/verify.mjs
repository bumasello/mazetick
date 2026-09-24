/**
 * Verificação do site construído. Roda sobre dist/ depois do build.
 *
 * Por que existe, e não é um grep no README: a lista manual checava "links do
 * rodapé: nenhum 404" e passava, porque os href estavam certos — o que quebrou
 * foi o TEXTO ao redor deles. E a inspeção do artigo varreu só o <main>, então
 * o rodapé, que está em toda página, ficou fora do escopo.
 *
 * A regra que este arquivo aplica: toda checagem varre TODAS as páginas
 * geradas, nunca uma amostra e nunca uma região.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { inlineScripts, NON_EXECUTABLE_TYPES, sha256 } from './headers.mjs';
import { stampProblems } from './data-contract.mjs';
import { STATUS_COPY, ARCHIVE_PREFIX, ukDate, artigo } from '../src/lib/horse-copy.mjs';

const DIST = 'dist';
const fail = [];
const check = (name, problems) => {
  if (problems.length) fail.push({ name, problems });
  console.log(`${problems.length ? '✗' : '✓'} ${name}${problems.length ? ` — ${problems.length}` : ''}`);
  for (const p of problems.slice(0, 8)) console.log(`    ${p}`);
  if (problems.length > 8) console.log(`    …e mais ${problems.length - 8}`);
};

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
  );

const all = walk(DIST);
const pages = all.filter((f) => f.endsWith('.html'));
const rel = (f) => path.relative(DIST, f);
if (!pages.length) {
  console.error('Nenhuma página em dist/. Rodou o build?');
  process.exit(1);
}
console.log(`Verificando ${pages.length} páginas.\n`);

const read = (f) => fs.readFileSync(f, 'utf8');

// O conjunto de URLs do sitemap, lido uma vez. A checagem 14 o usa para
// confrontar a URL declarada no JSON-LD; a 6 e a 18 fazem as suas próprias
// perguntas sobre o mesmo arquivo.
const sitemapFile = all.find((f) => /sitemap-\d+\.xml$/.test(f));
const sitemapLocs = sitemapFile
  ? new Set([...read(sitemapFile).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/\/$/, '')))
  : null;

// 1. Regra 2 do handoff: nenhum preço derivado da Betfair na tela. O nome da
//    casa e a sigla não podem aparecer em lugar nenhum do HTML servido.
check(
  'Regra 2 — sem Betfair/BSP no HTML',
  pages.flatMap((f) => {
    const m = read(f).match(/betfair|\bBSP\b/gi);
    return m ? [`${rel(f)}: ${[...new Set(m)].join(', ')}`] : [];
  }),
);

// 2. Espaço comido em volta de tag inline. O compilador apara a quebra de linha
//    em vez de virar espaço, e o texto gruda: "fromBeGambleAwareandGamCare".
check(
  'Espaçamento em volta de tag inline',
  pages.flatMap((f) => {
    // Olha o TEXTO resultante, não a adjacência das tags. A versão anterior
    // marcava `Punchestown<span class="faint"> (IE)</span>`, que renderiza
    // "Punchestown (IE)" — o espaço está DENTRO do span. O que denuncia o bug
    // é palavra, tag, e logo em seguida um caractere não-branco.
    // ⚠️ AMPLIADA EM 2026-09-20, e o motivo apareceu na tela, não no código.
    //     A /horse servia "…a statement about us.<strong>No recorded run</strong>"
    //     — o compilador aparou a quebra de linha entre o ponto final e a tag, e
    //     o texto saiu "us.No recorded run". A versão anterior exigia `\w` ANTES
    //     da tag, então uma PONTUAÇÃO colada passava batido, que é justamente a
    //     junção mais provável em prosa: fim de frase, tag inline, palavra.
    //
    //     A classe é só de pontuação de frase, e não "qualquer não-espaço": um
    //     parêntese ou aspa colados a um link — `(<a …>texto</a>)` — são
    //     legítimos e continuam passando.
    const T = '(?:a|span|strong|em|code|b|i)';
    //     Só o lado de ABERTURA foi ampliado. Pontuação DEPOIS de uma tag que
    //     fecha — "</a>," ou "</em>." — é inglês normal e aparece em toda página;
    //     ampliar os dois lados acusou 8.749 ocorrências legítimas na primeira
    //     tentativa. E `;` fica FORA da classe porque é o fim de toda entidade
    //     HTML: "&mdash;<em>" é correto e não pode quebrar o build.
    const rx = new RegExp(`.{20}(?:[\\w.,:!?]<${T}[^>]*>\\S|\\S</${T}>\\w).{20}`, 'g');
    const m = read(f).match(rx);
    return m ? m.map((s) => `${rel(f)}: …${s.replace(/\s+/g, ' ')}…`) : [];
  }),
);

// 3. Estado inicial indexável: o HTML servido NÃO fixa tema, e toda página
//    aplica a escolha do leitor antes da primeira pintura.
//
//    Duas afirmações, e as duas já foram quebradas noutros projetos:
//
//    (a) `data-theme` no HTML construído forçaria um tema para todo mundo. Sem
//        atributo vale `prefers-color-scheme`, que é o padrão correto para
//        quem chega pela primeira vez, para quem não tem JavaScript e para o
//        indexador.
//    (b) o aplicador tem de estar no <head> e ser síncrono. Em <body>, com
//        `defer` ou ausente, o leitor que escolheu escuro vê um lampejo de
//        claro — e o defeito não aparece em nenhuma outra checagem porque o
//        HTML fica correto e o CSS também.
{
  const problems = [];
  for (const f of pages) {
    const s = read(f);
    const html = s.match(/<html[^>]*>/);
    if (html && /\bdata-theme\s*=/.test(html[0])) {
      problems.push(`${rel(f)}: <html> já vem com data-theme — o tema ficou fixo no artefato`);
    }
    const head = s.slice(0, s.indexOf('</head>'));
    if (!/localStorage\.getItem\('mazetick:theme'\)/.test(head)) {
      problems.push(`${rel(f)}: sem o aplicador de tema no <head> — lampejo de tema errado`);
    }
  }
  check('Tema não fixado no HTML, e aplicado antes da pintura', problems);
}

// 4. Idioma declarado, em toda página.
check(
  'lang="en-GB"',
  pages.filter((f) => !/<html[^>]*lang="en-GB"/.test(read(f))).map(rel),
);

// 5. Canônica presente e sem .html — tem de casar com o que o sitemap lista,
//    senão a página compete consigo mesma no índice.
check(
  'Canônica sem .html (ou noindex)',
  pages.flatMap((f) => {
    const s = read(f);
    if (/name="robots" content="noindex"/.test(s)) return [];
    const m = s.match(/rel="canonical" href="([^"]+)"/);
    if (!m) return [`${rel(f)}: sem canônica e sem noindex`];
    return m[1].endsWith('.html') ? [`${rel(f)}: ${m[1]}`] : [];
  }),
);

// 6. Canônica e sitemap listam exatamente o mesmo conjunto.
{
  const smFile = all.find((f) => /sitemap-\d+\.xml$/.test(f));
  const problems = [];
  if (!smFile) problems.push('sitemap não gerado');
  else {
    const inSitemap = new Set(
      [...read(smFile).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/\/$/, '')),
    );
    for (const f of pages) {
      const s = read(f);
      if (/name="robots" content="noindex"/.test(s)) continue;
      const m = s.match(/rel="canonical" href="([^"]+)"/);
      if (m && !inSitemap.has(m[1].replace(/\/$/, ''))) {
        problems.push(`${rel(f)}: canônica ${m[1]} não está no sitemap`);
      }
    }
  }
  check('Canônicas ⊆ sitemap', problems);
}

// 7. Links internos resolvem para arquivo gerado.
check(
  'Links internos sem 404',
  (() => {
    const have = new Set(all.map(rel));
    const bad = new Set();
    for (const f of pages) {
      for (const m of read(f).matchAll(/href="(\/[^"#?]*)"/g)) {
        const u = m[1];
        const cands = [
          u === '/' ? 'index.html' : u.slice(1),
          u === '/' ? 'index.html' : `${u.slice(1)}.html`,
          `${u.slice(1).replace(/\/$/, '')}/index.html`,
        ];
        if (!cands.some((c) => have.has(c))) bad.add(`${u}  (em ${rel(f)})`);
      }
    }
    return [...bad];
  })(),
);

// 8. Sem JS de aplicação. Só o inline da densidade e, em produção, o beacon
//    cookieless — ambos declarados na política de privacidade.
check(
  'Sem script externo além do beacon',
  pages.flatMap((f) =>
    [...read(f).matchAll(/<script[^>]+src="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((s) => !s.includes('static.cloudflareinsights.com'))
      .map((s) => `${rel(f)}: ${s}`),
  ),
);

// 9. Nenhum literal de cor fora de tokens.css.
check(
  'Sem literal de cor no fonte',
  (() => {
    const srcs = walk('src').filter(
      (f) => /\.(astro|css)$/.test(f) && !f.endsWith('tokens.css'),
    );
    return srcs.flatMap((f) => {
      const m = read(f).match(/#[0-9A-Fa-f]{3,8}\b/g);
      return m ? [`${f}: ${[...new Set(m)].join(', ')}`] : [];
    });
  })(),
);

// 10. Cor fora dos tokens no ARTEFATO SERVIDO — HTML e bundle CSS.
//
//     A checagem 9 vigia a intenção (nenhum componente escreve cor literal);
//     esta vigia o que o leitor recebe, e as duas não são a mesma pergunta. Ela
//     nasceu porque o realce de sintaxe do Astro injetava background-color
//     #24292e direto no HTML, onde a 9 não tinha como ver.
//
//     Varre também o CSS gerado, e não só o HTML: cor pode entrar no bundle por
//     um <style> de componente, por uma dependência ou por uma integração, e aí
//     nem a 9 nem uma checagem só de HTML a veriam. A lista de permitidas é
//     derivada de tokens.css — a única fonte de cor do sistema.
{
  const allowed = new Set(
    (fs.readFileSync('src/styles/tokens.css', 'utf8').match(/#[0-9A-Fa-f]{3,8}\b/g) || [])
      .map((c) => c.toLowerCase()),
  );
  const problems = [];

  for (const f of pages) {
    const m = read(f).match(/style="[^"]*#[0-9A-Fa-f]{3,8}[^"]*"/g) || [];
    for (const x of new Set(m)) problems.push(`${rel(f)}: ${x.slice(0, 70)}`);
  }

  for (const f of all.filter((x) => x.endsWith('.css'))) {
    const found = new Set(
      (read(f).match(/#[0-9A-Fa-f]{3,8}\b/g) || []).map((c) => c.toLowerCase()),
    );
    for (const c of found) {
      if (!allowed.has(c)) problems.push(`${rel(f)}: ${c} não está em tokens.css`);
    }
  }

  check('Sem cor fora dos tokens no artefato servido', problems);
}

// 11. Nenhum adaptador de servidor, e a saída no lugar combinado.
//
//     Não é hipótese: em 2026-09-13 a Cloudflare detectou Astro na criação do
//     projeto, decidiu que o site era renderizado no servidor, instalou
//     @astrojs/cloudflare DURANTE o build e moveu a saída de dist/ para
//     dist/client/. A checagem 7 pegou pelo sintoma — 137 links quebrados —,
//     o que já era suficiente para recusar o deploy, mas ilegível como
//     diagnóstico.
//
//     Esta olha as duas pontas: a causa (adaptador nas dependências ou no
//     astro.config) e o sintoma (dist/index.html no lugar certo, sem
//     dist/client/). O gatilho veio de FORA do repositório, então o repositório
//     tem de saber recusá-lo — é o que wrangler.jsonc e esta checagem fazem.
{
  const problems = [];
  const pkg = JSON.parse(read('package.json'));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  const ADAPTERS = /^@astrojs\/(cloudflare|node|vercel|netlify|deno|aws)$/;
  for (const name of Object.keys(deps)) {
    if (ADAPTERS.test(name)) problems.push(`package.json: adaptador ${name}`);
  }

  const cfg = read('astro.config.mjs');
  if (/\badapter\s*:/.test(cfg)) problems.push('astro.config.mjs: chave `adapter`');
  if (!/output:\s*'static'/.test(cfg)) problems.push("astro.config.mjs: output deixou de ser 'static'");

  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    problems.push('dist/index.html não existe — a saída mudou de lugar');
  }
  if (fs.existsSync(path.join(DIST, 'client'))) {
    problems.push('dist/client/ existe — sinal de build com adaptador de servidor');
  }

  check('Sem adaptador de servidor; saída em dist/', problems);
}

// 12. Os cabeçalhos existem E cobrem o que é realmente servido.
//
//     Cabeçalho declarado e não servido é a mesma classe de coisa que
//     verificador que nunca falha. Aqui a prova é estrutural: cada <script>
//     inline do HTML construído tem de ter o seu hash na CSP, calculado pela
//     MESMA função que gerou o arquivo (importada, não reimplementada — duas
//     implementações divergiriam em silêncio).
//
//     Se alguém acrescentar um script inline e não regerar, o build para.
{
  const problems = [];
  const hf = path.join(DIST, '_headers');

  if (!fs.existsSync(hf)) {
    problems.push('dist/_headers não existe — rodou scripts/headers.mjs?');
  } else {
    const h = read(hf);

    for (const name of [
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
    ]) {
      if (!h.includes(`${name}:`)) problems.push(`_headers: falta ${name}`);
    }

    // Parseia por bloco em vez de casar regex no arquivo inteiro. A primeira
    // versão usava /^\/\*[\s\S]*?Cache-Control:.../ e dava falso positivo: o
    // `[\s\S]*?` atravessa a fronteira dos blocos e casava, a partir de `/*`,
    // o Cache-Control que pertence a `/_astro/*`.
    const blocks = {};
    let current = null;
    for (const raw of h.split('\n')) {
      if (raw.trim().startsWith('#') || !raw.trim()) continue;
      if (!/^\s/.test(raw)) {
        current = raw.trim();
        blocks[current] = {};
      } else if (current) {
        const i = raw.indexOf(':');
        if (i > 0) blocks[current][raw.slice(0, i).trim()] = raw.slice(i + 1).trim();
      }
    }

    const IMMUTABLE = 'public, max-age=31536000, immutable';
    if (blocks['/_astro/*']?.['Cache-Control'] !== IMMUTABLE) {
      problems.push('_headers: /_astro/* sem Cache-Control immutable');
    }
    // O HTML cai no bloco `/*` e NÃO pode ser imutável: uma correção publicada
    // levaria um ano para chegar a quem já visitou.
    if (/max-age=(?!0\b)\d+/.test(blocks['/*']?.['Cache-Control'] || '')) {
      problems.push(`_headers: /* com cache longo (${blocks['/*']['Cache-Control']}) — pega o HTML`);
    }

    // Uma CSP que aceita inline não protege do que a CSP existe para impedir.
    for (const bad of ["'unsafe-inline'", "'unsafe-eval'"]) {
      if (h.includes(bad)) problems.push(`_headers: CSP contém ${bad}`);
    }

    // Todo script EXECUTÁVEL servido tem de ter o seu hash. Os de tipo
    // não-executável (hoje só `application/ld+json`) estão fora por decisão
    // medida — ver NON_EXECUTABLE_TYPES em headers.mjs —, e a segunda metade do
    // laço garante que a isenção não vira porta dos fundos: qualquer OUTRO tipo
    // continua exigindo hash.
    for (const f of pages) {
      for (const sc of inlineScripts(read(f))) {
        if (NON_EXECUTABLE_TYPES.has(sc.type)) continue;
        const hash = sha256(sc.body);
        if (!h.includes(hash)) {
          problems.push(`${rel(f)}: script inline sem hash na CSP (${hash.slice(0, 24)}…)`);
        }
      }
    }

    /*
      O CABEÇALHO TEM DE CABER.

      Esta metade nasceu de um número: com a /horse, hashear também os blocos de
      JSON-LD levava a CSP a 689 hashes e **37.561 bytes**. O limite prático de
      cabeçalho de resposta é de 8 a 16 KB conforme a borda, então a política
      simplesmente não seria servida — e um site sem CSP é pior que um site cuja
      CSP não cobre um bloco que o navegador nem executa.

      O orçamento é deliberadamente folgado (4 KB) e mesmo assim uma ordem de
      grandeza abaixo do que quebrava. O que ele impede é a REGRESSÃO SILENCIOSA:
      o site cresce ~600 páginas por dia, e qualquer script inline que passe a
      variar por página volta a estourar o cabeçalho sem que nada apareça na
      tela.
    */
    const CSP_BUDGET = 4096;
    for (const line of h.split('\n')) {
      const t = line.trim();
      if (!t.startsWith('Content-Security-Policy:')) continue;
      if (t.length > CSP_BUDGET) {
        problems.push(
          `_headers: CSP com ${t.length} bytes, acima do orçamento de ${CSP_BUDGET} — cabeçalho grande demais não é servido`,
        );
      }
    }
  }

  check('Cabeçalhos presentes e CSP cobrindo os scripts servidos', problems);
}

// 13. Em build da Cloudflare, o beacon TEM de estar no HTML.
//
//     PUBLIC_CF_BEACON_TOKEN é variável de BUILD, não de runtime: num site
//     estático as de runtime não fazem nada, porque não há execução por
//     requisição onde elas pudessem ser lidas. Se ela faltar nas variáveis de
//     build, o trecho do beacon simplesmente não renderiza e o site fica sem
//     analytics EM SILÊNCIO — e é o analytics que torna apuráveis os critérios
//     de morte do projeto, que são expressos em sessões por mês.
//
//     Localmente a ausência é o comportamento correto e não é erro. A checagem
//     só morde quando WORKERS_CI=1, que a Cloudflare injeta sozinha nos builds.
{
  const onWorkersCI = ['1', 'true'].includes(String(process.env.WORKERS_CI));
  // Casa a TAG, não a menção. A página de privacidade cita
  // static.cloudflareinsights.com em prosa, dentro de <code>, ao descrever o
  // analytics — procurar o domínio solto dava 1/13 com o token ausente, quando
  // o certo é 0/13.
  const BEACON_TAG = /<script[^>]+src="https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js"/;
  const withBeacon = pages.filter((f) => BEACON_TAG.test(read(f)));
  const problems = [];

  if (onWorkersCI && withBeacon.length !== pages.length) {
    problems.push(
      `beacon presente em ${withBeacon.length}/${pages.length} páginas — ` +
        'PUBLIC_CF_BEACON_TOKEN faltou nas variáveis de BUILD do projeto',
    );
  }

  check('Beacon de analytics no build de produção', problems);

  if (!onWorkersCI) {
    console.log(
      `    (local, WORKERS_CI não setado: beacon em ${withBeacon.length}/${pages.length} páginas — ausência é o esperado)`,
    );
  }
}

// 14. Sintaxe de template vazando, e dado estruturado que realmente parseia.
//
//     Quarto episódio da mesma família, com a variação mais instrutiva: desta
//     vez a REGIÃO estava certa — o verify já lia dist/ — mas nenhuma checagem
//     PARSEAVA o que encontrava. `<set:html value={...} />` não é a diretiva do
//     Astro (ela se aplica a um elemento), então as 12 páginas saíram com um
//     elemento <set> literal e o JSON-LD escapado dentro de um atributo: zero
//     blocos válidos, e nada disso aparece na tela. Olhar não é interpretar.
//
//     (a) olha o erro que já conhecemos; (b) verifica a INTENÇÃO — existe dado
//     estruturado e ele é legível —, e é (b) que teria pego isto sem saber de
//     nada. `{"` NÃO entra como marcador: é como todo JSON-LD começa, e aparece
//     67 vezes de forma legítima.
//
//     (c) foi acrescentado depois, e fecha o degrau seguinte: parsear não é
//     CONFERIR. As cinco páginas de artigo tinham JSON-LD válido declarando
//     `"url": ".../artigo.html"` enquanto a <link rel="canonical"> dizia
//     ".../artigo" e o sitemap listava ".../artigo" — três declarações da mesma
//     página sobre si mesma, uma delas discordando. Ser JSON válido não é dizer
//     a verdade.
{
  const problems = [];

  const LEAKS = [/<\/?set\b/i, /\bset:(html|text)\s*=/i, /\bclient:(load|idle|visible|media|only)\b/i,
                 /<\/?Fragment\b/i, /\bis:inline\b/i, /\$\{/, /\{JSON\./];
  for (const f of pages) {
    const html = read(f);
    for (const rx of LEAKS) {
      const m = html.match(rx);
      if (m) problems.push(`${rel(f)}: sintaxe de template no artefato — ${m[0]}`);
    }
  }

  const LD = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  for (const f of pages) {
    const blocks = [...read(f).matchAll(LD)].map((m) => m[1]);
    if (!blocks.length) {
      problems.push(`${rel(f)}: nenhum bloco application/ld+json`);
      continue;
    }

    const parsed = [];
    for (const b of blocks) {
      try {
        parsed.push(JSON.parse(b));
      } catch (e) {
        problems.push(`${rel(f)}: JSON-LD não parseia — ${e.message.slice(0, 60)}`);
      }
    }

    // Artigo tem de carregar o seu próprio Article, além do WebSite/Organization.
    const isArticle = rel(f).startsWith('research/');
    if (isArticle) {
      if (parsed.length < 2) problems.push(`${rel(f)}: artigo com ${parsed.length} bloco(s) de JSON-LD, esperado 2`);
      const types = parsed.flatMap((o) => [o['@type'], ...(o['@graph'] || []).map((g) => g['@type'])]);
      if (!types.includes('Article')) problems.push(`${rel(f)}: artigo sem @type Article`);
    }

    // (c) A URL que o dado estruturado declara tem de ser a MESMA que a
    //     canônica e a mesma que o sitemap lista. Só objetos de página entram
    //     na comparação: o WebSite/Organization declara a raiz do site em toda
    //     página, e isso está certo.
    const canon = read(f).match(/rel="canonical" href="([^"]+)"/)?.[1];
    // `Dataset` entrou em 2026-09-19 com a /horse: cada página de cavalo marca
    // o que ela é — um conjunto pequeno de estatísticas derivadas — e declara
    // uma `url`. Sem o tipo nesta lista, 678 páginas passariam a declarar a URL
    // delas sem que ninguém conferisse se ela bate com a canônica e com o
    // sitemap, que é exatamente o defeito (c) que esta checagem existe para
    // pegar, só que multiplicado por 678.
    const PAGE_TYPES = new Set(['Article', 'NewsArticle', 'BlogPosting', 'WebPage', 'Dataset']);
    const flat = parsed.flatMap((o) => [o, ...(o['@graph'] || [])]);
    for (const o of flat) {
      if (!PAGE_TYPES.has(o['@type']) || !o.url) continue;
      if (canon && o.url !== canon) {
        problems.push(`${rel(f)}: JSON-LD url ${o.url} ≠ canônica ${canon}`);
      }
      if (sitemapLocs && !sitemapLocs.has(o.url.replace(/\/$/, ''))) {
        problems.push(`${rel(f)}: JSON-LD url ${o.url} não está no sitemap`);
      }
    }

    // (d) `isPartOf` de um Dataset tem de apontar para outro Dataset.
    //
    //     O Search Console reclamou disto em 21/09/2026 ("o tipo de objeto do
    //     campo isPartOf não é válido"): as páginas de cavalo declaravam
    //     `isPartOf: {@id: #website}`, e `#website` é um WebSite. O schema.org
    //     aceita (WebSite é CreativeWork), mas o validador de Dataset do Google
    //     é mais estreito e exige Dataset. Quem quer dizer "este conjunto mora
    //     num acervo maior" usa `includedInDataCatalog`, não `isPartOf`.
    //
    //     A referência é resolvida DENTRO da página, que é tudo o que o Google
    //     enxerga: @id que a página não define não é verificável, e isso conta
    //     como defeito — senão trocar o alvo por um @id inexistente calaria a
    //     checagem sem consertar nada.
    const porId = new Map(flat.filter((o) => o['@id']).map((o) => [o['@id'], o['@type']]));
    for (const o of flat) {
      if (o['@type'] !== 'Dataset' || !o.isPartOf) continue;
      const alvo = o.isPartOf['@id'];
      if (!alvo) {
        problems.push(`${rel(f)}: Dataset.isPartOf sem @id`);
      } else if (!porId.has(alvo)) {
        problems.push(`${rel(f)}: Dataset.isPartOf aponta para ${alvo}, que a página não define`);
      } else if (porId.get(alvo) !== 'Dataset') {
        problems.push(`${rel(f)}: Dataset.isPartOf aponta para ${alvo}, que é ${porId.get(alvo)} e não Dataset`);
      }
    }
  }

  check('Sem sintaxe de template; JSON-LD parseável e coerente com a canônica', problems);
}

// 15. A derivação existe, é linkável, e o commit resolve de verdade.
//
//     A regra: nenhum número vai para o site sem que o script que o produziu
//     esteja commitado. Ela nasceu de dois números publicados em dois dias sem
//     derivação versionada — e os dois não reproduziram. O schema já torna o
//     campo obrigatório; aqui se confere que ele não é decoração.
//
//     A metade local resolve `git cat-file -e <commit>:<caminho>` no repositório
//     do laboratório, que prova que AQUELE arquivo existia NAQUELE commit. Na
//     Cloudflare o repositório não está presente, então essa metade é pulada e
//     o motivo é impresso — pular calado seria o mesmo erro de sempre.
{
  const problems = [];
  const LAB = '../horsing-maze';
  const hasLab = fs.existsSync(path.join(LAB, '.git'));

  const links = [];
  for (const f of pages.filter((x) => rel(x).startsWith('research/'))) {
    const m = read(f).match(/href="https:\/\/github\.com\/bumasello\/horsing-maze\/blob\/([0-9a-f]{7,40})\/([^"]+)"/);
    if (!m) {
      problems.push(`${rel(f)}: artigo sem link de derivação`);
      continue;
    }
    links.push({ page: rel(f), commit: m[1], file: m[2] });
  }

  if (hasLab) {
    for (const { page, commit, file } of links) {
      try {
        execFileSync('git', ['-C', LAB, 'cat-file', '-e', `${commit}:${file}`], { stdio: 'pipe' });
      } catch {
        problems.push(`${page}: ${file} não existe no commit ${commit} do horsing-maze`);
      }
    }
  }

  check('Derivação versionada e resolvível', problems);
  console.log(
    hasLab
      ? `    (${links.length} derivações resolvidas contra ${LAB})`
      : `    (${LAB} ausente: shape conferido, commit NÃO resolvido — normal em build de CI)`,
  );
}

// 16 e 17. Os JSON de dados: nenhuma coluna proibida, e os dois carimbos.
//
//     ⚠️ 16 é a REDE EMBAIXO, NÃO a política. A defesa real da regra 6 do
//     handoff (nunca expor dado bruto de terceiro) é a LISTA DE PERMISSÃO do
//     `build_site_data.py`, que monta o JSON campo a campo na origem: lá o
//     critério é PROCEDÊNCIA — de onde o número veio —, e aqui é só a GRAFIA do
//     nome da chave. Grafia é falível por construção; ninguém deve ler esta
//     checagem como se fosse a política.
//
//     E era falível de um jeito específico: a versão anterior usava um `\b`
//     único, e em JavaScript `_` É caractere de palavra, então `\bwin_odds\b`
//     não fecha antes de `_dec`. Os cinco nomes que existem de verdade nos CSVs
//     — `win_odds_dec`, `ew_odds_dec`, `ew_odds_num`, `betfair_market_id` e
//     `win_market_id` — passavam todos. Daí as duas classes abaixo.
//
//     17 existe porque sem carimbo a página não tem como mostrar idade, e a
//     regra 4 ("todo número carrega o instante em que era verdade") cairia em
//     SILÊNCIO — a página ficaria bonita e mentindo. São DOIS carimbos, e o que
//     importa para o leitor é `collected_through`: `generated_at` fresco sobre
//     coleta parada é exatamente o disfarce que a regra 5 proíbe.
{
  // ⚠️ RECURSIVO, e a mudança tem motivo. A versão anterior usava
  //     `readdirSync('src/data')` sem descer, então os registros por cavalo —
  //     hoje 678 arquivos em `src/data/horses/<xx>/` — escapariam INTEIROS da
  //     varredura de campo proibido. É o erro de escopo que este projeto já
  //     pagou três vezes: a checagem existia, passava, e olhava o lugar errado.
  const srcData = fs.existsSync('src/data')
    ? walk('src/data').filter((f) => f.endsWith('.json')).map((f) => f.split(path.sep).join('/'))
    : [];

  // Todo JSON que chega a dist/ é publicamente acessível, consumido pelo site
  // ou não — e um `.json` público com payload de fornecedor é export acidental,
  // que a regra 6 proíbe por escrito. Hoje nenhum chega, então esta metade
  // passa trivialmente; é justamente o caso de "olhar o lugar errado" que este
  // projeto já pagou três vezes, e o custo de varrer é zero.
  const distData = all.filter((f) => f.endsWith('.json'));
  const dataFiles = [...srcData, ...distData];

  /*
    ⚠️ E O JSON QUE NÃO É ARQUIVO.

    A /horse embute o índice de nomes num `<script type="application/json">`
    para a busca alcançar o acervo inteiro. Esse bloco é tão público quanto um
    `.json` em dist/ — qualquer um lê no fonte da página —, e a varredura por
    arquivo não o via. Buraco fechado aqui: todo JSON embutido no HTML servido
    passa pelas MESMAS chaves proibidas.

    Hoje o índice é array de arrays e não tem chave nenhuma, então esta metade
    passa trivialmente. É exatamente o caso de "olhar o lugar errado" que este
    projeto já pagou quatro vezes, e o custo de varrer é zero.
  */
  const embutidos = [];
  for (const f of pages) {
    for (const m of read(f).matchAll(
      /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi,
    )) {
      embutidos.push({ nome: `${rel(f)} (json embutido)`, texto: m[1] });
    }
  }

  // Uma classe só, e a fronteira é a mesma para todos os termos: começo/fim da
  // chave ou qualquer caractere não alfanumérico — o que INCLUI o sublinhado.
  //
  // ⚠️ A versão anterior tinha duas classes e a genérica usava `\b`. Em
  // JavaScript `_` é caractere de palavra, então `\bprice\b` não fecha antes de
  // `_`: `sp_odds`, `odds_dec` e `pre_price` passavam os três. Apertado em
  // 2026-09-15 por decisão da orquestração, depois de conferir que NENHUM campo
  // do contrato de hoje contém "odds" ou "price".
  //
  // O falso positivo futuro é aceito de propósito: o preço do Smarkets é
  // publicável (regra 3 do handoff), então se um dia o produtor nomear um campo
  // `price` legitimamente, o build quebra. É o lado certo para errar — o erro
  // oposto é revenda —, e a saída é a lista de permissão abaixo, explícita e
  // deliberada, uma chave por vez. NUNCA afrouxar o padrão.
  //
  //     ⚠️ E havia um segundo buraco, fechado em 2026-09-16: a fronteira
  //     não-alfanumérica não vê camelCase. `winOdds`, `midPrice` e
  //     `betfairMarketId` passavam, porque a letra maiúscula É alfanumérica. O
  //     contrato de hoje é todo snake_case, mas isso vale para os nomes de
  //     hoje, não para o dia em que o produtor mudar de convenção — e a
  //     checagem existe justamente para o dia em que alguém mudar algo.
  //
  //     Em vez de alargar o padrão (que é o caminho que afrouxa), a chave é
  //     NORMALIZADA antes do teste: camelCase vira snake_case e qualquer
  //     separador vira `_`. Assim `winOdds`, `win-odds`, `win.odds` e
  //     `win_odds` são a mesma coisa, e a fronteira volta a ser simples.
  const TERMS = ['win_odds', 'ew_odds', 'betfair', 'bsp', 'selection_id', 'market_id', 'price', 'odds'];
  const BANNED = new RegExp(`(?:^|_)(${TERMS.join('|')})(?:_|$)`);
  const normaliza = (k) =>
    k.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  // Vazia, e que continue assim. Cada nome aqui é uma exceção que alguém teve
  // de justificar por escrito no commit que a acrescentou.
  const ALLOW = new Set([]);
  const forbidden = (k) => !ALLOW.has(k) && BANNED.test(normaliza(k));

  const banned = [];
  const undated = [];

  if (!srcData.length) {
    banned.push('src/data/ sem nenhum JSON — o prebuild rodou?');
  }

  for (const f of dataFiles) {
    const raw = read(f);
    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      banned.push(`${f}: não parseia — ${e.message.slice(0, 50)}`);
      continue;
    }

    // Varre as CHAVES em profundidade, não o texto: "price" dentro de uma nota
    // em prosa é legítimo, uma chave chamada price não é.
    const walkKeys = (o, at = '') => {
      if (Array.isArray(o)) return o.flatMap((v, i) => walkKeys(v, `${at}[${i}]`));
      if (o && typeof o === 'object') {
        return Object.entries(o).flatMap(([k, v]) =>
          (forbidden(k) ? [`${f}: campo proibido "${k}" em ${at || 'raiz'}`] : []).concat(
            walkKeys(v, at ? `${at}.${k}` : k),
          ),
        );
      }
      return [];
    };
    banned.push(...new Set(walkKeys(json)));
  }

  // Mesma varredura de chave, agora sobre o JSON que viaja dentro do HTML.
  for (const { nome, texto } of embutidos) {
    let json;
    try {
      json = JSON.parse(texto);
    } catch (e) {
      banned.push(`${nome}: não parseia — ${e.message.slice(0, 50)}`);
      continue;
    }
    const walkEmbutido = (o, at = '') => {
      if (Array.isArray(o)) return o.flatMap((v, i) => walkEmbutido(v, `${at}[${i}]`));
      if (o && typeof o === 'object') {
        return Object.entries(o).flatMap(([k, v]) =>
          (forbidden(k) ? [`${nome}: campo proibido "${k}" em ${at || 'raiz'}`] : []).concat(
            walkEmbutido(v, at ? `${at}.${k}` : k),
          ),
        );
      }
      return [];
    };
    banned.push(...new Set(walkEmbutido(json)));
  }

  for (const f of dataFiles) {
    const raw = read(f);
    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      continue;
    }

    // Só os JSON que ALIMENTAM a página carregam contrato de carimbo. Um .json
    // qualquer em dist/ (manifest, etc.) tem de passar pela 16, não pela 17.
    if (!srcData.includes(f)) continue;

    // Os carimbos exigidos saem de `data-contract.mjs`, o MESMO arquivo que o
    // `fetch-data.mjs` usa na porta de entrada. E NÃO são os mesmos em todo
    // arquivo: `collected_through` é o relógio de um coletor contínuo, que o
    // acervo de cavalos não tem — lá o que limita o número na tela é a
    // profundidade do arquivo histórico. Exigir o campo errado seria exigir
    // decoração; não exigir nenhum deixaria a regra 4 cair em silêncio.
    //
    // Arquivo que não cai em nenhum padrão do contrato é ERRO, não isenção: o
    // caminho para acrescentar dado passa por declarar o carimbo dele.
    undated.push(...stampProblems(f, json));
  }

  check('Sem campo proibido nos JSON de dados', banned);
  check('Todo JSON de dados carimbado, cada um com o carimbo do seu contrato', undated);
  console.log(
    `    (${srcData.length} em src/data + ${distData.length} em dist/ + ${embutidos.length} embutidos no HTML)`,
  );
}

// 18. Toda URL do sitemap resolve para um arquivo gerado, e nenhuma indexável
//     fica de fora.
//
//     A 6 já confere o sentido canônica -> sitemap. Esta confere o INVERSO, que
//     é o que pega um artigo segurado: a rota some, e se o sitemap continuasse a
//     listá-la o Search Console colheria 404. Desta vez o 404 durou um dia e se
//     resolveu sozinho porque o artigo voltou; foi sorte, e sorte não é método.
{
  const problems = [];
  const smFile = all.find((f) => /sitemap-\d+\.xml$/.test(f));

  if (!smFile) {
    problems.push('sitemap não gerado');
  } else {
    const have = new Set(all.map(rel));
    const locs = [...read(smFile).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

    // sitemap -> arquivo
    for (const loc of locs) {
      const p0 = new URL(loc).pathname.replace(/\/$/, '');
      const cands = p0 === '' ? ['index.html'] : [`${p0.slice(1)}.html`, `${p0.slice(1)}/index.html`];
      if (!cands.some((c) => have.has(c))) problems.push(`sitemap lista ${loc}, sem arquivo correspondente`);
    }

    // arquivo indexável -> sitemap
    const inSitemap = new Set(locs.map((l) => new URL(l).pathname.replace(/\/$/, '') || '/'));
    for (const f of pages) {
      if (/name="robots" content="noindex"/.test(read(f))) continue;
      const p0 = '/' + rel(f).replace(/\.html$/, '').replace(/\/index$/, '');
      const norm = p0 === '/index' ? '/' : p0;
      if (!inSitemap.has(norm)) problems.push(`${rel(f)} é indexável e não está no sitemap`);
    }
  }

  check('Sitemap e páginas geradas em correspondência 1:1', problems);
}

// 19. Nenhuma coluna nomeia o relógio de QUEM LÊ.
//
//     A /movers servia uma coluna "Now" contendo a última cotação vista ANTES
//     da largada. Às 15:51 ela mostrava "now" sobre uma corrida das 14:30: 93%
//     das linhas já tinham corrido, e o leitor não tinha como saber. O dado
//     estava certo; o rótulo nomeava um instante que muda conforme quem olha, e
//     numa página estática isso é sempre falso em algum momento do dia.
//
//     A regra 4 do handoff — todo número carrega o instante em que era verdade —
//     não é satisfeita por um carimbo no topo da página: cada COLUNA tem de se
//     ancorar num instante fixo ("last seen", "before the off"), nunca num
//     relativo ao relógio do leitor. Vale para o <th> e para o data-label, que
//     é o cabeçalho que o leitor de celular recebe no lugar dele.
{
  const CLOCKWORD = /\b(now|current|currently|live|today|tomorrow|yesterday)\b/i;
  const problems = [];

  for (const f of pages) {
    const html = read(f);
    for (const m of html.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)) {
      const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const hit = text.match(CLOCKWORD);
      if (hit) problems.push(`${rel(f)}: <th> "${text}" — "${hit[0]}" depende do relógio de quem lê`);
    }
    for (const m of html.matchAll(/data-label="([^"]*)"/g)) {
      const hit = m[1].match(CLOCKWORD);
      if (hit) problems.push(`${rel(f)}: data-label "${m[1]}" — "${hit[0]}" depende do relógio de quem lê`);
    }
  }

  check('Nenhuma coluna rotulada pelo relógio do leitor', [...new Set(problems)]);
}

// 20. Sem JavaScript, a página de dado continua inteira.
//
//     A /movers ganhou filtro e busca. Os dois escondem linhas que JÁ ESTÃO no
//     HTML — nada é buscado, nada é renderizado no cliente —, porque é o HTML
//     servido que o Google indexa e é ele que o leitor sem script recebe. Se um
//     refactor passar a renderizar só os notáveis e deixar o resto para o
//     JavaScript, as duas páginas de dado perdem a indexação em silêncio, que é
//     a falha mais cara possível para um site que aposta em ser achado.
//
//     Duas afirmações, e as duas são sobre o ARTEFATO:
//     (a) controle que só funciona com script nasce oculto — controle morto é
//         pior que controle nenhum;
//     (b) nenhuma linha de dado nasce oculta, e a contagem servida cobre o
//         arquivo inteiro. `>=` porque a tabela dos notáveis repete linhas que
//         a lista completa também traz.
{
  const problems = [];

  for (const f of pages) {
    const html = read(f);
    for (const m of html.matchAll(/<[a-z]+\b[^>]*\bdata-js-only\b[^>]*>/gi)) {
      if (!/\shidden(\s|=|>)/i.test(m[0])) {
        problems.push(`${rel(f)}: data-js-only sem hidden — ${m[0].slice(0, 60)}…`);
      }
    }
    for (const m of html.matchAll(/<tr\b[^>]*\bdata-mv-row\b[^>]*>/gi)) {
      if (/\shidden(\s|=|>)/i.test(m[0])) {
        problems.push(`${rel(f)}: linha de dado servida oculta — ${m[0].slice(0, 60)}…`);
      }
    }
  }

  const moversPage = pages.find((f) => rel(f) === 'movers.html');
  const moversData = 'src/data/movers.json';
  if (moversPage && fs.existsSync(moversData)) {
    const n = (JSON.parse(read(moversData)).runners || []).length;
    const served = [...read(moversPage).matchAll(/\bdata-mv-row\b/g)].length;
    if (served < n) {
      problems.push(`movers.html serve ${served} linhas para ${n} corredores no JSON — o resto ficaria só no cliente`);
    }
  }

  check('Página de dado completa no HTML servido', problems);
}

// 21. O atributo `hidden` vence no CSS servido.
//
//     O `display: none` de [hidden] vem da folha do NAVEGADOR, e QUALQUER regra
//     de autor o sobrepõe — não é questão de especificidade, é ordem de origem
//     na cascata. O modo lista do celular declara `.dense tr { display: block }`
//     e, sem um override explícito, abaixo de 720px o filtro da /movers não
//     esconderia linha nenhuma: o leitor de celular veria a lista inteira com o
//     aviso de "nenhum resultado" por cima. Nenhuma outra checagem enxerga isso,
//     porque o HTML está correto — quem mente é a folha de estilo.
//
//     Vale por todo bundle CSS servido, e exige o !important, que é o que
//     realmente fecha a cascata.
{
  const cssFiles = all.filter((f) => f.endsWith('.css'));
  const covers = cssFiles.some((f) =>
    /\[hidden\]\s*\{[^}]*display\s*:\s*none\s*!important/i.test(read(f).replace(/\s+/g, ' ')),
  );
  const problems = [];
  if (!cssFiles.length) problems.push('nenhum CSS em dist/ — o bundle sumiu?');
  else if (!covers) {
    problems.push('nenhum bundle declara [hidden] { display: none !important } — no celular o filtro não esconde nada');
  }
  check('O atributo hidden vence no CSS servido', problems);
}

// 22. O índice da margem não mente sobre a página.
//
//     A grade editorial pôs um índice de seções na coluna da direita. Em página
//     .astro os títulos são literais e não há como colhê-los no build, então o
//     índice é escrito à mão — e índice à mão sai de sincronia no primeiro edit,
//     em silêncio, porque um link para uma âncora que não existe não dá erro em
//     lugar nenhum: o navegador simplesmente não rola.
//
//     Duas afirmações, as duas sobre o ARTEFATO servido:
//     (a) todo item aponta para um id que existe NAQUELA página;
//     (b) o texto do item é o texto do heading, não uma paráfrase que envelheceu.
{
  const problems = [];
  const strip = (x) => x.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·')
    .replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/\s+/g, ' ').trim();

  for (const f of pages) {
    const html = read(f);
    // id → texto do heading, de TODOS os headings da página, não só dos h2:
    // um índice que aponta para um h3 também tem de bater.
    const headings = new Map();
    for (const m of html.matchAll(/<h[1-6]\b([^>]*)>([\s\S]*?)<\/h[1-6]>/gi)) {
      const id = m[1].match(/\bid="([^"]+)"/);
      if (id) headings.set(id[1], strip(m[2]));
    }

    for (const nav of html.matchAll(/<nav\b[^>]*\bdata-rail-index\b[\s\S]*?<\/nav>/gi)) {
      for (const a of nav[0].matchAll(/<a\b[^>]*href="#([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
        const [, id, label] = a;
        if (!headings.has(id)) {
          problems.push(`${rel(f)}: índice aponta para #${id}, que não existe na página`);
        } else if (headings.get(id) !== strip(label)) {
          problems.push(
            `${rel(f)}: índice diz "${strip(label)}" e o título é "${headings.get(id)}"`,
          );
        }
      }
    }
  }

  check('Índice da margem coerente com os títulos da página', problems);
}

// 23. O tema escuro cobre TODOS os tokens de cor, e os dois caminhos concordam.
//
//     Esta é a checagem que uma revisão visual não substitui. Esquecer um token
//     no bloco escuro não quebra nada: o valor claro simplesmente permanece, e o
//     resultado é um elemento invisível ou ilegível numa página que ninguém
//     abriu no tema em que o defeito aparece. Foi assim que o realce de sintaxe
//     entrou (checagem 10) e é assim que um --rule-med claro sobre fundo escuro
//     entraria.
//
//     E confere os DOIS caminhos do escuro:
//       :root[data-theme="dark"]                    → escolha explícita
//       @media (prefers-color-scheme: dark) :root:not([data-theme]) → sistema
//     Se divergirem, o mesmo leitor vê duas páginas diferentes conforme tenha
//     tocado no controle ou não — que é o defeito mais difícil de reproduzir que
//     existe.
{
  const css = fs.readFileSync('src/styles/tokens.css', 'utf8');
  const problems = [];

  // Pega o corpo de um bloco pelo seletor, contando chaves a partir dele.
  const bodyOf = (sel) => {
    const i = css.indexOf(sel);
    if (i < 0) return null;
    const open = css.indexOf('{', i + sel.length);
    if (open < 0) return null;
    let depth = 0;
    for (let j = open; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') {
        depth--;
        if (depth === 0) return css.slice(open + 1, j);
      }
    }
    return null;
  };

  const colours = (body) => {
    const out = new Map();
    if (!body) return out;
    for (const m of body.matchAll(/(--[\w-]+)\s*:\s*(#[0-9A-Fa-f]{3,8})\s*;/g)) {
      out.set(m[1], m[2].toLowerCase());
    }
    return out;
  };

  const light = colours(bodyOf(':root {'));
  const explicit = colours(bodyOf(':root[data-theme="dark"]'));
  const system = colours(bodyOf(':root:not([data-theme])'));

  if (!light.size) problems.push('tokens.css: não achei a paleta clara em :root');
  if (!explicit.size) problems.push('tokens.css: não achei :root[data-theme="dark"]');
  if (!system.size) problems.push('tokens.css: não achei :root:not([data-theme]) no bloco de media');

  for (const [name] of light) {
    if (!explicit.has(name)) problems.push(`tokens.css: ${name} não tem valor em data-theme="dark"`);
    if (!system.has(name)) problems.push(`tokens.css: ${name} não tem valor no escuro do sistema`);
  }
  for (const [name] of explicit) {
    if (!light.has(name)) problems.push(`tokens.css: ${name} existe só no escuro — a paleta clara está incompleta`);
    if (system.get(name) !== explicit.get(name)) {
      problems.push(
        `tokens.css: ${name} vale ${explicit.get(name)} por escolha e ${system.get(name)} pelo sistema`,
      );
    }
  }

  check('Tema escuro cobre todos os tokens de cor, e os dois caminhos concordam', problems);
  console.log(`    (${light.size} tokens de cor na paleta clara)`);
}

// ---------------------------------------------------------------------------
// 24 a 28: a /horse.
//
// Lidas do disco uma vez, porque as cinco checagens seguintes perguntam coisas
// diferentes do MESMO par (registro, página). Sem o acervo em mãos, cada uma
// teria de reabrir 678 arquivos.
// ---------------------------------------------------------------------------
const horseRecords = fs.existsSync('src/data/horses')
  ? walk('src/data/horses')
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(read(f)))
  : [];
const horseBySlug = new Map(horseRecords.map((h) => [h.slug, h]));
const horsePages = pages.filter((f) => /^horse[/\\][^/\\]+\.html$/.test(rel(f)));
const horseIndexPage = pages.find((f) => rel(f) === 'horse.html');
// As páginas de letra ficam um nível abaixo (`horse/letter/s.html`), então NÃO
// caem em `horsePages` — o que é o que se quer: as checagens 25, 26, 27 e 29
// perguntam de um cavalo, e uma letra não é um cavalo.
const letterPages = pages.filter((f) => /^horse[/\\]letter[/\\][^/\\]+\.html$/.test(rel(f)));
const LETTER_SEGMENT = 'letter';

// 24. Acervo e páginas em correspondência 1:1, e o índice servindo todo mundo.
//
//     O acervo cresce cerca de 600 registros por dia e nenhuma lista é escrita à
//     mão em lugar nenhum — o que torna esta a checagem mais barata de esquecer
//     e a mais cara de não ter. Um registro sem página é um cavalo que o índice
//     linka para o 404; uma página sem registro é conteúdo publicado que o
//     produtor já não reconhece. (A 7 pega o primeiro caso só se o link existir,
//     e a 18 pega o segundo só depois de o sitemap o listar. Nenhuma das duas
//     confere o que a ORIGEM diz.)
{
  const problems = [];
  const indexFile = 'src/data/horses-index.json';

  if (!horseRecords.length) {
    problems.push('src/data/horses/ sem nenhum registro — o prebuild rodou?');
  }
  if (!horseIndexPage) problems.push('dist/horse.html não existe — a página índice sumiu');

  if (fs.existsSync(indexFile)) {
    const declared = new Set(JSON.parse(read(indexFile)).horses.map((h) => h.slug));
    for (const slug of declared) {
      if (!horseBySlug.has(slug)) problems.push(`índice declara "${slug}" e não há registro em src/data/horses/`);
    }
    for (const slug of horseBySlug.keys()) {
      if (!declared.has(slug)) problems.push(`registro "${slug}" não está no índice do produtor`);
    }
  } else {
    problems.push(`${indexFile} ausente`);
  }

  const built = new Set(horsePages.map((f) => rel(f).replace(/^horse[/\\]/, '').replace(/\.html$/, '')));
  for (const slug of horseBySlug.keys()) {
    if (!built.has(slug)) problems.push(`registro "${slug}" não virou página`);
  }
  for (const slug of built) {
    if (!horseBySlug.has(slug)) problems.push(`dist/horse/${slug}.html não tem registro de origem`);
  }

  /*
    ⚠️ A METADE QUE MUDOU COM A PARTIÇÃO A–Z, e ela ficou MAIS exigente, não
    menos.

    Antes: a /horse tinha de servir uma linha por registro. Com 3.094 registros
    isso passou a ser uma página de 2,1 MB, e o acervo foi partido por letra.
    A exigência não caiu para "alguma página serve" — passou a ser sobre a
    UNIÃO: cada registro aparece em EXATAMENTE UMA página de letra, e a soma
    fecha com o acervo. Isso pega três coisas que a versão antiga não pegava:
    cavalo em nenhuma letra, cavalo em duas, e cavalo na letra errada.

    O alfabeto é fixo em 26, então a contagem de páginas também é: letra que
    some é link quebrado na navegação de todas as outras.
  */
  const vistos = new Map();
  for (const f of letterPages) {
    const letra = rel(f).replace(/^horse[/\\]letter[/\\]/, '').replace(/\.html$/, '');
    for (const m of read(f).matchAll(/<tr\b[^>]*\bdata-hz-row\b[^>]*>/g)) {
      const slug = m[0].match(/data-slug="([^"]+)"/)?.[1];
      if (!slug) {
        problems.push(`${rel(f)}: linha servida sem data-slug — não dá para conferir a cobertura`);
        continue;
      }
      if (vistos.has(slug)) problems.push(`"${slug}" aparece na letra ${vistos.get(slug)} E na ${letra}`);
      else vistos.set(slug, letra);
      const esperada = /^[a-z]/.test(slug) ? slug[0] : '#';
      if (letra !== esperada) problems.push(`"${slug}" está na letra ${letra} e devia estar na ${esperada}`);
    }
  }
  for (const slug of horseBySlug.keys()) {
    if (!vistos.has(slug)) problems.push(`"${slug}" não aparece em nenhuma página de letra`);
  }
  const ALFABETO = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const geradas = new Set(letterPages.map((f) => rel(f).replace(/^horse[/\\]letter[/\\]/, '').replace(/\.html$/, '')));
  for (const l of ALFABETO) {
    if (!geradas.has(l)) problems.push(`a letra ${l} não virou página — a navegação A–Z aponta para ela em toda página`);
  }
  for (const l of geradas) {
    if (!ALFABETO.includes(l)) problems.push(`página de letra "${l}" fora do alfabeto`);
  }

  // A palavra reservada da rota. O conflito seria só conceitual (profundidades
  // diferentes de caminho), mas seria confuso de depurar, e custa uma linha.
  if (horseBySlug.has(LETTER_SEGMENT)) {
    problems.push(`existe um cavalo de slug "${LETTER_SEGMENT}", que é o segmento reservado das páginas de letra`);
  }

  // E a porta continua servindo, inteiro, o cartão de que ela fala.
  if (horseIndexPage && fs.existsSync('src/data/horses.json')) {
    const naCarta = JSON.parse(read('src/data/horses.json')).horses.length;
    const servidas = [...read(horseIndexPage).matchAll(/\bdata-hz-row\b/g)].length;
    if (servidas < naCarta) {
      problems.push(`horse.html serve ${servidas} linhas para ${naCarta} declarados no cartão — o resto ficaria só no cliente`);
    }
  }

  check('Acervo, índice e páginas de cavalo em correspondência 1:1', problems);
  console.log(
    `    (${horseBySlug.size} registros, ${horsePages.length} páginas de cavalo, ${letterPages.length} páginas de letra, ${vistos.size} linhas servidas)`,
  );
}

// 25. Os três estados, e a palavra que cada um exige.
//
//     ESTA É A CHECAGEM QUE A PÁGINA EXISTIA PARA TER. O defeito que a segurou
//     foi escrever "debut" para um cavalo `no_record`, e errava por cerca de
//     quatro vezes. São afirmações opostas:
//
//       debut      → não há corrida registrada antes desta data.
//                    É afirmação SOBRE O CAVALO.
//       no_record  → correu antes, e não está no nosso arquivo.
//                    É confissão SOBRE NÓS.
//
//     Trocar uma pela outra transforma lacuna nossa em fato sobre o animal. As
//     frases são IMPORTADAS de src/lib/horse-copy.mjs, o mesmo módulo que a
//     página usa: uma lista aqui e outra lá divergiriam no primeiro edit.
//
//     Os nomes próprios da página (cavalo, jóquei, treinador, garanhão, pista)
//     são REMOVIDOS antes de procurar a frase proibida. Sem isso, um garanhão
//     chamado "Debut" quebraria o build por um motivo que não é o defeito.
{
  const problems = [];
  for (const f of horsePages) {
    const slug = rel(f).replace(/^horse[/\\]/, '').replace(/\.html$/, '');
    const h = horseBySlug.get(slug);
    if (!h) continue;
    const html = read(f);
    const copy = STATUS_COPY[h.status];
    if (!copy) {
      problems.push(`${rel(f)}: status "${h.status}" não tem texto declarado`);
      continue;
    }

    const required =
      h.status === 'debut'
        ? copy.sentence({ asOf: h.as_of })
        : h.status === 'no_record'
          ? copy.sentence()
          : copy.sentence({ asOf: h.as_of, runs: h.career.runs });
    if (!html.includes(required)) {
      problems.push(`${rel(f)} (${h.status}): falta a frase do estado — "${required.slice(0, 60)}…"`);
    }

    // ⚠️ ESTA LISTA CRESCE COM A PÁGINA. Todo nome próprio novo que a página
    //    publicar tem de entrar aqui, senão o build quebra por um motivo que
    //    não é o defeito. Já aconteceu em 2026-09-24, quando o contrato v2
    //    trouxe `dam` e a égua "Debutante's Ball" apareceu numa página
    //    `has_history`: a palavra proibida era o nome da mãe, não uma
    //    afirmação nossa sobre o cavalo.
    // O HTML servido traz as entidades escapadas — "Debutante's Ball" chega
    // como `Debutante&#39;s Ball` —, então raspar pelo nome cru não casa nada.
    // Desescapa ANTES de raspar: conserta de uma vez todo nome com apóstrofo ou
    // e-comercial, e não só o que quebrou hoje.
    let scrubbed = html
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    for (const n of [h.name, h.jockey?.name, h.trainer?.name, h.sire?.name, h.last_declared?.venue,
                     h.ident?.dam, h.ident?.damsire, h.ident?.owner,
                     h.jockey_here?.name, h.trainer_here?.name,
                     h.jockey_trainer?.jockey, h.jockey_trainer?.trainer,
                     ...(h.by_course || []).map((g) => g.key)]) {
      if (n) scrubbed = scrubbed.split(n).join('·');
    }
    for (const bad of copy.forbidden) {
      if (scrubbed.toLowerCase().includes(bad.toLowerCase())) {
        problems.push(`${rel(f)} (${h.status}): a página usa a palavra do OUTRO estado — "${bad}"`);
      }
    }
  }
  check('Cada estado com a sua palavra, e sem a do outro', problems);
}

// 26. O limite do arquivo aparece na PÁGINA, não só no JSON.
//
//     "Career: 83 runs" sem dizer até quando mente por omissão: o arquivo
//     termina numa data e o que veio depois simplesmente não está ali. Vale
//     inclusive para as páginas sem número nenhum — é lá que a lacuna é a única
//     informação que temos a dar.
//
//     A data conferida é a DO REGISTRO. Registros acumulados de dias diferentes
//     carregam cortes diferentes, e uma data global na página seria falsa para a
//     maioria deles no dia seguinte.
{
  const problems = [];
  for (const f of horsePages) {
    const slug = rel(f).replace(/^horse[/\\]/, '').replace(/\.html$/, '');
    const h = horseBySlug.get(slug);
    if (!h) continue;
    // Sem carimbo no registro não há o que conferir, e `ukDate` de `undefined`
    // LANÇA — o que derrubaria o verify no meio e engoliria o relatório das
    // outras checagens. (Aconteceu no teste de quebra da 17a: a 17 anotava o
    // problema certo e a 26 explodia antes de alguém o ler.) A ausência é
    // reportada como problema, não como exceção.
    if (!h.history_through || Number.isNaN(Date.parse(h.history_through))) {
      problems.push(`${rel(f)}: o registro não traz history_through utilizável`);
      continue;
    }
    const expected = `${ARCHIVE_PREFIX}${ukDate(h.history_through)}`;
    if (!read(f).includes(expected)) {
      problems.push(`${rel(f)}: não diz o corte do arquivo — esperado "${expected}"`);
    }
  }
  check('Toda página de cavalo declara até quando o arquivo vai', problems);
}

// 27. Nenhuma taxa sem a amostra ao lado.
//
//     "23.5% on good" sem o `runs = 17` é o número que um leitor usaria para
//     apostar. Duas metades:
//
//     (a) UNIVERSAL, em todas as páginas: numa tabela que TEM coluna de
//         amostra, nenhuma linha pode mostrar porcentagem com a célula de
//         amostra vazia. Vale para /movers e /extra-places também, e é por isso
//         que a regra fala de "tabela com coluna Runs" em vez de "página de
//         cavalo": um filtro por família de página é exatamente o escopo curto
//         que já nos custou três incidentes.
//     (b) nas páginas de cavalo: TODA tabela tem de ter a coluna de amostra.
//         Sem esta metade, apagar a coluna faria a metade (a) passar sorrindo.
{
  const problems = [];
  const cellText = (td) => td.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

  for (const f of pages) {
    const html = read(f);
    for (const t of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
      const table = t[1];
      const heads = [...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => cellText(m[1]));
      const hasSample = heads.includes('Runs');
      if (!hasSample) continue;
      for (const r of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const row = r[1];
        if (!/%/.test(row)) continue;
        const sample = [...row.matchAll(/<td\b[^>]*data-label="Runs"[^>]*>([\s\S]*?)<\/td>/gi)]
          .map((m) => cellText(m[1]));
        if (!sample.length || sample.every((x) => x === '')) {
          problems.push(`${rel(f)}: linha com taxa e sem amostra — ${cellText(row).slice(0, 70)}`);
        }
      }
    }
  }

  for (const f of horsePages) {
    for (const t of read(f).matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
      const heads = [...t[1].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => cellText(m[1]));
      if (!heads.includes('Runs')) {
        problems.push(`${rel(f)}: tabela sem coluna de amostra — ${heads.join(', ') || '(sem cabeçalho)'}`);
      }
    }
  }

  check('Nenhuma taxa publicada sem a amostra na mesma linha', [...new Set(problems)]);
}

// 28. Título e descrição distintos DE VERDADE.
//
//     Setecentas páginas novas de uma vez só são um risco de SEO assumido com a
//     decisão na mesa, e a forma de errá-lo é publicar gabarito com o nome
//     trocado. O teste tira o nome do cavalo da frase: se o que sobra é o mesmo
//     em fatia grande do acervo, a descrição não descreve nada.
//
//     O limiar é 25% e é generoso de propósito — com números reais dentro da
//     frase, a maior classe hoje fica em poucos por cento. Ele pega a regressão
//     (alguém simplificar para "Form and statistics for <nome>"), não a
//     semelhança natural entre dois cavalos parecidos.
{
  const problems = [];
  const titles = new Map();
  const shapes = new Map();

  for (const f of horsePages) {
    const slug = rel(f).replace(/^horse[/\\]/, '').replace(/\.html$/, '');
    const h = horseBySlug.get(slug);
    const html = read(f);
    const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
    const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';

    if (!title) problems.push(`${rel(f)}: sem <title>`);
    if (!desc) problems.push(`${rel(f)}: sem meta description`);
    if (titles.has(title)) problems.push(`${rel(f)}: título idêntico ao de ${titles.get(title)}`);
    else titles.set(title, rel(f));

    // O nome fora, o que sobra é o "molde" daquela descrição.
    const shape = h ? desc.split(h.name).join('·') : desc;
    shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
  }

  let detail = null;
  if (horsePages.length) {
    const [worst, n] = [...shapes.entries()].sort((a, b) => b[1] - a[1])[0];
    const share = n / horsePages.length;
    if (share > 0.25) {
      problems.push(
        `${n} de ${horsePages.length} descrições (${(share * 100).toFixed(0)}%) são a mesma frase com o nome trocado: "${worst.slice(0, 80)}…"`,
      );
    }
    detail = `    (${shapes.size} moldes de descrição em ${horsePages.length} páginas; o maior cobre ${(share * 100).toFixed(1)}%)`;
  }

  check('Título e descrição por cavalo distintos de verdade', problems);
  if (detail) console.log(detail);
}

// 29. Nenhuma faixa de distância aparece sem a fronteira que a define.
//
//     "27% em staying" é ilegível sem saber o que é staying, e até 2026-09-20 o
//     contrato não publicava as fronteiras — a página se recusava a inventá-las,
//     o que estava certo e deixava o número inconferível. Agora a origem as
//     emite a partir da MESMA lista que classifica, e esta checagem garante que
//     a definição chegue à TELA, não só ao JSON.
//
//     Duas metades, porque uma sozinha não prende:
//     (a) toda linha da tabela de faixa carrega a sua definição na página;
//     (b) toda chave usada nos registros existe em `distance_bands`. Sem (b),
//         o produtor acrescentar uma quinta faixa passaria despercebido até
//         alguém reparar num rótulo faltando.
{
  const problems = [];
  const cardFile = 'src/data/horses.json';
  const bands = fs.existsSync(cardFile) ? JSON.parse(read(cardFile)).distance_bands : null;

  if (!Array.isArray(bands) || !bands.length) {
    problems.push(`${cardFile}: sem distance_bands — as faixas na tela ficariam sem definição`);
  } else {
    const known = new Set(bands.map((b) => b.key));
    for (const b of bands) {
      if (!b.label) problems.push(`distance_bands: a faixa "${b.key}" não tem label publicável`);
    }
    for (const h of horseRecords) {
      for (const g of h.by_distance || []) {
        if (!known.has(g.key)) problems.push(`${h.slug}: faixa "${g.key}" não está em distance_bands`);
      }
      const d = h.last_declared?.distance;
      if (d && !known.has(d)) problems.push(`${h.slug}: faixa declarada "${d}" não está em distance_bands`);
    }
  }

  // (a) no artefato: na tabela cujo cabeçalho é "Distance band", toda linha do
  //     corpo traz a definição junto do nome da faixa.
  const cellText = (x) => x.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  for (const f of horsePages) {
    for (const t of read(f).matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
      const table = t[1];
      const first = table.match(/<th\b[^>]*>([\s\S]*?)<\/th>/i);
      if (!first || cellText(first[1]) !== 'Distance band') continue;
      for (const r of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const cell = r[1].match(/<td\b[^>]*data-label="Distance band"[^>]*>([\s\S]*?)<\/td>/i);
        if (!cell) continue;
        // Casa o TOKEN da classe, não a string inteira do atributo: a faixa
        // usa `class="sub plain"` (notação em minúscula), e um teste por
        // igualdade literal acusaria as 863 páginas por uma classe a mais.
        if (!/class="[^"]*\bsub\b[^"]*"/.test(cell[1])) {
          problems.push(`${rel(f)}: faixa "${cellText(cell[1])}" sem a definição ao lado`);
        }
      }
    }
  }

  check('Toda faixa de distância publicada com a fronteira que a define', [...new Set(problems)]);
}

// 30. O carimbo da COLETA chega à tela, e não só ao JSON.
//
//     A checagem 17 exige o campo no arquivo; esta exige que ele vire idade na
//     página. São perguntas diferentes, e a distância entre as duas é o buraco
//     por onde a regra 4 cai calada: um `collected_through` perfeito no JSON e
//     uma página que mostra `generated_at` faz "a coleta quebrou" se disfarçar
//     de "não há corrida hoje".
//
//     O marcador é o `data-collected` que o componente DataAge emite quando
//     conhece o instante, ou `data-state="unknown"` quando não conhece — o
//     segundo é resposta legítima e tem de ser declarada, nunca omitida.
{
  const problems = [];
  const CARIMBADAS = (f) => {
    const r = rel(f);
    return r === 'horse.html' || r === 'movers.html' || r === 'extra-places.html' || /^horse[/\\]/.test(r);
  };
  for (const f of pages.filter(CARIMBADAS)) {
    const html = read(f);
    if (!/class="age"[^>]*data-collected="/.test(html) && !/class="age"[^>]*data-state="unknown"/.test(html)) {
      problems.push(`${rel(f)}: publica figuras de um arquivo de dado e não mostra o carimbo da coleta`);
    }
  }
  check('A idade da COLETA aparece em toda página de dado', problems);
}

// 31. O `lastmod` do sitemap diz a verdade sobre CADA URL.
//
//     Ele era `new Date()` carimbado nas 3.888 URLs. Com ~4 builds por dia,
//     isso avisava o Google quatro vezes ao dia de que /cookies, /privacy e
//     3.847 páginas de cavalo tinham mudado juntas. O Google só usa `lastmod`
//     de quem se mostra confiável — e é `lastmod` o mecanismo que traz o
//     rastreio de volta sozinho, sem reenvio manual de sitemap. Mentir ali é
//     desligar exatamente a peça que se quer usar.
//
//     Três perguntas, e a terceira é a que não é circular:
//       (a) as datas não são todas iguais, e nenhuma está no futuro;
//       (b) cada página de cavalo leva o `last_declared` DELE no índice;
//       (c) cada página de letra leva o maior `lastmod` entre os cavalos que
//           ela REALMENTE lista no HTML — lido da página, não da regra de
//           partição. Se o config e `letterOf` se separarem, esta acusa.
{
  const problems = [];
  const xml = sitemapFile ? read(sitemapFile) : '';
  const entradas = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)]
    .map((m) => ({ loc: m[1].replace(/\/$/, ''), lastmod: m[2] ?? null }));

  if (!entradas.length) {
    problems.push('sitemap sem nenhuma entrada legível');
  } else {
    // (a)
    const datas = entradas.map((e) => e.lastmod).filter(Boolean);
    const distintas = new Set(datas);
    if (distintas.size <= 1) {
      problems.push(
        `sitemap com ${distintas.size} lastmod distinto em ${entradas.length} URLs — ` +
        'é a assinatura do carimbo de build, não de mudança real',
      );
    }
    const agora = Date.now();
    for (const e of entradas) {
      if (e.lastmod && Date.parse(e.lastmod) > agora + 60_000) {
        problems.push(`${e.loc}: lastmod ${e.lastmod} está no futuro`);
      }
    }

    // (b)
    //
    // O `@astrojs/sitemap` normaliza `2026-09-22` para ISO completo, então a
    // comparação é por DIA: é a granularidade de `last_declared`, e exigir a
    // string crua faria a checagem falhar por formatação em vez de por dado.
    const soODia = (d) => (d ?? '').slice(0, 10);
    const idx = JSON.parse(read('src/data/horses-index.json'));
    const esperado = new Map(idx.horses.map((h) => [h.slug, h.last_declared]));
    const porLoc = new Map(entradas.map((e) => [e.loc, e.lastmod]));
    for (const [slug, d] of esperado) {
      if (!d) continue;
      const loc = `https://mazetick.com/horse/${slug}`;
      if (!porLoc.has(loc)) continue;
      if (soODia(porLoc.get(loc)) !== d) {
        problems.push(`${loc}: lastmod ${porLoc.get(loc)} ≠ last_declared ${d}`);
      }
    }

    // (c)
    for (const f of pages.filter((f) => /^horse[/\\]letter[/\\]/.test(rel(f)))) {
      const loc = `https://mazetick.com/horse/letter/${rel(f).replace(/.*[/\\]/, '').replace(/\.html$/, '')}`;
      const declarado = porLoc.get(loc);
      const listados = [...new Set(
        [...read(f).matchAll(/href="\/horse\/([a-z0-9-]+)"/g)].map((m) => m[1]),
      )].map((sl) => esperado.get(sl)).filter(Boolean);
      if (!listados.length) continue;
      const maiorListado = listados.reduce((a, b) => (a > b ? a : b));
      if (soODia(declarado) !== maiorListado) {
        problems.push(
          `${loc}: lastmod ${declarado} ≠ ${maiorListado}, que é o mais recente ` +
          `entre os ${listados.length} cavalos que a página lista`,
        );
      }
    }
  }

  check('O lastmod do sitemap diz a verdade sobre cada URL', problems);
}

// 32. "a" ou "an" antes de porcentagem, pelo SOM do número.
//
//     Terceira aparição desta família no projeto: o substantivo ("1 horse" com
//     "runs") virou `plural`, o verbo ("1 horse … share a name") virou `verb`,
//     e em 2026-09-24 saiu "a 18.5% strike rate" — o inglês quer "an eighteen
//     point five". O gerador não ouve o que escreve.
//
//     Confere nos DOIS sentidos: "a" onde cabia "an" e "an" onde cabia "a".
//     Só um dos lados deixaria o erro inverso passar sorrindo.
{
  const problems = [];
  for (const f of pages) {
    const texto = read(f).replace(/<[^>]+>/g, ' ');
    for (const m of texto.matchAll(/\b(an?) (\d[\d.,]*)%/g)) {
      const certo = artigo(m[2].replace(/,/g, ''));
      if (m[1] !== certo) {
        problems.push(`${rel(f)}: "${m[1]} ${m[2]}%" — o certo é "${certo}"`);
      }
    }
  }
  check('Artigo concorda com o som do número', [...new Set(problems)]);
}

console.log();
if (fail.length) {
  console.error(`FALHOU: ${fail.map((f) => f.name).join(' · ')}`);
  process.exit(1);
}
console.log('Tudo certo.');
