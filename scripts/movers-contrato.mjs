/**
 * O contrato das edições do /movers, em módulo próprio para poder ser TESTADO
 * sem rodar o download. Ver `movers-contrato.test.mjs`.
 */
import { exigir, exigirLista } from './shape.mjs';

/**
 * Confere TODAS as edições do /movers. Nunca amostra (regra 4).
 *
 * As famílias são as mesmas das edições de each-way (`edicoes-contrato.mjs`),
 * pelos mesmos erros, e mais duas que só existem aqui:
 *
 *  d) COERÊNCIA DO RÓTULO — `notable` tem de ser exatamente "percentil até 5 ou
 *     a partir de 95". É o número da manchete da página; um `notable` que não
 *     bate com o percentil ao lado é rótulo errado com número certo, a família
 *     de erro que este projeto mais repete.
 *
 *  e) BASE PONTO-NO-TEMPO — a edição diz contra quantos dias ANTERIORES foi
 *     julgada, e esse número só pode crescer de uma edição para a seguinte. Se
 *     cair, a base de uma edição antiga foi refeita com outro acervo.
 */
const SCHEMA_ATUAL = 'movers_edition_v2';
/** Última edição que chegou a ser publicada como v1. Espelha o produtor. */
const REEMITIDAS_ATE = '2026-10-05';
/**
 * O nome da pista vem do slug do Smarkets com as palavras em maiúscula
 * inicial, e pista de fora termina no código do país: "Baden Baden De",
 * "Taif Ksa". Nenhuma pista de UK/IRE termina assim — "Ffos Las" e "Bangor On
 * Dee" terminam em palavra, não em código desta lista.
 */
const SUFIXO_DE_PAIS = / (Aus|Usa|Fra|Rsa|Jpn|Nz|De|Ksa|Mu|Uae|Can|Hkg|Sgp|Swe|Nor|Ger|Ity|Esp|Arg|Chi|Kor|Ind|Per)$/;

export function conferirEdicoesMovers(edicoes) {
  const problems = [];
  if (edicoes.size === 0) {
    return ['movers/: NENHUMA edição no tarball — o arquivo do livro de ofertas sumiu'];
  }
  let diasAntes = -1;
  let diaAntes = null;
  for (const [dia, texto] of [...edicoes].sort()) {
    let doc;
    try {
      doc = JSON.parse(texto);
    } catch (e) {
      problems.push(`movers ${dia}: JSON não parseia — ${e.message}`);
      continue;
    }
    try {
      exigir(doc, ['schema', 'edition', 'runners', 'collected_through', 'baseline'], `movers ${dia}`);
      exigir(doc.baseline, ['days', 'bands'], `movers ${dia}.baseline`);
      exigirLista(doc.baseline.bands, ['from', 'to', 'n', 'p5', 'p25', 'p50', 'p75', 'p95'],
                  `movers ${dia}.baseline.bands`);
      exigirLista(doc.runners,
                  ['slug', 'venue', 'off_utc', 'runner', 'first', 'latest', 'move_pct', 'band', 'percentile', 'notable'],
                  `movers ${dia}.runners`);
    } catch (e) {
      problems.push(e.message);
      continue;
    }
    // v1 não entra mais: as edições v1 traziam corredores de pistas alemãs e
    // de Taif e foram todas reemitidas como v2 em 2026-10-06. Uma v1 aqui é
    // edição velha voltando ao repositório de dados.
    if (doc.schema !== SCHEMA_ATUAL) problems.push(`movers ${dia}: schema "${doc.schema}"`);
    if (doc.schema === SCHEMA_ATUAL) {
      // (f) PAÍS — a página diz "UK and Irish runners". O filtro da origem já
      // errou duas vezes deixando passar o que não previa; aqui a pergunta é
      // feita de novo, na chegada, sobre o nome que vai para a tela.
      const fora = doc.runners.filter((c) => SUFIXO_DE_PAIS.test(String(c.venue)));
      if (fora.length) {
        problems.push(`movers ${dia}: ${fora.length} corredor(es) em pista de FORA de UK/IRE, ex. ${fora[0].venue}`);
      }
      // (g) REEMISSÃO — edição que já foi publicada com outro conteúdo tem de
      // dizer que foi reemitida, quando e por quê; e só essas.
      const deviaTer = dia <= REEMITIDAS_ATE;
      if (deviaTer && !(doc.reissued && doc.reissued.on && doc.reissued.reason)) {
        problems.push(`movers ${dia}: foi publicada como v1 e a v2 não traz \`reissued\` com data e motivo`);
      }
      if (!deviaTer && 'reissued' in doc) {
        problems.push(`movers ${dia}: traz \`reissued\` e nunca foi publicada com outro conteúdo`);
      }
    }
    if (doc.edition !== dia) {
      problems.push(`movers ${dia}: campo edition diz "${doc.edition}" — o nome do arquivo e o conteúdo discordam`);
    }
    if ('generated_at' in doc) {
      problems.push(`movers ${dia}: tem \`generated_at\`, e edição congelada não pode ter relógio de geração`);
    }
    if (!doc.collected_through) {
      problems.push(`movers ${dia}: sem \`collected_through\` — não distingue "sem corrida" de "coletor quebrado"`);
    } else if (!doc.collected_through.startsWith(dia)) {
      problems.push(`movers ${dia}: collected_through "${doc.collected_through}" é de outro dia`);
    }
    // (b) POPULAÇÃO
    const forasteiros = doc.runners.filter((c) => !String(c.off_utc).startsWith(dia));
    if (forasteiros.length) {
      problems.push(`movers ${dia}: ${forasteiros.length} corredor(es) de OUTRO dia, ex. ${forasteiros[0].off_utc}`);
    }
    // (d) COERÊNCIA DO RÓTULO
    for (const c of doc.runners) {
      if (!(c.percentile >= 0 && c.percentile <= 100)) {
        problems.push(`movers ${dia}: ${c.runner} com percentil ${c.percentile}, fora de 0 a 100`);
      } else if (c.notable !== (c.percentile <= 5 || c.percentile >= 95)) {
        problems.push(`movers ${dia}: ${c.runner} com notable=${c.notable} e percentil ${c.percentile} — o rótulo não bate com o número`);
      }
      if (!String(c.slug).includes(dia)) {
        problems.push(`movers ${dia}: slug "${c.slug}" sem a data — a chave não é perene`);
      }
    }
    // (e) BASE PONTO-NO-TEMPO
    if (!(doc.baseline.days >= 5)) {
      problems.push(`movers ${dia}: julgada contra ${doc.baseline.days} dia(s) — menos que o piso de 5`);
    }
    if (doc.baseline.days <= diasAntes) {
      problems.push(`movers ${dia}: base de ${doc.baseline.days} dias, e a de ${diaAntes} tinha ${diasAntes} — a base de uma edição só pode crescer`);
    }
    diasAntes = doc.baseline.days;
    diaAntes = dia;
  }
  return problems;
}
