/**
 * As edições da camada de mercado: um arquivo por dia FECHADO.
 *
 * ⚠️ POR QUE ISTO EXISTE. Até 26/09 o site publicava a edição de hoje e jogava
 * o resto fora: 718 de 771 corridas já observadas (93%) não estavam em lugar
 * nenhum. Um diário oficial sem edições anteriores não é um diário oficial, e
 * a tese do produto — "o que se sabia a cada hora" — não se sustenta se só
 * existe hoje.
 *
 * ⚠️ EDIÇÃO É CONGELADA. O arquivo não tem `generated_at` de propósito: uma
 * edição fechada tem de sair byte a byte igual em toda regeração, senão o
 * guarda da origem não distingue "o dado mudou" de "o relógio andou". O
 * carimbo que existe é o da COLETA daquele dia, que é fato do dia.
 *
 * A conferência da forma acontece na CHEGADA (`scripts/edicoes-contrato.mjs`),
 * não aqui: o build para antes de gerar página se uma edição vier torta.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'src/data/extra-places';

export interface Termo {
  places: number;
  fraction: [number, number];
  bog?: boolean;
}

export interface Ponto {
  at: string;
  field_size: number;
  places: number;
  fraction: [number, number];
}

export interface CorridaEdicao {
  slug: string;
  venue: string;
  country: 'GB' | 'IE';
  off_utc: string;
  name: string;
  handicap: boolean;
  each_way: boolean;
  field_size: number;
  terms: Termo;
  house_standard: Termo;
  extra_place: boolean;
  history: Ponto[];
}

export interface Edicao {
  schema: string;
  edition: string;
  source: string;
  note: string;
  ladder_days: number;
  collected_through: string;
  races: CorridaEdicao[];
}

/** Toda edição, da mais recente para a mais antiga. */
export function carregarEdicoes(): Edicao[] {
  if (!fs.existsSync(DIR)) {
    throw new Error(
      `${DIR} não existe. As edições vêm do tarball em scripts/fetch-data.mjs — ` +
        'rode `npm run data` antes do build.',
    );
  }
  const arquivos = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
  if (arquivos.length === 0) {
    // Contar zero não é prova de que não há nada: é igualmente compatível com
    // ter olhado no lugar errado. Foi assim que um índice inteiro entrou
    // zerado em 26/09 sem nada acusar.
    throw new Error(`${DIR} está vazio — o arquivo da camada de mercado sumiu.`);
  }
  return arquivos
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) as Edicao)
    .sort((a, b) => b.edition.localeCompare(a.edition));
}

/** Um par de pontos consecutivos do histórico, e o que de fato mexeu ali. */
export interface Mudanca {
  corrida: CorridaEdicao;
  de: Ponto;
  para: Ponto;
  /** Vagas ou fração mudaram. FALSO quando só o campo encolheu. */
  termo: boolean;
}

/**
 * ⚠️ NEM TODO PONTO DO HISTÓRICO É MUDANÇA DE TERMO, e confundir os dois
 * inflou a manchete em 3,5× antes de subir. `history` grava um ponto quando
 * (campo, vagas, fração) muda — e o campo muda a cada NÃO-CORREDOR, que não é
 * a casa mexendo em nada. Medido na edição de 19/09: 83 pontos, dos quais
 * **59 eram só o campo**. Chamar os 83 de "changes to the terms" era falso.
 *
 * Mesma família do erro dos "13 recolhimentos silenciosos" de 26/09: o número
 * estava certo, o RÓTULO é que afirmava outra coisa.
 */
const mexeuNoTermo = (a: Ponto, b: Ponto) =>
  a.places !== b.places || a.fraction.join('/') !== b.fraction.join('/');

/**
 * As mudanças de uma edição, em ordem cronológica DA COLETA.
 *
 * `history` só grava mudanças, então uma corrida com um ponto só não mexeu o
 * dia inteiro — e isso também é informação, por isso ela não some daqui: some
 * da lista de mudanças, não da edição.
 */
export function mudancasDe(e: Edicao): Mudanca[] {
  const out: Mudanca[] = [];
  for (const corrida of e.races) {
    for (let i = 1; i < corrida.history.length; i += 1) {
      const de = corrida.history[i - 1];
      const para = corrida.history[i];
      out.push({ corrida, de, para, termo: mexeuNoTermo(de, para) });
    }
  }
  return out.sort((a, b) => a.para.at.localeCompare(b.para.at));
}

/**
 * O resumo de uma edição.
 *
 * ⚠️ TUDO SAI DAS CORRIDAS DA PRÓPRIA EDIÇÃO. Misturar populações foi o erro
 * de 26/09 que produziu uma cobertura de 85,5% descrevendo nenhuma das duas
 * faixas que somava. Um número numa edição descreve aquele dia ou não entra.
 *
 * E uma perda de vaga com o campo encolhido é AJUSTE, não recolhimento de
 * oferta: comparar dois instantes diz o que mudou, nunca por quê. O teste é
 * contra o maior campo já visto na corrida.
 */
export function resumoDe(e: Edicao) {
  const todos = mudancasDe(e);
  const mudancas = todos.filter((m) => m.termo);
  const ganhos = mudancas.filter((m) => m.para.places > m.de.places);
  const perdas = mudancas.filter((m) => m.para.places < m.de.places);
  const maiorCampo = (c: CorridaEdicao, ate: string) =>
    Math.max(...c.history.filter((p) => p.at <= ate).map((p) => p.field_size));
  return {
    corridas: e.races.length,
    acimaDaEscada: e.races.filter((r) => r.extra_place).length,
    mudancas: mudancas.length,
    /** Pontos em que só o campo mexeu: não-corredor, não a casa. */
    soCampo: todos.length - mudancas.length,
    ganhos: ganhos.length,
    perdas: perdas.length,
    perdasSemExplicacao: perdas.filter(
      (m) => m.para.field_size >= maiorCampo(m.corrida, m.para.at),
    ).length,
    corridasQueMudaram: new Set(mudancas.map((m) => m.corrida.slug)).size,
    fracaoSo: mudancas.filter((m) => m.para.places === m.de.places).length,
    /**
     * Mudança de termo em que o CAMPO também mexeu no mesmo instante. Achado
     * pelo reprodutor em 27/09: 6 das 19 de 19/09 são o campo cruzando um
     * degrau da escada, não a casa mexendo na oferta. O termo mudou de
     * verdade; a causa é outra, e a página tem de poder dizer as duas.
     */
    comCampoMexendo: mudancas.filter((m) => m.de.field_size !== m.para.field_size).length,
  };
}
