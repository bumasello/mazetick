/**
 * O contrato dos JSON de dados, num lugar só.
 *
 * Por que existe: o `fetch-data.mjs` valida o arquivo na PORTA DE ENTRADA e o
 * `verify.mjs` valida o que sobrou em `src/data/` DEPOIS do build. As duas
 * perguntas são a mesma, e enquanto cada script tinha a sua lista, nada
 * impedia que divergissem — exatamente a lição do hash da CSP, que o verify
 * importa de `headers.mjs` em vez de reimplementar.
 *
 * ⚠️ O carimbo obrigatório NÃO é o mesmo em todo arquivo, e essa é a parte que
 * precisa estar escrita:
 *
 *   extra-places, movers  → `collected_through`: quando o COLETOR leu pela
 *                           última vez. É um relógio de coleta contínua.
 *   horses                → NÃO tem coletor contínuo. O que limita o número na
 *                           tela é a profundidade do ARQUIVO histórico
 *                           (`history_depth.through`), e é essa data que a
 *                           página tem de mostrar. Exigir `collected_through`
 *                           aqui seria exigir um campo que não significa nada
 *                           para este dado; não exigir carimbo nenhum seria
 *                           deixar a regra 4 cair em silêncio.
 *
 * Por isso o contrato declara, por arquivo, QUAIS carimbos são obrigatórios. Um
 * JSON em `src/data/` que não caia em nenhum padrão daqui é erro de build: o
 * caminho para acrescentar dado passa por declarar o seu carimbo.
 */

/** Lê "history_depth.through" de dentro do objeto. */
export const atPath = (obj, dotted) =>
  dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

/**
 * Cada entrada descreve um arquivo (ou família de arquivos) de `src/data/`.
 *
 * - `match`   — caminho relativo à raiz do repo, com barra normal.
 * - `stamps`  — caminhos pontilhados que TÊM de existir e ser data parseável.
 * - `nullable`— carimbos em que `null` é resposta legítima ("não havia arquivo
 *               do coletor hoje"). A CHAVE continua obrigatória: se ela sumir,
 *               a página volta a exibir `generated_at` como se fosse frescor.
 */
export const DATA_CONTRACT = [
  {
    name: 'extra-places',
    match: (p) => p === 'src/data/extra-places.json',
    stamps: ['generated_at', 'collected_through'],
    nullable: ['collected_through'],
  },
  {
    name: 'movers',
    match: (p) => p === 'src/data/movers.json',
    stamps: ['generated_at', 'collected_through'],
    nullable: ['collected_through'],
  },
  {
    // Três carimbos, e os três medem coisas diferentes:
    //   collected_through     — quando o CARTÃO foi lido da API
    //   generated_at          — quando NÓS derivamos o arquivo
    //   history_depth.through — até onde o arquivo histórico vai
    //
    // ⚠️ `collected_through` entrou em 2026-09-20. Ele é NULLABLE (o produtor
    // pode dizer "não houve leitura"), mas a CHAVE é obrigatória: sem ela a
    // página não tem como distinguir "não há corrida hoje" de "a coleta
    // quebrou", e a regra 4 cai em silêncio — que é exatamente o que este
    // contrato existe para impedir nas outras duas páginas.
    name: 'horses (cartão do dia)',
    match: (p) => p === 'src/data/horses.json',
    stamps: ['generated_at', 'collected_through', 'history_depth.through'],
    nullable: ['collected_through'],
  },
  {
    name: 'horses (índice do acervo)',
    match: (p) => p === 'src/data/horses-index.json',
    stamps: ['generated_at'],
    nullable: [],
  },
  {
    // Um registro por cavalo. O carimbo aqui é DO REGISTRO, não do site: cada
    // arquivo diz até quando o arquivo histórico ia quando ele foi calculado, e
    // registros acumulados de dias diferentes carregam datas diferentes. É por
    // isso que a página de cavalo mostra o carimbo DELE e não um global.
    name: 'horses (registro por cavalo)',
    match: (p) => /^src\/data\/horses\/[^/]+\/[^/]+\.json$/.test(p),
    stamps: ['as_of', 'history_through'],
    nullable: [],
  },
];

export const contractFor = (relPath) =>
  DATA_CONTRACT.find((c) => c.match(relPath.split('\\').join('/')));

/** Problemas de carimbo de um objeto já parseado. Lista vazia = passou. */
export function stampProblems(relPath, json) {
  const c = contractFor(relPath);
  if (!c) return [`${relPath}: nenhum contrato de carimbo declara este arquivo`];
  const out = [];
  for (const key of c.stamps) {
    const value = atPath(json, key);
    if (value === undefined) {
      out.push(`${relPath}: ${key} ausente — contrato antigo?`);
      continue;
    }
    if (value === null) {
      if (!c.nullable.includes(key)) out.push(`${relPath}: ${key} é null, e aqui null não é resposta`);
      continue;
    }
    if (Number.isNaN(Date.parse(value))) {
      out.push(`${relPath}: ${key} não é data parseável (${JSON.stringify(value)})`);
    }
  }
  return out;
}
