/**
 * A ligação da /horse com as edições congeladas: a última corrida declarada
 * do cavalo aponta para o registro daquele dia.
 *
 * ⚠️ O LINK SÓ EXISTE QUANDO A EDIÇÃO FALA DAQUELA CORRIDA. Existir a edição
 * do dia não basta: medido em 06/10, 71 de 7.197 cavalos tinham a última
 * corrida num dia com edição de each-way que não trazia a corrida, e 942 não
 * estavam no livro de ofertas do dia. Link para uma página que não menciona o
 * que prometeu é o mesmo erro do rótulo que afirma outra coisa.
 *
 * ⚠️ O INSTANTE NÃO BASTA COMO CHAVE. Em 30/09 Bellewstown e Kempton largaram
 * no mesmo minuto, e casar só pela hora ligava cinco cavalos à corrida errada.
 * A chave é pista + instante. E o instante se compara como NÚMERO: o cartão
 * grava `+01:00` e as edições gravam `Z`, e as duas cadeias nunca são iguais.
 *
 * Módulo puro, sem leitura de disco, para ser testado fora do build.
 */

/** Nome sem sufixo de país, sem pontuação e sem caixa. */
export const chaveNome = (s) =>
  s.replace(/\s*\([A-Z]{2,3}\)\s*$/, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * ⚠️ AS TRÊS FONTES NOMEIAM A PISTA DE JEITOS DIFERENTES. O cartão diz
 * "Wolverhampton (AW)", as edições dizem "Wolverhampton", e o livro de ofertas
 * diz "Epsom Downs" onde o cartão diz "Epsom". Sem isto, 1.560 cavalos de
 * areia ficavam sem link nenhum (medido em 06/10: 5.566 ligados em vez de
 * 7.126) e nada acusava, porque link ausente é um resultado válido.
 */
const APELIDOS = { epsomdowns: 'epsom' };
const chavePista = (s) => {
  const k = s.replace(/\s*\([^)]*\)\s*$/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return APELIDOS[k] ?? k;
};

/** O instante como número; cadeia que não é data vira nulo, nunca NaN. */
const instante = (s) => {
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
};

/**
 * O índice das duas coleções: por data, o que cada edição contém.
 * `edicoesEw` e `edicoesMv` são as listas de `carregarEdicoes()` e
 * `carregarEdicoesMovers()`.
 */
export function indexarEdicoes(edicoesEw, edicoesMv) {
  const ew = new Map();
  for (const e of edicoesEw) {
    const corridas = new Set();
    for (const r of e.races) {
      const t = instante(r.off_utc);
      if (t !== null) corridas.add(`${chavePista(r.venue)}|${t}`);
    }
    ew.set(e.edition, corridas);
  }
  const mv = new Map();
  for (const e of edicoesMv) {
    const corredores = new Set();
    for (const r of e.runners) {
      const t = instante(r.off_utc);
      if (t !== null) corredores.add(`${chavePista(r.venue)}|${t}|${chaveNome(r.runner)}`);
    }
    mv.set(e.edition, corredores);
  }
  return { ew, mv };
}

/**
 * Para onde a última corrida declarada aponta. Cada lado é a data da edição
 * ou nulo; nulo quer dizer "não há o que mostrar", e a página não põe link.
 */
export function ligarCavalo(indice, nome, decl) {
  const t = instante(decl.off_utc);
  if (t === null) return { eachWay: null, movers: null };
  const corrida = `${chavePista(decl.venue)}|${t}`;
  return {
    eachWay: indice.ew.get(decl.date)?.has(corrida) ? decl.date : null,
    movers: indice.mv.get(decl.date)?.has(`${corrida}|${chaveNome(nome)}`) ? decl.date : null,
  };
}
