/**
 * O portão das edições tem de FALHAR (regra 4).
 *
 * Cada caso abaixo é um erro que aconteceu de verdade em 2026-09-26, ou um que
 * o desenho das edições torna possível. Não há caso inventado por simetria.
 *
 * Rodar: `node scripts/edicoes-contrato.test.mjs`
 */
import { conferirEdicoes } from './edicoes-contrato.mjs';

let falhas = 0;
const ok = (n) => console.log(`  ✓ ${n}`);
const mal = (n, d) => { falhas += 1; console.error(`  ✗ ${n}\n      ${d}`); };

/** Uma edição válida, para cada caso estragar UMA coisa de cada vez. */
const boa = (dia = '2026-09-10') => ({
  schema: 'extra_places_edition_v1',
  edition: dia,
  collected_through: `${dia}T21:00:01Z`,
  ladder_days: 5,
  races: [{
    slug: `ayr-${dia}-1540`,
    venue: 'Ayr',
    off_utc: `${dia}T15:40:00Z`,
    terms: { places: 3, fraction: [1, 5] },
    house_standard: { places: 3, fraction: [1, 5] },
    extra_place: false,
    history: [{ at: `${dia}T06:00:00Z`, field_size: 12, places: 3, fraction: [1, 5] }],
  }],
});

const mapa = (...docs) => new Map(docs.map((d) => [d.edition, JSON.stringify(d)]));

function acusa(nome, docs, trecho) {
  const p = conferirEdicoes(docs instanceof Map ? docs : mapa(...docs));
  if (p.length === 0) return mal(nome, 'NÃO acusou nada — o portão não serve');
  if (!p.some((x) => x.includes(trecho))) {
    return mal(nome, `acusou, mas sem citar "${trecho}":\n      ${p.join('\n      ')}`);
  }
  ok(nome);
}

console.log('Portão das edições — os modos de falha, reproduzidos\n');

// COMPLETUDE: publiquei 20 edições sem carimbo de coleta em 26/09.
acusa('sem collected_through', [{ ...boa(), collected_through: null }], 'collected_through');
acusa('carimbo de outro dia',
  [{ ...boa(), collected_through: '2026-09-11T21:00:01Z' }], 'é de outro dia');

// CONGELAMENTO: relógio de geração impede a regeração byte a byte.
acusa('tem generated_at', [{ ...boa(), generated_at: '2026-09-27T00:00:00Z' }], 'generated_at');

// POPULAÇÃO: foi misturar duas que produziu a cobertura de 85,5%.
{
  const d = boa();
  d.races = [...d.races, { ...d.races[0], slug: 'x-2026-09-11-1200', off_utc: '2026-09-11T12:00:00Z' }];
  acusa('corrida de outro dia na edição', [d], 'de OUTRO dia');
}

// CHAVE PERENE: `venue-HHMM` colidia em 75 slugs / 176 corridas.
{
  const a = boa('2026-09-10');
  const b = boa('2026-09-11');
  b.races[0].slug = a.races[0].slug;           // slug repetido entre dias
  b.races[0].off_utc = '2026-09-11T15:40:00Z';
  acusa('slug repetido entre edições', [a, b], 'única no acervo');
}

// FORMA: três vezes em 26/09 eu li a chave errada e não deu erro.
acusa('falta um campo do topo', [{ ...boa(), races: undefined, edition: '2026-09-10' }], 'races');
{
  const d = boa();
  d.races = [{ venue: 'Ayr', off_utc: '2026-09-10T15:40:00Z' }];  // sem slug, terms…
  acusa('corrida sem os campos que a página lê', [d], 'As chaves que EXISTEM');
}

// CONTAR ZERO NÃO É PROVA: tarball sem nenhuma edição.
acusa('nenhuma edição no tarball', new Map(), 'NENHUMA edição');

// A SÉRIE É O PRODUTO: corrida sem histórico não tem o que publicar.
{
  const d = boa();
  d.races[0].history = [];
  acusa('corrida sem histórico', [d], 'sem histórico');
}

// O nome do arquivo e o conteúdo têm de concordar.
acusa('edition diverge do nome do arquivo',
  new Map([['2026-09-10', JSON.stringify({ ...boa('2026-09-10'), edition: '2026-09-12' })]]),
  'discordam');

// E o portão não pode ser barulhento.
{
  const p = conferirEdicoes(mapa(boa('2026-09-10'), boa('2026-09-11')));
  if (p.length) mal('duas edições válidas passam', p.join(' · '));
  else ok('duas edições válidas passam');
}

console.log();
if (falhas) { console.error(`FALHOU: ${falhas} caso(s)`); process.exit(1); }
console.log('Todos os modos de falha são acusados, e o caso bom passa.');
