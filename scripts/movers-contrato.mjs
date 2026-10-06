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
    if (doc.schema !== 'movers_edition_v1') problems.push(`movers ${dia}: schema "${doc.schema}"`);
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
