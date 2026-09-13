---
title: "The tote paid less than the exchange in all three products"
dek: "Across 343 matched races, the tote win dividend came to 0.94 of the exchange return, the place dividend to 0.85, and the exacta to 0.81. There was no odds band in which the pool paid more."
description: "343 matched races: tote win dividends returned 0.94 of the exchange, place 0.85, exacta 0.81. No odds band favoured the pool."
sample: "343 races · 269 winners · 701 placed runners · 270 exactas"
window: "Backfill to 5 September 2026; matched subset of a 120-day collection"
windowShort: "To Sep 2026, partial"
method: "Declared tote dividends per £1 compared with the net exchange return on the same runner, after 6.5% commission. Medians by odds band."
measured: 2026-09-06
published: 2026-09-13
verdict: negative
order: 3
limits:
  - "The match rate is 25%. Irish meetings and name variants account for most of the shortfall, and a biased match is the main way this result could be wrong — though a bias that reversed the direction in every band and every product at once is hard to construct."
  - "343 races is a partial backfill, not the full collection. The size of the gap will move as coverage grows; its direction was consistent across all six odds bands and all three products."
  - "Medians, not means. The tote occasionally pays spectacularly on an outsider, and a mean would be dragged by those tails. Anyone betting one race at a time is living in the median."
  - "It does not cover the tote's own promotions, guarantees or minimum dividends, which are separate products and change the arithmetic where they apply."
  - "This compares payouts. It says nothing about whether either price was correct, and nothing about placing bets into a pool large enough to move it."
---

Pool betting and exchange betting answer the same question with different machinery. On an exchange, your price is fixed when you strike the bet. In a pool, everyone's money goes into one fund, a deduction is taken, and whatever remains is divided among the winning tickets — so your price is not known until betting closes.

Two systems, same races, same horses. Which pays more? Until this measurement we had no idea, and neither, as far as we could find, does anybody publishing on the subject.

## What was measured

Declared tote dividends were collected per race from a public racing data feed: win, place, exacta, trifecta and straight forecast. For each runner, the tote dividend per £1 staked was compared with the **net return on the same runner at the exchange starting price**, after 6.5% commission on winnings.

The result is a ratio. Above 1.00 the pool paid more; below 1.00 the exchange paid more. The table reports **medians** within each odds band, on 343 matched races containing 269 winners, 701 placed runners and 270 completed exactas.

<div class="table-scroll">
<table class="dense">
  <thead>
    <tr>
      <th scope="col">Odds band</th>
      <th scope="col" class="num">Win: tote ÷ exchange</th>
      <th scope="col" class="num">Place: tote ÷ exchange</th>
    </tr>
  </thead>
  <tbody>
    <tr><td data-label="Band">1.0 – 2.0</td><td data-label="Win" class="num">0.993</td><td data-label="Place" class="num">0.919</td></tr>
    <tr><td data-label="Band">2.0 – 3.0</td><td data-label="Win" class="num">0.964</td><td data-label="Place" class="num">0.856</td></tr>
    <tr><td data-label="Band">3.0 – 5.0</td><td data-label="Win" class="num">0.947</td><td data-label="Place" class="num">0.842</td></tr>
    <tr><td data-label="Band">5.0 – 8.0</td><td data-label="Win" class="num">0.909</td><td data-label="Place" class="num">0.819</td></tr>
    <tr><td data-label="Band">8.0 and longer</td><td data-label="Win" class="num">0.920</td><td data-label="Place" class="num">0.759</td></tr>
    <tr><td data-label="Band"><strong>All</strong></td><td data-label="Win" class="num"><strong>0.943</strong></td><td data-label="Place" class="num"><strong>0.849</strong></td></tr>
  </tbody>
</table>
</div>

**Every cell is below 1.00.** Six odds bands, two products, no exception. On the win pool the median runner returned about 94% of what the exchange paid on the same horse; on the place pool, about 85%.

## The exacta is the widest gap

Straight forecasts and exactas are where pool betting is usually said to earn its keep, on the grounds that combination markets are thin and hard to price. Comparing the declared exacta dividend against a fair price for the same combination — derived from the win prices of the two horses, with no deduction applied — gives a median ratio of **0.813**.

The pool paid above that fair figure in **11% of cases**. The implied effective deduction is around **19%**.

That is not a small edge to overcome. It is a fifth of the stake removed before any question of skill arises, and it applies whether the selection was good or bad.

## Where the gap comes from, and where it does not

Nothing here suggests the pool is mispricing horses. The ratio is widest on longer-priced runners and on the place pool, which is exactly the pattern a **fixed percentage deduction** produces: the take is removed from the fund before division, so it scales with the payout rather than sitting as a flat fee.

That is the honest reading. The tote is not making errors that a bettor could exploit. It is charging more than the exchange charges, and doing so transparently, in public, in its published deduction rates.

For anyone comparing the two, the practical point is narrow: **on these races, in every band measured, taking the exchange price paid more than waiting for the dividend.** The pool's appeal has to rest on something other than the payout — a bet type the exchange does not offer, a race with no exchange liquidity, or the particular pleasure of not knowing your price until the off.

## Why this was worth measuring at all

We did not expect this result. Pool deductions are published, but the exchange also charges commission, and the two are quoted on different bases — the pool's from the fund, the exchange's from your winnings — which makes them genuinely hard to compare from the documentation alone.

The comparison had to be done on settled races or not at all. It took one public data feed and a few hundred races to answer a question that gets argued about indefinitely, and the answer was the same in every band we looked at.
