/**
 * Baixa os JSON de dados antes do build.
 *
 * ⚠️ FALHA O BUILD se o download falhar, e isso é o comportamento correto: sem
 * deploy novo, a versão anterior continua no ar. A alternativa — degradar para
 * "sem corridas hoje" — MENTE para o leitor, e num portal cuja tese é "todo
 * número carrega o instante em que era verdade" essa mentira é a pior possível.
 *
 * Por isso também: o arquivo baixado é gitignored. Uma cópia velha commitada
 * poderia ser usada em silêncio num build sem rede, que é exatamente a falha
 * que este script existe para impedir.
 *
 * São DOIS caminhos de download, e por motivo:
 *   - arquivo avulso (extra-places, movers): um GET por arquivo;
 *   - tarball do repositório (horses): os registros por cavalo e o índice TÊM
 *     de vir do mesmo commit, senão o índice lista um cavalo cujo registro
 *     ainda não existe (ou o contrário) e a página sai torta sem nada acusar.
 *     O tarball é atômico e custa um pedido em vez de 679.
 */
import fs from 'node:fs';
import path from 'node:path';
import { untarGz } from './untar.mjs';
import { stampProblems } from './data-contract.mjs';

const REPO = 'bumasello/mazetick-data';
const RAW = `https://raw.githubusercontent.com/${REPO}/main/data`;
const TARBALL = `https://codeload.github.com/${REPO}/tar.gz/refs/heads/main`;

const SOURCES = [
  { name: 'extra-places', url: `${RAW}/extra-places.json`, schema: 'extra_places_v1', out: 'src/data/extra-places.json', listKey: 'races' },
  { name: 'movers', url: `${RAW}/movers.json`, schema: 'movers_v1', out: 'src/data/movers.json', listKey: 'runners' },
];

const TIMEOUT_MS = 60_000;

const die = (lines) => {
  for (const l of lines) console.error(l);
  console.error('  O build PARA aqui de propósito: sem deploy, a versão anterior segue no ar.');
  process.exit(1);
};

async function get(url, as = 'text') {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Idade da coleta, no mesmo relógio que a página mostra ao leitor. */
const age = (iso) => (iso ? `${((Date.now() - Date.parse(iso)) / 3.6e6).toFixed(1)}h` : 'IDADE DESCONHECIDA');

// ---------------------------------------------------------------------------
// 1. Arquivos avulsos
// ---------------------------------------------------------------------------
for (const src of SOURCES) {
  let body;
  try {
    body = await get(src.url);
  } catch (e) {
    die([`\n✗ ${src.name}: download falhou — ${e.message}`, `  ${src.url}`]);
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch (e) {
    die([`\n✗ ${src.name}: resposta não é JSON — ${e.message}`]);
  }

  // Validação de forma na porta de entrada. Um JSON que chega diferente do
  // contrato tem de parar aqui, não virar página com buraco. Os carimbos saem
  // de data-contract.mjs, o MESMO arquivo que o verify.mjs lê — duas listas da
  // mesma regra divergem em silêncio.
  const problems = [...stampProblems(src.out, data)];
  if (data.schema !== src.schema) problems.push(`schema "${data.schema}", esperado "${src.schema}"`);
  if (!Array.isArray(data[src.listKey])) problems.push(`${src.listKey} não é lista`);
  if (problems.length) die([`\n✗ ${src.name}: contrato violado`, ...problems.map((p) => `  - ${p}`)]);

  fs.mkdirSync(path.dirname(src.out), { recursive: true });
  fs.writeFileSync(src.out, body);
  console.log(
    `✓ ${src.name}: ${data[src.listKey].length} ${src.listKey}, coletado até ${data.collected_through} (${age(data.collected_through)}), derivado ${data.generated_at}, ${(body.length / 1024).toFixed(0)}KB`,
  );
}

// ---------------------------------------------------------------------------
// 2. Cavalos, por tarball
// ---------------------------------------------------------------------------
{
  const OUT_DIR = 'src/data/horses';
  let entries;
  try {
    entries = untarGz(await get(TARBALL, 'buffer'));
  } catch (e) {
    die([`\n✗ horses: tarball falhou — ${e.message}`, `  ${TARBALL}`]);
  }

  // O tarball do GitHub vem com um diretório raiz "<repo>-<ref>/".
  const pick = (suffix) => {
    const k = [...entries.keys()].find((n) => n.endsWith(`/data/${suffix}`));
    return k ? entries.get(k).toString('utf8') : null;
  };

  const cardRaw = pick('horses.json');
  const indexRaw = pick('horses-index.json');
  if (!cardRaw || !indexRaw) die(['\n✗ horses: o tarball não traz horses.json e/ou horses-index.json']);

  let card;
  let index;
  try {
    card = JSON.parse(cardRaw);
    index = JSON.parse(indexRaw);
  } catch (e) {
    die([`\n✗ horses: JSON do tarball não parseia — ${e.message}`]);
  }

  const problems = [
    ...stampProblems('src/data/horses.json', card),
    ...stampProblems('src/data/horses-index.json', index),
  ];
  if (card.schema !== 'horses_v4') problems.push(`horses.json: schema "${card.schema}", esperado "horses_v4"`);

  // A DECLARAÇÃO DA JANELA É OBRIGATÓRIA, e é conferida na chegada.
  // Sem ela a página volta a dizer "all progeny in our archive" sobre um
  // arquivo fino de um lado só. Prometida pela origem não basta — a origem
  // já prometia criação e entregava metade.
  const cov = card.breeding_coverage;
  if (!cov) {
    problems.push('horses.json: falta `breeding_coverage` — a janela da criação tem de ser declarada');
  } else {
    for (const campo of ['complete_through', 'partial_from', 'runners_in_window',
                         'with_breeding', 'pct']) {
      if (cov[campo] === undefined || cov[campo] === null) {
        problems.push(`breeding_coverage: falta \`${campo}\``);
      }
    }
    if (cov.with_breeding > cov.runners_in_window) {
      problems.push(`breeding_coverage: with_breeding ${cov.with_breeding} > runners_in_window ${cov.runners_in_window}`);
    }
    const esperado = Math.round((100 * cov.with_breeding) / cov.runners_in_window * 10) / 10;
    if (Math.abs(esperado - cov.pct) > 0.05) {
      problems.push(`breeding_coverage: pct ${cov.pct} não bate com ${cov.with_breeding}/${cov.runners_in_window} = ${esperado}`);
    }
    if (cov.pct >= 100) {
      problems.push('breeding_coverage: pct 100 — se a fonte consertou, a declaração sai da página; confira antes');
    }
  }
  if (index.schema !== 'horses_index_v1') problems.push(`horses-index.json: schema "${index.schema}", esperado "horses_index_v1"`);
  if (!Array.isArray(card.horses)) problems.push('horses.json: horses não é lista');
  if (!Array.isArray(index.horses)) problems.push('horses-index.json: horses não é lista');
  else if (index.count !== index.horses.length) {
    problems.push(`horses-index.json: count diz ${index.count} e a lista tem ${index.horses.length}`);
  }
  // O cartão conta os próprios estados em campos de topo. Se a contagem não
  // bater com a lista, um dos dois está errado e não há como saber qual — e é
  // um número que a página publica. Conferir custa duas linhas.
  if (Array.isArray(card.horses)) {
    for (const [field, status] of [['debutants', 'debut'], ['no_record', 'no_record']]) {
      const n = card.horses.filter((x) => x.status === status).length;
      if (card[field] !== n) {
        problems.push(`horses.json: ${field} diz ${card[field]} e a lista traz ${n} com status "${status}"`);
      }
    }
  }

  // v2 (2026-09-24): os quatro blocos de relação chegam com PISO de amostra
  // prometido pela origem — dupla 10, jóquei/treinador-com-o-cavalo 2, garanhão
  // por faixa 20. O piso não é enfeite: uma dupla com 3 montarias e 33% é ruído
  // com cara de achado, e é o número que um leitor usaria para apostar. Se a
  // origem regredir, a página publicaria a taxa sem ninguém notar — então o
  // piso se confere na CHEGADA, não se confia na promessa.
  //
  // E `runs: 0` em bloco derivado é proibido pelo mesmo motivo de sempre:
  // "0 de 0" na tela lê-se como medição e é ausência de dado.
  if (Array.isArray(card.horses)) {
    const PISOS = {
      jockey_trainer: 10, jockey_here: 2, trainer_here: 2, sire_at_distance: 20,
      // v3: recortar por pista/faixa afina a amostra, então o piso é o da dupla.
      jockey_at_course: 10, jockey_at_distance: 10,
      trainer_at_course: 10, trainer_at_distance: 10,
      // Nos recentes a CONTAGEM é a informação, então o piso é 1 — mas zero
      // continua proibido: "0 corridas em 30 dias" é um bloco que não devia
      // existir, e a ausência já diz isso.
      recent_30d: 1, recent_90d: 1,
    };
    const violados = [];
    const zerados = [];
    const maiores = [];
    for (const h of card.horses) {
      for (const [campo, piso] of Object.entries(PISOS)) {
        const b = h[campo];
        if (!b) continue;
        if (b.runs === 0) zerados.push(`${h.slug}.${campo}`);
        else if (b.runs < piso) violados.push(`${h.slug}.${campo}=${b.runs}<${piso}`);
      }
      // 30 dias não pode trazer mais corridas que 90, e nenhum recorte pode
      // exceder a carreira. São contradições aritméticas: se aparecerem, o
      // número está errado e a página publicaria a contradição.
      if (h.recent_30d && h.recent_90d && h.recent_30d.runs > h.recent_90d.runs) {
        maiores.push(`${h.slug}.recent_30d=${h.recent_30d.runs}>90d=${h.recent_90d.runs}`);
      }
      if (typeof h.days_since_last_run === 'number' && h.days_since_last_run < 0) {
        maiores.push(`${h.slug}.days_since_last_run=${h.days_since_last_run}`);
      }
      // O cavalo não pode ter corrido MAIS vezes com um jóquei do que no total.
      for (const campo of ['jockey_here', 'trainer_here', 'recent_30d', 'recent_90d']) {
        if (h[campo] && h.career && h[campo].runs > h.career.runs) {
          maiores.push(`${h.slug}.${campo}=${h[campo].runs}>career=${h.career.runs}`);
        }
      }
    }
    if (violados.length) problems.push(`horses.json: ${violados.length} bloco(s) abaixo do piso — ${violados.slice(0, 3).join(', ')}`);
    if (zerados.length) problems.push(`horses.json: ${zerados.length} bloco(s) derivado(s) com runs=0 — ${zerados.slice(0, 3).join(', ')}`);
    if (maiores.length) problems.push(`horses.json: ${maiores.length} parceria(s) maior que a carreira — ${maiores.slice(0, 3).join(', ')}`);
  }

  if (problems.length) die(['\n✗ horses: contrato violado', ...problems.map((p) => `  - ${p}`)]);

  // O diretório é RECONSTRUÍDO, não mesclado. Registro que sumiu da origem tem
  // de sumir daqui: senão sobra uma página que o índice não lista, e o site
  // publicaria um cavalo que o produtor já não reconhece.
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const wanted = new Map(index.horses.map((h) => [h.slug, h]));
  const written = new Set();
  const bad = [];
  let bytes = 0;

  for (const [name, buf] of entries) {
    const m = name.match(/\/data\/horses\/([^/]+)\/([^/]+)\.json$/);
    if (!m) continue;
    const [, bucket, slug] = m;
    if (!wanted.has(slug)) {
      bad.push(`registro "${slug}" não está no índice`);
      continue;
    }
    let rec;
    try {
      rec = JSON.parse(buf.toString('utf8'));
    } catch (e) {
      bad.push(`${slug}: não parseia — ${e.message.slice(0, 40)}`);
      continue;
    }
    // O bucket é derivado do slug na origem; se um dia deixar de ser, a página
    // continuaria funcionando (lemos o diretório inteiro) mas a URL do dado e o
    // slug deixariam de concordar. Barato de conferir, caro de descobrir depois.
    if (bucket !== slug.slice(0, 2)) bad.push(`${slug}: está no diretório "${bucket}"`);
    if (rec.slug !== slug) bad.push(`${slug}: o registro diz slug "${rec.slug}"`);
    if (!['has_history', 'debut', 'no_record'].includes(rec.status)) {
      bad.push(`${slug}: status desconhecido "${rec.status}"`);
    }
    // ⚠️ Cada registro carrega o SEU carimbo. Um registro acumulado de ontem
    // tem `history_through` de ontem, e a página dele tem de dizer aquela data,
    // não a de hoje.
    bad.push(...stampProblems(`src/data/horses/${bucket}/${slug}.json`, rec));

    const dir = path.join(OUT_DIR, bucket);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${slug}.json`), buf);
    written.add(slug);
    bytes += buf.length;
  }

  for (const slug of wanted.keys()) {
    if (!written.has(slug)) bad.push(`índice lista "${slug}" e o tarball não traz o registro`);
  }
  if (bad.length) {
    die(['\n✗ horses: acervo inconsistente', ...bad.slice(0, 12).map((p) => `  - ${p}`),
      ...(bad.length > 12 ? [`  …e mais ${bad.length - 12}`] : [])]);
  }

  fs.writeFileSync('src/data/horses.json', cardRaw);
  fs.writeFileSync('src/data/horses-index.json', indexRaw);

  console.log(
    `✓ horses: ${written.size} registros no acervo, ${card.horses.length} declarados no cartão, arquivo histórico até ${card.history_depth.through}, derivado ${card.generated_at}, ${((bytes + cardRaw.length + indexRaw.length) / 1024).toFixed(0)}KB`,
  );
}
