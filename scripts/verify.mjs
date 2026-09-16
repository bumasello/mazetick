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
import { inlineScripts, sha256 } from './headers.mjs';

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
    const T = '(?:a|span|strong|em|code|b|i)';
    const rx = new RegExp(`.{20}(?:\\w<${T}[^>]*>\\S|\\S</${T}>\\w).{20}`, 'g');
    const m = read(f).match(rx);
    return m ? m.map((s) => `${rel(f)}: …${s.replace(/\s+/g, ' ')}…`) : [];
  }),
);

// 3. Estado inicial indexável: o HTML servido sai sempre em full.
check(
  'data-density="full" no HTML servido',
  pages.filter((f) => !/<html[^>]*data-density="full"/.test(read(f))).map(rel),
);

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

    for (const f of pages) {
      for (const body of inlineScripts(read(f))) {
        const hash = sha256(body);
        if (!h.includes(hash)) {
          problems.push(`${rel(f)}: script inline sem hash na CSP (${hash.slice(0, 24)}…)`);
        }
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
    const PAGE_TYPES = new Set(['Article', 'NewsArticle', 'BlogPosting', 'WebPage']);
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
  const srcData = fs.existsSync('src/data')
    ? fs.readdirSync('src/data').filter((f) => f.endsWith('.json')).map((f) => path.join('src/data', f))
    : [];

  // Todo JSON que chega a dist/ é publicamente acessível, consumido pelo site
  // ou não — e um `.json` público com payload de fornecedor é export acidental,
  // que a regra 6 proíbe por escrito. Hoje nenhum chega, então esta metade
  // passa trivialmente; é justamente o caso de "olhar o lugar errado" que este
  // projeto já pagou três vezes, e o custo de varrer é zero.
  const distData = all.filter((f) => f.endsWith('.json'));
  const dataFiles = [...srcData, ...distData];

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
  const TERMS = ['win_odds', 'ew_odds', 'betfair', 'bsp', 'selection_id', 'market_id', 'price', 'odds'];
  const BANNED = new RegExp(`(?:^|[^A-Za-z0-9])(${TERMS.join('|')})(?:[^A-Za-z0-9]|$)`, 'i');
  // Vazia, e que continue assim. Cada nome aqui é uma exceção que alguém teve
  // de justificar por escrito no commit que a acrescentou.
  const ALLOW = new Set([]);
  const forbidden = (k) => !ALLOW.has(k) && BANNED.test(k);

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

    // Só os JSON que ALIMENTAM a página carregam contrato de carimbo. Um .json
    // qualquer em dist/ (manifest, etc.) tem de passar pela 16, não pela 17.
    if (!srcData.includes(f)) continue;

    if (!json.generated_at || Number.isNaN(Date.parse(json.generated_at))) {
      undated.push(`${f}: generated_at ausente ou não parseável`);
    }

    // `collected_through` pode ser null de forma legítima — é o produtor
    // dizendo "não havia arquivo do coletor hoje", e a página trata isso como o
    // estado mais grave. O que não pode é a CHAVE sumir: aí a página voltaria a
    // exibir `generated_at` como se fosse frescor, sem nada denunciar.
    if (!('collected_through' in json)) {
      undated.push(`${f}: collected_through ausente — a idade na tela viraria a da derivação`);
    } else if (
      json.collected_through !== null &&
      Number.isNaN(Date.parse(json.collected_through))
    ) {
      undated.push(`${f}: collected_through não parseável (${JSON.stringify(json.collected_through)})`);
    }
  }

  check('Sem campo proibido nos JSON de dados', banned);
  check('Todo JSON de dados carimbado: generated_at e collected_through', undated);
  console.log(`    (${srcData.length} em src/data + ${distData.length} em dist/ varridos)`);
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

console.log();
if (fail.length) {
  console.error(`FALHOU: ${fail.map((f) => f.name).join(' · ')}`);
  process.exit(1);
}
console.log('Tudo certo.');
