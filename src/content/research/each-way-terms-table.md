---
title: "The standard each-way terms table is wrong in 44.5% of races"
dek: "Over 510 races and eight days of hourly collection, the terms a bookmaker actually advertised differed from the classic table 227 times. Every single divergence ran the same way: the table promised a bigger place fraction than was on offer."
description: "510 races, eight days: the classic each-way terms table was wrong 227 times, and always in the direction that overstates the return."
sample: "510 races · 227 divergences · UK & Ireland · win-only races excluded"
window: "6–13 September 2026, eight consecutive days"
windowShort: "8 days, Sep 2026"
method: "Terms read hourly from one bookmaker's own public race pages, 06:00–21:00 UTC, and compared against the classic terms table."
measured: 2026-09-13
derivation: "scripts/ew_terms_audit.py@318b8bc"
published: 2026-09-13
verdict: negative
order: 2

# ⛔ SEGURADO — reescrever, não remendar (atualizado em 2026-09-14)
#
# TERCEIRA correção da mesma medição, e cada uma tornou o artigo melhor. O que
# está escrito abaixo no corpo está MORTO e não deve ser reaproveitado.
#
# Mortos: "44,5% em 510 corridas" (1ª versão) e "a clássica diz 1/4 e a Paddy
# Power paga 1/5 em 128 de 128" (2ª). A 2ª media o ÚLTIMO snapshot de cada
# corrida — isto é, o estado JÁ PROMOVIDO. Separando abertura de fechamento:
#
#   faixa          mudaram   abertura -> fechamento
#   hcap 10-11      0/45     3@1/5 estável
#   comum 10+       0/68     3@1/5 estável
#   hcap 12-15     31/88     3@1/4 existe na abertura, SOME no fechamento
#   hcap 16+       24/40     4@1/4 e 3@1/4 na abertura, ZERO 1/4 no fim
#
# ===> A TABELA CLÁSSICA NÃO ESTÁ ERRADA. ESTÁ SEM DATA. <===
#
# Ela descreve a ABERTURA do mercado. Durante o dia a casa promove, e a
# promoção é uma troca explícita: mais uma vaga, fração de 1/4 para 1/5. Vaga
# extra não é de graça — é um trade, e ninguém publica isso. A tabela acerta
# exatamente onde os termos são estáveis (113 corridas, 0 mudanças) e "erra"
# exatamente onde há promoção.
#
# Isto é a TESE DO SITE INTEIRO demonstrada na pergunta do each-way: um número
# sem carimbo de tempo não é um número errado, é um número sem data. Artigo
# muito melhor que "a tabela erra 44,5%".
#
# Sobra um erro de fronteira que NÃO é promoção, e vale um parágrafo: em campo
# de 5 a 9 a clássica promete 2 vagas onde a casa paga só vitória (até 6
# corredores) e 1/5 onde ela paga 1/4 (7 a 9).
#
# A /extra-places já publica a consequência disto: "vaga extra" é pagar acima
# da escada DA PRÓPRIA CASA, e a página mostra a troca de fração junto — hoje,
# 19 de 19 aumentos de vaga vieram com fração pior.
#
# ⚠️ Descartada também a "bimodalidade dentro da faixa" da 2ª versão: era
# artefato de agrupar 8-11 num balde porque a tabela clássica agrupa.
#
# Derivação: scripts/ew_terms_audit.py@318b8bc no horsing-maze. A terceira
# correção só foi possível porque a segunda ficou versionada e deu para
# reexecutar — é o argumento inteiro da regra da derivação.
draft: true
limits:
  - "This is one bookmaker. Terms are set per firm and the classic table is not wrong in the same way everywhere; a second firm has to be measured before the rate generalises."
  - "Eight days is eight days. The direction of the error is unambiguous — 227 divergences and not one running the other way — but the rate of 44.5% will move as more days are collected, and this page will be updated when it does."
  - "It does not tell you what an each-way bet returns. The fraction is one input into that, and we have not published a return figure because our own each-way numbers were computed with the wrong fraction and are being redone."
  - "Terms can change again between collection and the off. Each figure here is what was advertised at the hour it was read."
---

Most each-way calculators, spreadsheets and strategy articles carry the same short table. Handicap with sixteen or more runners: four places at a quarter. Eight to fifteen runners: three places at a fifth. Non-handicap, five to seven runners: two places at a quarter. It has been reproduced for decades.

We wrote it into our own code too, in a function that decided what an each-way bet was worth. It was never checked against anything. So we checked it.

## What was measured

Since 6 September 2026 a collector has read the each-way terms a bookmaker advertises on its own public race pages, once an hour, from 06:00 to 21:00 UTC, for every UK and Irish race. It records the number of places offered and the fraction of the odds paid on the place part, exactly as displayed, with the hour attached.

Over the first eight days that is **510 races**. For each one, the advertised terms were compared with what the classic table says they should be.

<div class="table-scroll">
<table class="dense">
  <thead>
    <tr>
      <th scope="col">Races collected, 8 days</th>
      <th scope="col" class="num">510</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="Result">Table matched what was advertised</td>
      <td data-label="Races" class="num">283 &nbsp;<span class="faint">55.5%</span></td>
    </tr>
    <tr>
      <td data-label="Result">Table overstated the place fraction</td>
      <td data-label="Races" class="num">227 &nbsp;<span class="faint">44.5%</span></td>
    </tr>
    <tr>
      <td data-label="Result">Table understated the place fraction</td>
      <td data-label="Races" class="num">0</td>
    </tr>
  </tbody>
</table>
</div>

**Not one divergence in 510 races ran the other way.** That is the finding. A rate of 44.5% would be interesting on its own, but a rate with no exceptions in either direction is a different kind of claim: it says the table is not noisy, it is systematically wrong, in one direction, by a known mechanism.

## The mechanism

The divergences concentrate in one branch of the table: the rule that a large handicap pays **a quarter** the odds when it offers three places. Against the terms actually advertised, that is not what happens. Three places or more were paid at **a fifth**.

The difference is not decorative. A fifth returns **20% less** on the place part of the bet than a quarter does. Anyone sizing an each-way bet from the table has been valuing the place leg about a fifth higher than the bookmaker was offering to pay, in almost half of all races.

The error runs in the direction that flatters the bet. That is worth sitting with, because a table that erred randomly would have been caught long ago by somebody losing money unexpectedly. A table that only ever overstates the return produces bets that look slightly better than they are, and a shortfall small enough to be blamed on variance.

## What we got wrong first

Our first pass at this used 37 races from a single day and reported 43%. That number was wrong in a way worth describing, because the correction made the finding stronger rather than weaker.

Twenty-five of the races in the collection were **win-only** — no place part offered at all. The first count treated those as divergences. They are not: where there is no place fraction, the table's claim about the place fraction is not being contradicted, it simply does not apply. Excluding them and extending to eight days moves the rate to 44.5% and, more importantly, leaves the direction with **no exceptions at all** rather than nearly none.

## Why this sits under everything else

We are not publishing this because a fifth is worse than a quarter. We are publishing it because of what it implies about received wisdom in this sport.

The terms table is the most reproduced, least examined artefact in each-way betting. It costs one HTTP request an hour to check, nobody had checked it, and it turns out to be wrong in nearly half of all races in one direction. Our own each-way analysis was built on top of it, which means **every each-way return this project has ever computed was computed with the place leg inflated**, and those numbers have been withdrawn rather than corrected in place.

When this site later shows which races pay an extra place, it will show **what the bookmaker is advertising, with the hour it was read**, and use the classic table only as the comparison. That is the whole difference between reporting a fact and repeating a rule.
