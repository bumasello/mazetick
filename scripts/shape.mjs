/**
 * Exigir a forma do dado ANTES de ler campo, em vez de descobrir depois.
 *
 * ⚠️ O ERRO QUE ISTO EXISTE PARA IMPEDIR, e que foi cometido TRÊS VEZES em
 * 2026-09-26, sempre do mesmo jeito:
 *
 *   - o CSV do arquivo profundo tem `horse_name`, e o código leu `horse`;
 *   - o cartão tem `corredores`/`nome`, e o código leu `horses`/`horse`;
 *   - o subfórum tinha outro caminho, e a URL chutada deu 404.
 *
 * Nos três, ler a chave errada NÃO levantou erro. `obj.naoExiste` é
 * `undefined`, `(x || "")` vira string vazia, e a contagem sai zero. O
 * resultado parece saudável: um índice do tamanho exato da outra fonte, uma
 * cobertura plausível, uma lista vazia que se lê como "não há nada aqui".
 *
 * **Contar zero não é prova de que não há nada — é igualmente compatível com
 * ter olhado no lugar errado.**
 *
 * A cura não é lembrar de conferir. É a leitura ABORTAR nomeando as chaves que
 * de fato existem, porque é justamente essa lista que eu não fui olhar.
 */

/** Erro com a lista do que EXISTE — é ela que resolve o problema. */
export class FormaInesperada extends Error {}

/**
 * Aborta se qualquer campo de `campos` faltar em `obj`.
 *
 * @param {object} obj       o objeto a conferir (uma amostra basta)
 * @param {string[]} campos  os campos que o código adiante vai ler
 * @param {string} contexto  de onde veio, para a mensagem ser acionável
 * @returns {object} o próprio `obj`, para encadear
 */
export function exigir(obj, campos, contexto) {
  if (obj === null || typeof obj !== 'object') {
    throw new FormaInesperada(
      `${contexto}: esperava um objeto, veio ${obj === null ? 'null' : typeof obj}`,
    );
  }
  const faltam = campos.filter((c) => !(c in obj));
  if (faltam.length === 0) return obj;
  const existem = Object.keys(obj);
  throw new FormaInesperada(
    `${contexto}: falta(m) ${faltam.map((f) => `\`${f}\``).join(', ')}.\n` +
      `  As chaves que EXISTEM são: ${existem.map((k) => `\`${k}\``).join(', ')}\n` +
      '  (ler chave inexistente devolve undefined e falha calado — por isso isto aborta)',
  );
}

/**
 * Idem, para uma lista: confere a forma no primeiro item e exige que a lista
 * não esteja vazia.
 *
 * ⚠️ Lista vazia é o caso perigoso: ela passa por qualquer laço sem erro e
 * produz zero. Se zero for um resultado legítimo aqui, passe
 * `permitirVazia: true` e assuma a escolha por escrito.
 */
export function exigirLista(lista, campos, contexto, { permitirVazia = false } = {}) {
  if (!Array.isArray(lista)) {
    throw new FormaInesperada(`${contexto}: esperava uma lista, veio ${typeof lista}`);
  }
  if (lista.length === 0) {
    if (permitirVazia) return lista;
    throw new FormaInesperada(
      `${contexto}: lista VAZIA. Um laço sobre ela produz zero sem erro nenhum, ` +
        'que é indistinguível de "li a chave errada". Se vazia for legítima, ' +
        'passe permitirVazia: true.',
    );
  }
  exigir(lista[0], campos, `${contexto}[0]`);
  return lista;
}
