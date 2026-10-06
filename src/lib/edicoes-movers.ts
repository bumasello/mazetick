/**
 * As edições do /movers: um arquivo por dia FECHADO do livro de ofertas.
 *
 * Irmã de `edicoes.ts`, e congelada pelos mesmos motivos: o arquivo não tem
 * `generated_at`, e o percentil de cada movimento é a posição dele entre os
 * movimentos medidos até a VÉSPERA da edição. Refazer um dia antigo com a base
 * de hoje mudaria quem foi "notável" usando movimento que ainda não existia.
 *
 * A forma é conferida na CHEGADA (`scripts/movers-contrato.mjs`).
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'src/data/movers';

export interface FaixaMv {
  from: number; to: number; n: number;
  p5: number; p25: number; p50: number; p75: number; p95: number;
}

export interface CorredorMv {
  slug: string;
  venue: string;
  off_utc: string;
  runner: string;
  first: { mins_to_off: number; mid: number };
  /** `spread_pct` nulo é o livro sem as duas pontas naquele instante. */
  latest: { mins_to_off: number; mid: number; spread_pct: number | null };
  move_pct: number;
  band: [number, number];
  percentile: number;
  notable: boolean;
}

export interface EdicaoMv {
  schema: string;
  edition: string;
  source: string;
  note: string;
  baseline: { days: number; bands: FaixaMv[] };
  collected_through: string;
  /**
   * Só nas edições que chegaram a ser publicadas com outro conteúdo. Em
   * 06/10/2026 as de até 05/10 foram reemitidas: o filtro de país deixava
   * passar pistas alemãs e de Taif. A página tem de dizer isso.
   */
  reissued?: { on: string; reason: string };
  runners: CorredorMv[];
}

/** Toda edição, da mais recente para a mais antiga. */
export function carregarEdicoesMovers(): EdicaoMv[] {
  if (!fs.existsSync(DIR)) {
    throw new Error(`${DIR} não existe. As edições vêm do tarball em scripts/fetch-data.mjs — rode \`npm run data\` antes do build.`);
  }
  const arquivos = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
  if (arquivos.length === 0) {
    throw new Error(`${DIR} está vazio — o arquivo do livro de ofertas sumiu.`);
  }
  return arquivos
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) as EdicaoMv)
    .sort((a, b) => b.edition.localeCompare(a.edition));
}

export interface GrupoMv {
  slug: string;
  venue: string;
  off_utc: string;
  runners: CorredorMv[];
  notable: number;
}

/**
 * Os corredores agrupados POR CORRIDA, em ordem de largada. Dentro da corrida,
 * do maior encurtamento ao maior alongamento: os dois extremos de uma mesma
 * prova ficam nas pontas do mesmo bloco, que é onde a leitura aparece.
 */
export function porCorrida(e: EdicaoMv): GrupoMv[] {
  const m = new Map<string, GrupoMv>();
  for (const r of e.runners) {
    let g = m.get(r.slug);
    if (!g) {
      g = { slug: r.slug, venue: r.venue, off_utc: r.off_utc, runners: [], notable: 0 };
      m.set(r.slug, g);
    }
    g.runners.push(r);
    if (r.notable) g.notable += 1;
  }
  for (const g of m.values()) {
    g.runners.sort((a, b) => a.move_pct - b.move_pct || a.runner.localeCompare(b.runner));
  }
  return [...m.values()].sort((a, b) => a.off_utc.localeCompare(b.off_utc) || a.venue.localeCompare(b.venue));
}

/** Só o que sai de `e.runners`: nenhum número de fora da própria edição. */
export function resumoMv(e: EdicaoMv) {
  const notaveis = e.runners.filter((r) => r.notable);
  return {
    corredores: e.runners.length,
    corridas: new Set(e.runners.map((r) => r.slug)).size,
    notaveis: notaveis.length,
    encurtaram: notaveis.filter((r) => r.move_pct < 0).length,
    alongaram: notaveis.filter((r) => r.move_pct > 0).length,
  };
}
