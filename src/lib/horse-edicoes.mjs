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
  // Por data, chave -> slug da corrida NA PRÓPRIA EDIÇÃO. O slug é o `id` da
  // corrida na página da edição, então o link cai direto nela. Cada coleção
  // tem o seu: o livro de ofertas escreve "epsom-downs" onde a de each-way
  // escreve "epsom", e a âncora tem de ser a da página de destino.
  const ew = new Map();
  for (const e of edicoesEw) {
    const corridas = new Map();
    for (const r of e.races) {
      const t = instante(r.off_utc);
      if (t !== null) corridas.set(`${chavePista(r.venue)}|${t}`, r.slug ?? null);
    }
    ew.set(e.edition, corridas);
  }
  const mv = new Map();
  for (const e of edicoesMv) {
    const corredores = new Map();
    for (const r of e.runners) {
      const t = instante(r.off_utc);
      if (t !== null) corredores.set(`${chavePista(r.venue)}|${t}|${chaveNome(r.runner)}`, r.slug ?? null);
    }
    mv.set(e.edition, corredores);
  }
  return { ew, mv };
}

/**
 * Para onde a última corrida declarada aponta. `eachWay` e `movers` são a data
 * da edição ou nulo; nulo quer dizer "não há o que mostrar", e a página não põe
 * link. `eachWayAnchor` e `moversAnchor` são o `id` da corrida naquela página,
 * ou nulo se a edição não traz slug: aí o link vai para o topo da página.
 */
export function ligarCavalo(indice, nome, decl) {
  const vazio = { eachWay: null, movers: null, eachWayAnchor: null, moversAnchor: null };
  const t = instante(decl.off_utc);
  if (t === null) return vazio;
  const corrida = `${chavePista(decl.venue)}|${t}`;
  const noEw = indice.ew.get(decl.date);
  const noMv = indice.mv.get(decl.date);
  const chaveMv = `${corrida}|${chaveNome(nome)}`;
  const temEw = Boolean(noEw?.has(corrida));
  const temMv = Boolean(noMv?.has(chaveMv));
  return {
    eachWay: temEw ? decl.date : null,
    movers: temMv ? decl.date : null,
    eachWayAnchor: temEw ? (noEw.get(corrida) ?? null) : null,
    moversAnchor: temMv ? (noMv.get(chaveMv) ?? null) : null,
  };
}
