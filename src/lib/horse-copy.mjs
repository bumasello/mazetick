/**
 * As palavras que os três estados de `status` exigem — num lugar só.
 *
 * ⚠️ POR QUE ISTO NÃO MORA DENTRO DA PÁGINA.
 *
 * O defeito que segurou a `/horse` foi escrever "debut" para um cavalo
 * `no_record`, e errava por cerca de quatro vezes. Os dois estados parecem o
 * mesmo na tela — nenhum número — e são afirmações opostas:
 *
 *   debut      → "não há corrida registrada antes desta data".
 *                É uma afirmação SOBRE O CAVALO.
 *   no_record  → "correu antes, e essas corridas não estão no nosso arquivo".
 *                É uma confissão SOBRE NÓS.
 *
 * Trocar uma pela outra transforma uma lacuna nossa em fato sobre o animal, que
 * é precisamente o erro que o site existe para não cometer. Por isso as frases
 * saem daqui e a checagem 25 do `verify.mjs` IMPORTA ESTE ARQUIVO para conferir,
 * página por página, que a frase certa está lá e que a frase do outro estado não
 * está. Uma lista de frases no verificador e outra na página divergiriam no
 * primeiro edit — é a mesma lição do hash da CSP.
 *
 * As frases são ASCII puro de propósito: aspas curvas e travessões viram
 * entidade no HTML servido e a conferência por substring deixaria de casar.
 */

const LONG_DATE = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const SHORT_DATE = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** "2026-09-18" -> "18 September 2026". Data só, sem hora: fuso UTC fixo. */
export const ukDate = (iso) => LONG_DATE.format(new Date(iso));
/** "2026-09-18" -> "18 Sep 2026". Para o <title>, onde cada caractere conta. */
export const ukDateShort = (iso) => SHORT_DATE.format(new Date(iso));

/**
 * O limite do arquivo, dito na PÁGINA e não só no JSON.
 *
 * "Career: 83 runs" sem dizer até quando mente por omissão: o arquivo termina
 * numa data e as corridas posteriores simplesmente não estão ali. A checagem 26
 * exige esta frase, com a data DO REGISTRO, em toda página de cavalo — inclusive
 * nas que não têm número nenhum, porque é lá que a lacuna é a única informação.
 */
export const ARCHIVE_PREFIX = 'Our archive runs to ';
export const archiveLine = (historyThrough) =>
  `${ARCHIVE_PREFIX}${ukDate(historyThrough)}. A run after that date is missing from these figures, so read them as what we hold, not as a complete record.`;

/**
 * Por estado: o rótulo curto (índice e margem), a frase obrigatória da página,
 * e as frases que aquele estado PROIBE — que são as dos outros dois.
 */
export const STATUS_COPY = {
  has_history: {
    label: 'Record held',
    /** @param {{ asOf: string, runs: number }} o */
    sentence: (o) =>
      `We hold ${o.runs} ${o.runs === 1 ? 'run' : 'runs'} for this horse, all of them before ${ukDate(o.asOf)}.`,
    forbidden: ['No recorded run before', 'not in our archive', 'debut'],
  },
  debut: {
    label: 'No recorded run',
    /** @param {{ asOf: string }} o */
    sentence: (o) =>
      `No recorded run before ${ukDate(o.asOf)}. That is a statement about the horse: our archive holds no earlier race for it.`,
    forbidden: ['not in our archive'],
  },
  no_record: {
    label: 'Ran before; not in our archive',
    sentence: () =>
      'This horse has run before, and those races are not in our archive. That is a statement about us, not about the horse, and it is why there is nothing to compute below.',
    forbidden: ['No recorded run before', 'debut'],
  },
};

/** Os três estados que o contrato admite. Qualquer outro para o build. */
export const STATUSES = /** @type {const} */ (['has_history', 'debut', 'no_record']);

/**
 * As frases das PARCERIAS — o que o contrato v2 passou a entregar.
 *
 * Até 2026-09-24 esta página gastava dois parágrafos avisando o que ela NÃO
 * dizia: "not their record with this horse", "not conditioned on the going or
 * the course above". Os avisos existiam porque o dado faltava. Agora existe, e
 * a página responde a leitura natural em vez de pedir desculpa por não
 * responder.
 *
 * Regra que estas frases herdam da tabela: **nenhuma taxa sem a amostra na
 * mesma frase**. A checagem 27 só varre tabela, então aqui a disciplina é
 * nossa — "12,5%" sozinho é o número que alguém usaria para apostar.
 */

/**
 * "a" ou "an" antes de um número, pelo SOM da palavra que ele vira.
 *
 * Terceira vez que esta família de defeito aparece aqui: primeiro o substantivo
 * ("1 horse" com "runs"), resolvido com `plural`; depois o verbo ("1 horse …
 * share a name"), resolvido com `verb`; agora o artigo — "a 18.5%" onde o
 * inglês quer "an eighteen point five". O gerador não ouve o que escreve, então
 * a concordância tem de ser função, nunca literal na frase.
 *
 * Decide pela PARTE INTEIRA: 8 e 80–89 ("eight", "eighty"), 11 e 18 ("eleven",
 * "eighteen"). Olhar a string toda cairia na armadilha de 1.8, que é "one point
 * eight" e pede "a".
 */
export const artigo = (n) => {
  const inteiro = String(Math.trunc(Math.abs(Number(n))));
  return inteiro.startsWith('8') || inteiro.startsWith('11') || inteiro.startsWith('18')
    ? 'an'
    : 'a';
};

/** 1785 -> "1,785". Contagem grande sem separador se lê errado de relance. */
const num = (n) => n.toLocaleString('en-GB');

/** "once" / "3 times". Em inglês o 1 quer a palavra, não o dígito. */
const vezes = (n) => (n === 1 ? 'once' : `${n} times`);

/** "no win" / "1 win" / "2 wins". "0 wins" numa frase lê-se como lapso. */
const vitorias = (n) => (n === 0 ? 'no win' : `${n} ${n === 1 ? 'win' : 'wins'}`);

/** @param {{name: string, runs: number, wins: number} | undefined} b */
export const rideWithHorse = (b) =>
  b ? `${b.name} has ridden this horse ${vezes(b.runs)} in our archive, for ${vitorias(b.wins)}` : null;

/** @param {{name: string, runs: number, wins: number} | undefined} b */
export const yardWithHorse = (b) =>
  b ? `${b.name} has saddled it ${vezes(b.runs)}, for ${vitorias(b.wins)}` : null;

/**
 * A DUPLA, que não é a média dos dois: jóquei de 12% montando para treinador de
 * 7% pode render 20% ou 3%.
 * @param {{jockey: string, trainer: string, runs: number, wins: number, win_pct: number | null} | undefined} b
 */
export const pairingLine = (b) =>
  b
    ? `The pairing itself — ${b.jockey} riding for ${b.trainer} — is ${num(b.wins)} from ${num(b.runs)} in our archive, ${artigo(b.win_pct)} ${b.win_pct}% strike rate.`
    : null;

/**
 * A progênie do garanhão NA FAIXA de hoje. Condiciona só a distância: terreno e
 * pista continuam de fora, e a legenda tem de continuar dizendo isso.
 * @param {{key: string, runs: number, wins: number, win_pct: number | null} | undefined} b
 * @param {string | null} label a fronteira publicada pela origem, ex. "up to 6f"
 */
export const sireAtDistanceLine = (b, label) =>
  b
    ? `Narrowed to the distance of this race — ${label ?? b.key} — that same progeny record is ${num(b.wins)} from ${num(b.runs)}, ${artigo(b.win_pct)} ${b.win_pct}% strike rate.`
    : null;

/**
 * v3 — as condições de HOJE, e a atividade recente.
 *
 * O recorte por pista e por faixa responde a pergunta que o bloco de carreira
 * do jóquei não responde: ele vai bem AQUI? Piso de 10 garantido pela origem e
 * conferido na chegada, porque "50% em Ascot" sobre 4 montarias é ruído.
 */

/** @param {{name: string, key: string, runs: number, wins: number, win_pct: number|null}|undefined} b */
export const atCourse = (b) =>
  b ? `at ${b.key}, ${b.name} is ${num(b.wins)} from ${num(b.runs)} — ${artigo(b.win_pct)} ${b.win_pct}%` : null;

/** @param {{key: string, runs: number, wins: number, win_pct: number|null}|undefined} b @param {string|null} label */
export const atDistance = (b, label) =>
  b ? `over ${label ?? b.key}, ${num(b.wins)} from ${num(b.runs)} — ${artigo(b.win_pct)} ${b.win_pct}%` : null;

/**
 * Atividade recente. NUNCA em porcentagem: a contagem é a informação, e 1 de 2
 * não é 50% de coisa nenhuma. É o mesmo motivo do piso 2 em `por_chave`, só que
 * aqui a resposta foi manter o dado e mudar a forma de dizer.
 * @param {{days: number, runs: number, wins: number}|undefined} b
 */
export const recentLine = (b) =>
  b ? `${vezes(b.runs)} in the last ${b.days} days${b.wins ? `, winning ${vezes(b.wins)}` : ', without a win'}` : null;

/**
 * Dias desde a última corrida. Escrito por extenso e sem remendo: a primeira
 * versão reaproveitava `vezes()` e desfazia com regex, o que quebraria no dia
 * em que `vezes` mudasse.
 * @param {number|undefined} d
 */
export const daysSince = (d) => {
  if (typeof d !== 'number') return null;
  // d === 0 é inalcançável: `historico_ate` corta em `< data`, então a última
  // corrida é sempre anterior. Ramo morto com frase confusa é pior que ramo
  // nenhum, então não existe.
  if (d === 1) return 'It had run the day before';
  if (d < 14) return `It had run ${d} days before`;
  if (d < 60) return `It had not run for ${d} days`;
  return `It had not run for ${Math.round(d / 30)} months`;
};
