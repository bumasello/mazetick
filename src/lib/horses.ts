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
export interface Card {
  schema: string;
  generated_at: string;
  note: string;
  history_depth: { from: string; through: string; horses: number };
  debutants: number;
  no_record: number;
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
      description: `${h.name} has run before, but those races are not in our archive, so we publish no career figures. Declared at ${decl}. ${conn}`,
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
