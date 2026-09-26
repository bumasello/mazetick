/**
 * O acervo de cavalos, lido do disco no build.
 *
 * Os registros são lidos com `fs` e não com `import.meta.glob` de propósito: o
 * acervo é ACUMULADO e cresce cerca de 600 registros por dia, e fazer o Vite
 * transformar cada arquivo em módulo custa por arquivo. Com `fs` o custo é uma
 * leitura de diretório e um `JSON.parse` por registro.
 *
 * ⚠️ Nada aqui recalcula estatística. Os números vêm prontos do produtor, que os
 * deriva no `bspnode` com corte ponto-no-tempo; o site só os exibe com o carimbo
 * que veio junto. Se um dia esta camada começar a somar, dividir ou preencher
 * grupo ausente, o site passa a publicar número que nenhum script versionado
 * emite — e essa é uma das regras que o projeto já quebrou uma vez.
 */
import fs from 'node:fs';
import path from 'node:path';
import { STATUS_COPY, ukDate, ukDateShort } from './horse-copy.mjs';

export type Status = 'has_history' | 'debut' | 'no_record';

/** Um recorte: terreno, pista ou faixa de distância. */
export interface Group {
  key: string;
  runs: number;
  wins: number;
  places: number;
  /** `null` quando `runs` é 0. Taxa sem amostra não existe. */
  win_pct: number | null;
  place_pct: number | null;
}

/**
 * Jóquei, treinador ou garanhão.
 *
 * ⚠️ É o registro DELE, sobre todas as montarias/corridas do arquivo — NÃO a
 * dupla com este cavalo. Conferido no dado: dois cavalos com o mesmo jóquei
 * carregam blocos idênticos, o que só acontece se o número for do jóquei.
 * A página tem de dizer isso, porque a leitura natural é a outra.
 */
export interface Connection extends Group {
  name: string;
}

export interface HorseRecord {
  slug: string;
  name: string;
  as_of: string;
  status: Status;
  history_through: string;
  last_declared: { date: string; venue: string; off_utc: string; going: string; distance: string };
  career: { runs: number; wins: number; places: number; win_pct: number | null; place_pct: number | null };
  by_going: Group[];
  by_course: Group[];
  by_distance: Group[];
  /** Ausente significa "não temos amostra", NUNCA "zero". */
  jockey?: Connection;
  trainer?: Connection;
  sire?: Connection;

  /**
   * v2 (2026-09-24) — as quatro derivações de PARCERIA, que respondem a leitura
   * natural que os três blocos acima não respondiam.
   *
   * Cada uma chega com um piso de amostra garantido pela origem e conferido na
   * chegada por `fetch-data.mjs`: dupla 10, com-o-cavalo 2, garanhão por faixa
   * 20. Ausente continua significando "não temos amostra", nunca zero.
   */
  jockey_trainer?: { jockey: string; trainer: string } & Group;
  /** Este jóquei NESTE cavalo — não a carreira dele. */
  jockey_here?: Connection;
  /** Este treinador NESTE cavalo. */
  trainer_here?: Connection;
  /** A progênie do garanhão na faixa de distância de hoje. Só distância:
   *  terreno e pista continuam de fora, e a legenda tem de dizer isso. */
  sire_at_distance?: Connection & { key: string };

  /**
   * Cadastro, vindo do CARTÃO e nunca inferido do histórico — idade muda todo
   * ano. Campo ausente não vem como string vazia: não vem.
   *
   * `colour` chega como código (`b`, `ch`, `gr`) e NÃO vai para a tela:
   * expandir exigiria uma tabela que ninguém publica, e expandir errado é pior
   * que omitir.
   */
  /**
   * v3 (2026-09-25) — as condições de HOJE e a atividade recente. Respondem o
   * que o bloco de carreira do jóquei não responde: ele vai bem AQUI, e este
   * cavalo vem correndo?
   *
   * Só campos com cobertura 100% nas duas fontes entraram — classe, OR e
   * criação ficaram de fora por decisão, até um backfill pago. Ausente
   * continua significando "não temos amostra", nunca zero.
   */
  jockey_at_course?: Connection & { key: string };
  jockey_at_distance?: Connection & { key: string };
  trainer_at_course?: Connection & { key: string };
  trainer_at_distance?: Connection & { key: string };
  /** A CONTAGEM é a informação; a página nunca mostra isto como taxa. */
  recent_30d?: Group & { days: number };
  recent_90d?: Group & { days: number };
  days_since_last_run?: number;

  ident?: {
    age?: string; sex?: string; colour?: string;
    owner?: string; dam?: string; damsire?: string;
  };
}

export interface IndexEntry {
  slug: string;
  name: string;
  last_declared: string;
  runs: number;
  wins: number;
  status: Status;
}

/**
 * O cartão do dia. Só os campos que a página usa — não é um espelho do JSON.
 *
 * ⚠️ É lido com `fs`, não importado como módulo. Importado, o TypeScript infere
 * o tipo literal do arquivo inteiro (hoje 678 objetos, amanhã mais) e o
 * `astro check` passa a gastar o tempo dele analisando dado em vez de código.
 */
/**
 * Uma faixa de distância, COM a fronteira publicada.
 *
 * Até 2026-09-20 o contrato só trazia a chave (`staying`) e nenhuma definição,
 * e a página se recusou a inventar o intervalo de furlongs — um leitor não tem
 * como conferir "27% em staying" sem saber o que é staying. A origem passou a
 * emitir as fronteiras a partir da MESMA lista que classifica, então o rótulo
 * publicado não pode divergir do que separa.
 *
 * `to_furlongs` é `null` na última faixa (aberta em cima). O que vai para a tela
 * é o `label`, que também vem da origem: recompor "up to 6f" a partir de
 * `0 → 7` seria a página derivando texto que nenhum script emite.
 */
export interface DistanceBand {
  key: string;
  from_furlongs: number;
  to_furlongs: number | null;
  label: string;
}

export interface Card {
  schema: string;
  generated_at: string;
  /** Instante em que o CARTÃO foi lido da API. Relógio diferente de
   *  `generated_at`, e é dele que sai a idade na tela — a mesma regra das
   *  outras duas páginas de dado. */
  collected_through: string | null;
  note: string;
  history_depth: { from: string; through: string; horses: number };
  distance_bands: DistanceBand[];
  debutants: number;
  no_record: number;
  /** Cavalos do cartão que dividem nome com outro no arquivo, e as corridas que
   *  foram REMOVIDAS por causa disso. É uma lacuna conhecida do acervo, e o
   *  índice a publica: carreira curta por ambiguidade não é carreira curta. */
  name_collisions: { horses: number; runs_removed: number };
  /** A janela em que a criação é INCOMPLETA, declarada pela origem.
   *  Até `complete_through` o arquivo profundo traz garanhão em 100%; depois
   *  disso a fonte viva traz metade e o índice cavalo→garanhão remenda o resto
   *  sem chegar a 100%. A página é obrigada a dizer isso ao lado do total do
   *  garanhão — ver o portão em `scripts/fetch-data.mjs`. */
  breeding_coverage: {
    complete_through: string;
    partial_from: string;
    runners_in_window: number;
    with_breeding: number;
    pct: number;
    from_source: number;
    backfilled: number;
    still_missing: number;
    note: string;
  } | null;
  horses: { slug: string; as_of: string; status: Status }[];
}

const DIR = 'src/data/horses';

export const loadCard = (): Card => JSON.parse(fs.readFileSync('src/data/horses.json', 'utf8')) as Card;

/** O índice do produtor. Usado onde só a contagem importa — a home, por exemplo
 *  — para não abrir os registros um a um só por causa de um número. */
export interface HorseIndex { schema: string; generated_at: string; note: string; count: number; horses: IndexEntry[] }
export const loadIndex = (): HorseIndex =>
  JSON.parse(fs.readFileSync('src/data/horses-index.json', 'utf8')) as HorseIndex;

/** Todos os registros do acervo, em ordem alfabética de nome. */
export function loadRecords(): HorseRecord[] {
  const out: HorseRecord[] = [];
  for (const bucket of fs.readdirSync(DIR)) {
    const dir = path.join(DIR, bucket);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      out.push(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as HorseRecord);
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
}

/**
 * "1 run", "43 runs". Guarda de plural.
 *
 * Existe porque a /extra-places já publicou "the other 1 **were** already…" e a
 * classe voltou aqui na primeira revisão visual: 90 dos 678 cavalos têm UMA
 * corrida, então o caso singular não é raro, é comum.
 */
export const plural = (n: number, word: string): string =>
  `${n.toLocaleString('en-GB')} ${word}${n === 1 ? '' : 's'}`;

/**
 * O VERBO que concorda com esse número. O `plural` acima cobria só o
 * substantivo, e a frase saía "1 horse … share a name" — a mesma classe que
 * ele foi criado para matar, sobrevivendo meia frase adiante. Quem escreve
 * `plural(n, 'horse')` precisa de `verb(n, 'shares', 'share')` na mesma linha.
 */
export const verb = (n: number, singular: string, plural_: string): string =>
  (n === 1 ? singular : plural_);

/** "18.6" → "18.6%"; `null` → travessão, nunca "0%". */
export const rate = (v: number | null): string => (v === null ? '—' : `${v.toFixed(1)}%`);

/** O maior grupo de uma lista, por amostra. `undefined` se a lista está vazia. */
const biggest = (gs: Group[]): Group | undefined =>
  gs.length ? gs.reduce((a, b) => (b.runs > a.runs ? b : a)) : undefined;

/**
 * Título e descrição por cavalo, compostos a partir dos NÚMEROS do registro.
 *
 * O requisito é que sejam distintos de verdade, não um gabarito com o nome
 * trocado — por isso cada frase carrega amostra, taxa e o nome de quem a
 * produziu. A checagem 27 confere no artefato: remove o nome do cavalo da
 * descrição e recusa o build se uma mesma descrição sobrar em fatia grande das
 * páginas, que é a assinatura do gabarito.
 */
export function horseMeta(h: HorseRecord): { title: string; description: string } {
  const decl = `${h.last_declared.venue} on ${ukDate(h.last_declared.date)}`;
  const conn = h.trainer
    ? `Trainer ${h.trainer.name} runs at ${rate(h.trainer.win_pct)} from ${h.trainer.runs}.`
    : h.jockey
      ? `Jockey ${h.jockey.name} rides at ${rate(h.jockey.win_pct)} from ${h.jockey.runs}.`
      : 'We hold no record for the yard or the rider either.';

  if (h.status === 'debut') {
    return {
      title: `${h.name}: no recorded run before ${ukDateShort(h.as_of)} — mazetick`,
      description: `${h.name} is declared at ${decl} with no recorded run before that date in our archive. ${conn}`,
    };
  }
  if (h.status === 'no_record') {
    return {
      title: `${h.name}: ran before, not in our archive — mazetick`,
      description: `${h.name} has run before, but those races are not in our archive, so we publish no figures of our own for it. Declared at ${decl}. ${conn}`,
    };
  }

  const c = h.career;
  const g = biggest(h.by_going);
  const co = biggest(h.by_course);
  const bits = [
    `${h.name}: ${plural(c.runs, 'run')}, ${plural(c.wins, 'win')} and ${c.places} placed in our archive to ${ukDate(h.history_through)}.`,
  ];
  if (g) bits.push(`${rate(g.win_pct)} from ${g.runs} on ${g.key}.`);
  if (co) bits.push(`${rate(co.win_pct)} from ${co.runs} at ${co.key}.`);
  if (!g && !co) bits.push('No going, course or distance band reaches the two runs we require before quoting a rate.');

  return {
    title: `${h.name}: ${plural(c.runs, 'run')}, ${plural(c.wins, 'win')} to ${ukDateShort(h.history_through)} — mazetick`,
    description: bits.join(' '),
  };
}

/**
 * A letra sob a qual um cavalo é arquivado.
 *
 * Vem do SLUG, não do nome exibido, porque é o slug que define a URL. Conferido
 * nos 3.094 registros: a primeira letra dos dois coincide em 100% dos casos, e
 * nenhum slug começa com dígito ou outra coisa. Se um dia houver, cai em `#`, e
 * a checagem 24 acusa a letra que ninguém gerou em vez de perder o cavalo.
 */
export const letterOf = (h: { slug: string }): string => {
  const c = h.slug[0]?.toLowerCase() ?? '#';
  return /[a-z]/.test(c) ? c : '#';
};

/** Quantos cavalos por letra. Letra ausente do mapa é letra sem nenhum. */
export function letterCounts(records: { slug: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of records) {
    const l = letterOf(h);
    out[l] = (out[l] ?? 0) + 1;
  }
  return out;
}

/** As 26 letras, sempre as mesmas — o alfabeto não depende do acervo do dia. */
export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

/**
 * O rótulo legível de uma faixa de distância, ou `undefined`.
 *
 * ⚠️ Devolve `undefined` de propósito quando a faixa não está publicada, em vez
 * de cair para a própria chave. Faixa sem definição na tela é um número que o
 * leitor não tem como conferir, e é a checagem 29 que recusa o build — a página
 * não disfarça a lacuna com o nome dela.
 */
export const bandLabel = (bands: DistanceBand[], key: string): string | undefined =>
  bands.find((b) => b.key === key)?.label;

/** O rótulo curto do estado, o mesmo do índice e da margem. */
export const statusLabel = (s: Status): string => STATUS_COPY[s].label;

/**
 * A frase que o estado exige, com o estreitamento feito aqui e não na página.
 *
 * Os três estados pedem argumentos diferentes, e resolver isso com um `any` na
 * página seria abrir a porta para a página passar o argumento errado — que, no
 * caso de `debut` contra `no_record`, é exatamente o erro que custou quatro
 * ocorrências.
 */
export function statusSentence(h: HorseRecord): string {
  if (h.status === 'debut') return STATUS_COPY.debut.sentence({ asOf: h.as_of });
  if (h.status === 'no_record') return STATUS_COPY.no_record.sentence();
  return STATUS_COPY.has_history.sentence({ asOf: h.as_of, runs: h.career.runs });
}
