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
