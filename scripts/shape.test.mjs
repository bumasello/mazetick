/**
 * O guarda de forma tem de FALHAR — checador que nunca falhou não foi
 * verificado (regra 4 do projeto).
 *
 * Cada caso aqui reproduz um erro real de 2026-09-26, não um erro imaginado.
 * Rodar: `node scripts/shape.test.mjs`
 */
import { exigir, exigirLista, FormaInesperada } from './shape.mjs';

let falhas = 0;
const ok = (nome) => console.log(`  ✓ ${nome}`);
const mal = (nome, detalhe) => {
  falhas += 1;
  console.error(`  ✗ ${nome}\n      ${detalhe}`);
};

/** Espera que `fn` aborte, e que a mensagem cite `trechos`. */
function aborta(nome, fn, trechos) {
  let erro = null;
  try {
    fn();
  } catch (e) {
    erro = e;
  }
  if (!erro) return mal(nome, 'NÃO abortou — o guarda não serve');
  if (!(erro instanceof FormaInesperada)) return mal(nome, `abortou com ${erro.name}`);
  for (const t of trechos) {
    if (!erro.message.includes(t)) {
      return mal(nome, `a mensagem não cita "${t}":\n      ${erro.message}`);
    }
  }
  ok(nome);
}

function passa(nome, fn) {
  try {
    fn();
    ok(nome);
  } catch (e) {
    mal(nome, `abortou quando NÃO devia: ${e.message}`);
  }
}

console.log('Guarda de forma — os erros de 2026-09-26, reproduzidos\n');

// 1. O CSV do arquivo profundo: a coluna é `horse_name`, e eu li `horse`.
aborta(
  'coluna do arquivo profundo (horse_name, não horse)',
  () => exigir({ horse_name: 'Ablon', sire: 'Le Havre' }, ['horse'], 'rpscrape_results.csv'),
  ['`horse`', '`horse_name`', '`sire`'],
);

// 2. O cartão: as chaves são `corredores` e `nome`, e eu li `horses` e `horse`.
aborta(
  'chave do cartão (corredores, não horses)',
  () => exigir({ pista: 'Ripon', corredores: [], data: '2026-09-26' }, ['horses'], 'cartão'),
  ['`horses`', '`corredores`', '`pista`'],
);

// 3. Lista vazia passa calada por qualquer laço e produz zero.
aborta(
  'lista vazia não é "não há nada"',
  () => exigirLista([], ['slug'], 'edição.races'),
  ['VAZIA', 'indistinguível'],
);

// 4. O tipo errado inteiro — o payload que eu supus lista e era dict.
aborta(
  'payload com o tipo errado',
  () => exigirLista({ races: [] }, ['slug'], 'payload'),
  ['esperava uma lista'],
);

// 5. E o guarda não pode ser barulhento: forma certa passa.
passa('forma correta atravessa', () =>
  exigir({ slug: 'a', venue: 'b', off_utc: 'c' }, ['slug', 'venue'], 'ok'),
);
passa('lista vazia permitida quando declarado', () =>
  exigirLista([], ['x'], 'ok', { permitirVazia: true }),
);

console.log();
if (falhas) {
  console.error(`FALHOU: ${falhas} caso(s)`);
  process.exit(1);
}
console.log('Todos os guardas mordem, e nenhum morde quem não devia.');
