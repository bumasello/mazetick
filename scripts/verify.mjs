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
  'Espaçamento em volta de <a> inline',
  pages.flatMap((f) => {
    const m = read(f).match(/.{20}(\w<a |<\/a>\w).{20}/g);
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

console.log();
if (fail.length) {
  console.error(`FALHOU: ${fail.map((f) => f.name).join(' · ')}`);
  process.exit(1);
}
console.log('Tudo certo.');
