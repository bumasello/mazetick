/**
 * O portão das edições do /movers tem de FALHAR (regra 4).
 *
 * Rodar: `node scripts/movers-contrato.test.mjs`
 */
import { conferirEdicoesMovers } from './movers-contrato.mjs';

let falhas = 0;
const ok = (n) => console.log(`  ✓ ${n}`);
const mal = (n, d) => { falhas += 1; console.error(`  ✗ ${n}\n      ${d}`); };

/** Uma edição válida, para cada caso estragar UMA coisa de cada vez. */
const boa = (dia = '2026-09-10', dias = 12) => ({
  schema: 'movers_edition_v1',
  edition: dia,
  collected_through: `${dia}T21:45:02Z`,
  baseline: { days: dias, bands: [{ from: 3, to: 5, n: 400, p5: -20, p25: -6, p50: 0, p75: 7, p95: 30 }] },
  runners: [{
    slug: `ayr-${dia}-1540`, venue: 'Ayr', off_utc: `${dia}T15:40:00Z`, runner: 'Some Horse',
    first: { mins_to_off: 300, mid: 4.2 }, latest: { mins_to_off: 5, mid: 3.1, spread_pct: 4.1 },
    move_pct: -26.2, band: [3, 5], percentile: 3, notable: true,
  }],
});
const mapa = (...docs) => new Map(docs.map((d) => [d.edition, JSON.stringify(d)]));

function acusa(nome, docs, trecho) {
  const p = conferirEdicoesMovers(docs instanceof Map ? docs : mapa(...docs));
  if (p.length === 0) return mal(nome, 'NÃO acusou nada — o portão não serve');
  if (!p.some((x) => x.includes(trecho))) {
    return mal(nome, `acusou, mas sem citar "${trecho}":\n      ${p.join('\n      ')}`);
  }
  ok(nome);
}
const muda = (f, dia) => { const d = boa(dia); f(d); return d; };

console.log('Portão das edições do /movers — os modos de falha\n');

{
  const p = conferirEdicoesMovers(mapa(boa('2026-09-10', 12), boa('2026-09-11', 13)));
  p.length === 0 ? ok('duas edições válidas passam') : mal('duas edições válidas passam', p.join(' | '));
}
acusa('nenhuma edição', new Map(), 'NENHUMA edição');
acusa('sem collected_through', [muda((d) => { d.collected_through = null; })], 'collected_through');
acusa('carimbo de outro dia', [muda((d) => { d.collected_through = '2026-09-11T21:00:00Z'; })], 'é de outro dia');
acusa('tem generated_at', [muda((d) => { d.generated_at = '2026-10-06T00:00:00Z'; })], 'generated_at');
acusa('corredor de outro dia', [muda((d) => { d.runners[0].off_utc = '2026-09-11T12:00:00Z'; })], 'de OUTRO dia');
acusa('arquivo e conteúdo discordam', new Map([['2026-09-12', JSON.stringify(boa('2026-09-10'))]]), 'discordam');
// O rótulo que não bate com o número: a manchete da página sai daqui.
acusa('notable com percentil comum', [muda((d) => { d.runners[0].percentile = 40; })], 'o rótulo não bate');
acusa('percentil extremo sem notable', [muda((d) => { d.runners[0].notable = false; })], 'o rótulo não bate');
acusa('percentil fora de 0 a 100', [muda((d) => { d.runners[0].percentile = 140; })], 'fora de 0 a 100');
acusa('slug sem a data', [muda((d) => { d.runners[0].slug = 'ayr-1540'; })], 'não é perene');
// A base de uma edição antiga refeita com outro acervo.
acusa('base que encolhe de um dia para o outro',
  [boa('2026-09-10', 12), boa('2026-09-11', 9)], 'só pode crescer');
acusa('base abaixo do piso', [boa('2026-09-10', 3)], 'piso de 5');
acusa('chave trocada no corredor',
  [muda((d) => { d.runners[0].pct = d.runners[0].percentile; delete d.runners[0].percentile; })], 'percentile');

console.log(falhas ? `\n${falhas} caso(s) NÃO acusado(s).` : '\nTodos os modos de falha são acusados.');
process.exit(falhas ? 1 : 0);
