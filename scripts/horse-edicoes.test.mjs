// A ligação da /horse com as edições — os modos de falha que a medição de
// 06/10 mostrou que existem no dado real.
import assert from 'node:assert/strict';
import { indexarEdicoes, ligarCavalo, chaveNome } from '../src/lib/horse-edicoes.mjs';

const ew = [{
  edition: '2026-09-30',
  races: [
    { venue: 'Kempton', off_utc: '2026-09-30T16:30:00Z' },
    { venue: 'Newmarket', off_utc: '2026-09-30T13:00:00Z' },
  ],
}];
const mv = [{
  edition: '2026-09-30',
  runners: [
    { venue: 'Kempton', off_utc: '2026-09-30T16:30:00Z', runner: "Night's Edge" },
  ],
}];
const idx = indexarEdicoes(ew, mv);
const decl = (venue, off_utc, date = '2026-09-30') => ({ venue, off_utc, date });

// 1. O cartão grava +01:00 e a edição grava Z: é o mesmo instante.
assert.deepEqual(
  ligarCavalo(idx, 'Nights Edge (IRE)', decl('Kempton', '2026-09-30T17:30:00+01:00')),
  { eachWay: '2026-09-30', movers: '2026-09-30' },
);

// 2. Mesma hora, outra pista: Bellewstown não herda a corrida de Kempton.
assert.deepEqual(
  ligarCavalo(idx, 'Nights Edge', decl('Bellewstown', '2026-09-30T17:30:00+01:00')),
  { eachWay: null, movers: null },
);

// 3. A corrida está na edição de each-way, o cavalo não está no livro.
assert.deepEqual(
  ligarCavalo(idx, 'Outro Cavalo', decl('Kempton', '2026-09-30T17:30:00+01:00')),
  { eachWay: '2026-09-30', movers: null },
);

// 4. A corrida está no each-way e NENHUM corredor dela está no livro.
assert.deepEqual(
  ligarCavalo(idx, 'Nights Edge', decl('Newmarket', '2026-09-30T14:00:00+01:00')),
  { eachWay: '2026-09-30', movers: null },
);

// 5. Dia sem edição (o dia ainda não fechou): nenhum link.
assert.deepEqual(
  ligarCavalo(idx, 'Nights Edge', decl('Kempton', '2026-10-07T17:30:00+01:00', '2026-10-07')),
  { eachWay: null, movers: null },
);

// 6. A data declarada manda: a mesma corrida sob outra data não casa.
assert.deepEqual(
  ligarCavalo(idx, 'Nights Edge', decl('Kempton', '2026-09-30T17:30:00+01:00', '2026-09-29')),
  { eachWay: null, movers: null },
);

// 7. Instante ilegível não vira NaN casando com NaN.
const torto = indexarEdicoes(
  [{ edition: '2026-09-30', races: [{ venue: 'Kempton', off_utc: 'sem hora' }] }], []);
assert.deepEqual(
  ligarCavalo(torto, 'X', decl('Kempton', 'sem hora')),
  { eachWay: null, movers: null },
);

// 8. O nome: sufixo de país, apóstrofo e caixa não separam o mesmo cavalo.
assert.equal(chaveNome("Night's Edge (IRE)"), chaveNome('NIGHTS EDGE'));
assert.notEqual(chaveNome('Nights Edge'), chaveNome('Nights Edge II'));

// 9. A pista: "(AW)" no cartão e "Downs" no livro são a mesma pista.
const pistas = indexarEdicoes(
  [{ edition: '2026-09-30', races: [{ venue: 'Wolverhampton', off_utc: '2026-09-30T18:00:00Z' }] }],
  [{ edition: '2026-09-30', runners: [{ venue: 'Epsom Downs', off_utc: '2026-09-30T14:00:00Z', runner: 'X' }] }]);
assert.equal(ligarCavalo(pistas, 'X', decl('Wolverhampton (AW)', '2026-09-30T19:00:00+01:00')).eachWay, '2026-09-30');
assert.equal(ligarCavalo(pistas, 'X', decl('Epsom', '2026-09-30T15:00:00+01:00')).movers, '2026-09-30');

console.log('horse-edicoes: 9 casos passaram');
