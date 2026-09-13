---
title: "What it costs to cross the spread, and the strategy it killed"
dek: "We had a signal that predicted which way a price would move. Then we measured the book it would have to be traded through: 16,569 quotes across 148 races. Crossing the spread once consumed 81% of the signal, and we stopped."
description: "16,569 order-book quotes across 148 races: crossing the spread once costs 4.35%, against a 5.39% signal. The measurement that ended our trading idea."
sample: "16,569 quotes · 148 races · 54 hourly collection rounds · one day"
window: "One full collection day, 08:00–21:00 UTC, 20 August 2026"
windowShort: "One day, Aug 2026"
method: "Best available prices on both sides of the exchange book, sampled every 15 minutes, expressed as a percentage of mid price and in exchange ticks."
measured: 2026-08-20
published: 2026-09-13
verdict: negative
order: 5

# ⛔ SEGURADO — não publicar até a remedição (decidido em 2026-09-13)
#
# Este artigo está medido em UM DIA (20/08/2026, 16.569 cotações, 148 corridas)
# — exatamente o defeito que fez o artigo do each-way ser segurado e remedido
# no mesmo dia. O coletor do Smarkets roda desde 20/08: já são 26 dias e
# 402.233 cotações, 24× a amostra, sem custo nenhum.
#
# E aqui a aposta é maior que o artigo. O dia medido foi a quinta-feira da
# semana do Ebor em York, quando a liquidez é alta demais — se enviesa, enviesa
# para livro APERTADO, ou seja, para um custo MENOR que o normal. O custo de
# atravessar o spread é o número que matou a nossa estratégia de trading; se ele
# mudar, muda a decisão, não só o texto.
#
# A remedição é trabalho de laboratório e roda na sessão de orquestração.
# Quando o número novo chegar: atualizar sample/window/windowShort/measured e
# a seção "A célula que decidiu", e só então remover `draft`.
draft: true
limits:
  - "This is one day — a Thursday of a major festival week. If a busy day biases the result, it biases it towards tighter books and a more favourable answer than normal, not a worse one."
  - "It is one exchange, and a smaller one. Its books are wider than the largest exchange's, so this is an upper bound on cost, not a measurement of the cheapest venue available. It cannot show that trading is expensive everywhere; it shows that cheap execution cannot be assumed without measuring it."
  - "Quoted spread is not realised cost. A patient order that waits rather than crossing can do better, at the price of not always being filled — and an unfilled leg on a two-legged trade is its own loss."
  - "The signal it is compared against was measured on a different venue and a different period. The comparison is order-of-magnitude, and it is only decisive because the gap is large."
---

For a while we thought we had something. Not a way to predict which horse would win — we had already established, twice, that we could not do that — but something narrower and, in principle, more tradeable: a signal that predicted **which way a price would move** between morning and the off.

That is a different business. You are not exposed to the result of the race. You take a position, the price moves, you close it and keep the difference. The horse can finish last.

The signal was real. On the residual — after removing the fact that prices drift predictably by odds level, which is not tradeable because everyone can see it — the direction was right **64% of the time** with a model that had seen closing prices, and **57%** with one that had not. The second number is the honest one, and its quintile spread was clean and monotonic.

Then we measured what it would cost to trade.

## What was measured

A collector sampled the exchange order book every fifteen minutes, from 08:00 to 21:00 UTC, recording the best available price on each side for every runner in every UK and Irish race. One complete day: **54 collection rounds with no gaps, 16,569 quotes across 148 races**, and one failed market read.

The gap between the two sides — the spread — is what you pay to trade immediately rather than wait. It is reported below as a percentage of the mid price, and in **ticks**, the fixed increments an exchange price moves in.

<div class="table-scroll">
<table class="dense">
  <thead>
    <tr>
      <th scope="col">Odds band</th>
      <th scope="col" class="num">Morning spread</th>
      <th scope="col" class="num">In ticks</th>
      <th scope="col" class="num">Afternoon</th>
      <th scope="col" class="num">Near the off</th>
    </tr>
  </thead>
  <tbody>
    <tr><td data-label="Band">4 – 8</td><td data-label="Morning" class="num">8.7%</td><td data-label="Ticks" class="num">4.0</td><td data-label="Afternoon" class="num">10.8%</td><td data-label="Near off" class="num">8.9%</td></tr>
    <tr><td data-label="Band">8 – 13</td><td data-label="Morning" class="num">15.5%</td><td data-label="Ticks" class="num">5.5</td><td data-label="Afternoon" class="num">24.8%</td><td data-label="Near off" class="num">16.8%</td></tr>
    <tr><td data-label="Band">13 – 20</td><td data-label="Morning" class="num">19.5%</td><td data-label="Ticks" class="num">6.0</td><td data-label="Afternoon" class="num">22.5%</td><td data-label="Near off" class="num">22.4%</td></tr>
  </tbody>
</table>
</div>

Note that the book does **not** tighten through the day in the way you might expect. In the middle bands it is widest in the afternoon, and near the off it is no better than it was in the morning.

## The cell that decided it

Our signal entered at a median price of about 5.85, which puts it in the first row: **odds 4 to 8, in the morning**, 903 quotes.

<div class="table-scroll">
<table class="dense">
  <thead>
    <tr>
      <th scope="col">Spread, odds 4–8, morning</th>
      <th scope="col" class="num">p10</th>
      <th scope="col" class="num">p25</th>
      <th scope="col" class="num">median</th>
      <th scope="col" class="num">p75</th>
      <th scope="col" class="num">p90</th>
    </tr>
  </thead>
  <tbody>
    <tr><td data-label="Measure">As % of price</td><td data-label="p10" class="num">4.0</td><td data-label="p25" class="num">6.0</td><td data-label="median" class="num"><strong>8.7</strong></td><td data-label="p75" class="num">15.0</td><td data-label="p90" class="num">80.8</td></tr>
    <tr><td data-label="Measure">In ticks</td><td data-label="p10" class="num">2.0</td><td data-label="p25" class="num">—</td><td data-label="median" class="num"><strong>4.0</strong></td><td data-label="p75" class="num">6.0</td><td data-label="p90" class="num">40.5</td></tr>
  </tbody>
</table>
</div>

Crossing a spread costs you **half of it** against the mid price. Half of 8.7% is **4.35%**.

The signal, measured as excess movement over the baseline drift for its odds level, was worth **5.39%**.

**The cost of entering the position consumed 81% of the gross signal, before any cost of getting out.** We had written down in advance that we would abandon the idea if execution cost exceeded 80% of the gross, precisely so that the decision would not be made after seeing the number we wanted. It exceeded it.

## The assumption that had been carrying the plan

Before this, execution cost had been modelled under three scenarios: optimistic, one tick per side; base, a tick each way; pessimistic, two ticks per side. They gave answers from **+2.82%** to **−4.31%**. The range was wider than the signal, which should have been the warning.

The measurement resolves which scenario was real. The median book is **4 ticks** — the pessimistic assumption. Only **15%** of quotes showed the 2-tick book the optimistic case assumed; 56% fit within 4 ticks.

So the profitable version of this strategy existed only under the most generous assumption available, and that assumption is false in 85% of the book.

Liquidity, for what it is worth, was never the constraint. The amount available at the best price had a median of about £57, with £13 at the tenth percentile. For any stake we were contemplating, the money was there. **What was not there was room between the two sides of the book.**

## Why we published a dead idea

Because the interesting part is not the conclusion, it is the ordering.

The signal was genuine and it survived the checks we had been burned by before. Every part of the analysis that came before this measurement pointed at a real, modest, tradeable edge. The thing that killed it was not a flaw in the prediction — it was a cost that had been assumed rather than measured, in a model where one plausible assumption gave a profit and another gave a loss.

We had three scenarios and no data to choose between them. That is not a strategy with an uncertainty attached; it is not a strategy at all. It became one only for as long as we did not look.

The collector that produced this table is still running.
