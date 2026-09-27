/**
 * O contrato das edições da camada de mercado, em módulo próprio para poder
 * ser TESTADO sem rodar o download. Ver `edicoes-contrato.test.mjs`.
 */
import { exigir, exigirLista } from './shape.mjs';

/**
 * Confere TODAS as edições da camada de mercado. Nunca amostra (regra 4).
 *
 * Três famílias de conferência, e cada uma existe por um erro real:
 *
 *  a) FORMA — `exigir` aborta nomeando as chaves que EXISTEM. Em 26/09 eu li
 *     `horse` onde era `horse_name` e `horses` onde era `corredores`, três
 *     vezes, e nas três a leitura devolveu vazio sem erro nenhum.
 *
 *  b) POPULAÇÃO — toda corrida de uma edição tem de ser DAQUELE dia. Foi
 *     misturar duas populações (as duas fontes se sobrepõem de 01/01 a 22/07)
 *     que produziu uma cobertura de 85,5% descrevendo nenhuma das duas.
 *
 *  c) COMPLETUDE — o carimbo de coleta é obrigatório. Publiquei as 20 primeiras
 *     edições sem ele, e sem carimbo não se distingue "não houve corrida" de
 *     "o coletor quebrou".
 *
 * E a edição NÃO PODE TER `generated_at`: edição congelada tem de sair byte a
 * byte igual em toda regeração, senão o guarda de congelamento da origem não
 * distingue "o dado mudou" de "o relógio andou".
 */
export function conferirEdicoes(edicoes) {
  const problems = [];
  if (edicoes.size === 0) {
    return ['extra-places/: NENHUMA edição no tarball — o arquivo da camada de mercado sumiu'];
  }
  const slugsGlobais = new Map();
  for (const [dia, texto] of [...edicoes].sort()) {
    let doc;
    try {
      doc = JSON.parse(texto);
    } catch (e) {
      problems.push(`edição ${dia}: JSON não parseia — ${e.message}`);
      continue;
    }
    try {
      exigir(doc, ['schema', 'edition', 'races', 'collected_through', 'ladder_days'],
             `edição ${dia}`);
      exigirLista(doc.races,
                  ['slug', 'venue', 'off_utc', 'terms', 'house_standard', 'extra_place', 'history'],
                  `edição ${dia}.races`);
    } catch (e) {
      problems.push(e.message);
      continue;
    }
    if (doc.schema !== 'extra_places_edition_v1') {
      problems.push(`edição ${dia}: schema "${doc.schema}"`);
    }
    if (doc.edition !== dia) {
      problems.push(`edição ${dia}: campo edition diz "${doc.edition}" — o nome do arquivo e o conteúdo discordam`);
    }
    if ('generated_at' in doc) {
      problems.push(`edição ${dia}: tem \`generated_at\`, e edição congelada não pode ter relógio de geração`);
    }
    if (!doc.collected_through) {
      problems.push(`edição ${dia}: sem \`collected_through\` — não distingue "sem corrida" de "coletor quebrado"`);
    } else if (!doc.collected_through.startsWith(dia)) {
      problems.push(`edição ${dia}: collected_through "${doc.collected_through}" é de outro dia`);
    }
    // (b) POPULAÇÃO: corrida de outro dia numa edição é mistura silenciosa.
    const forasteiras = doc.races.filter((c) => !String(c.off_utc).startsWith(dia));
    if (forasteiras.length) {
      problems.push(`edição ${dia}: ${forasteiras.length} corrida(s) de OUTRO dia, ex. ${forasteiras[0].off_utc}`);
    }
    for (const c of doc.races) {
      const anterior = slugsGlobais.get(c.slug);
      if (anterior) {
        problems.push(`slug "${c.slug}" aparece em ${anterior} E em ${dia} — URL perene precisa ser única no acervo`);
      } else {
        slugsGlobais.set(c.slug, dia);
      }
      if (!Array.isArray(c.history) || c.history.length === 0) {
        problems.push(`edição ${dia}: ${c.slug} sem histórico — a série é o produto`);
      }
    }
  }
  return problems;
}
