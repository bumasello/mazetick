---
title: "Backing the favourite wins one race in three and loses money"
dek: "Across 33,508 races, the morning favourite won 32.8% of the time and returned −3.90% after commission. The place favourite, where it started at 1.5 or shorter, won 78.8% of its bets and still returned −1.22%. Strike rate and profit are different quantities."
description: "33,508 UK and Irish races measured: the favourite wins 32.8% of the time and loses 3.90% per bet after commission. Why strike rate is not profit."
sample: "33,508 races · UK & Ireland · 6.5% commission applied"
window: "1 January 2024 – 5 September 2026"
windowShort: "Jan 2024 – Sep 2026"
method: "Selection at the morning price; every bet settled at the exchange starting price. No filters, no staking plan."
measured: 2026-09-06
derivation: "src/oneTimeScript/back_favourite_probe.py@a606064"
published: 2026-09-13
verdict: negative
order: 1
limits:
  - "This is a back bet placed on an exchange and settled at the starting price, with 6.5% commission on winnings. It says nothing about lay betting, which is a different bet with different arithmetic."
  - "It does not test bookmaker prices. Best odds guaranteed, price boosts and other promotions are separate products and are not included here; a promotion can change the arithmetic, which is why it has to be measured on its own."
  - "Selection is made at the morning price only. A bet placed at another time of day is a different selection and was not measured."
  - "Coverage is UK and Irish racing. Nothing here is claimed about other jurisdictions."
  - "The confidence intervals describe sampling error over these 33,508 races. They do not cover the possibility that the next two years differ from the last two."
---

"Back the favourite — you'll be right more often than not." The claim is testable, and the second half of it is true. Being right more often than not is not the same as making money, and the gap between those two statements is the whole subject of this article.

## What was measured

Every UK and Irish race with a settled exchange market between 1 January 2024 and 5 September 2026: **33,508 races**. In each one the favourite was identified by the **morning price** — the price available at the time you would actually place the bet, not the price at the off. Every bet was then settled at the **exchange starting price**, and **6.5% commission** was deducted from winnings.

That sequence matters more than it looks. Choosing the favourite by its closing price and settling at that same closing price is a measurement you cannot execute, because the closing price is only known once the race is under way. Doing it that way inflates results. This project has produced inflated numbers that way before, and the correction is why the selection step and the settlement step use different prices here.

No filters. No staking plan. Every race in the window, flat stakes.

<div class="table-scroll">
<table class="dense">
  <thead>
    <tr>
      <th scope="col">Bet</th>
      <th scope="col" class="num">Strike rate</th>
      <th scope="col" class="num">Return before commission</th>
      <th scope="col" class="num">Return after commission</th>
      <th scope="col" class="num">95% interval</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="Bet">Favourite, to win</td>
      <td data-label="Strike rate" class="num">32.8%</td>
      <td data-label="Before commission" class="num">+0.50%</td>
      <td data-label="After commission" class="num">−3.90%</td>
      <td data-label="95% interval" class="num faint">−5.64% to −2.21%</td>
    </tr>
    <tr>
      <td data-label="Bet">Favourite, to place</td>
      <td data-label="Strike rate" class="num">60.6%</td>
      <td data-label="Before commission" class="num">+0.37%</td>
      <td data-label="After commission" class="num">−2.22%</td>
      <td data-label="95% interval" class="num faint">−3.17% to −1.23%</td>
    </tr>
    <tr>
      <td data-label="Bet">Place favourite, 1.5 or shorter</td>
      <td data-label="Strike rate" class="num">78.8%</td>
      <td data-label="Before commission" class="num">—</td>
      <td data-label="After commission" class="num">−1.22%</td>
      <td data-label="95% interval" class="num faint">−2.20% to −0.18%</td>
    </tr>
    <tr>
      <td data-label="Bet">First and second favourite, to win</td>
      <td data-label="Strike rate" class="num">26.5%</td>
      <td data-label="Before commission" class="num">—</td>
      <td data-label="After commission" class="num">−4.79%</td>
      <td data-label="95% interval" class="num faint">—</td>
    </tr>
  </tbody>
</table>
</div>

The three intervals shown sit entirely below zero. This is not the familiar "the result is indistinguishable from zero" finding: it is a loss, demonstrated on a large sample. The fourth row is reported without an interval because none was computed for it, and it is left in the table as a comparison rather than as a result.

## Being right 78.8% of the time

The third row is the sharpest version of the point. Restrict the bet to the place favourite in races where it started at **1.5 or shorter**, and you win **78.8%** of your bets. Four winners in every five. It still returns **−1.22%**.

The arithmetic is not subtle. A bet that wins 78.8% of the time pays short, because that is what 78.8% is worth. Each winner returns a fraction of the stake; each loser costs the stake in full. At a fair price those two quantities cancel exactly. Commission is then deducted from the winners and from nothing else, so the cancellation breaks in one direction only.

**A high strike rate is not evidence of an edge. It is a description of the odds you accepted.** Any bet can be given a strike rate of 95% by choosing short enough prices, and the price will move to make it cost exactly what it is worth.

## Where the money actually goes

Read the first row again, in both columns. Before commission the favourite returned **+0.50%**. After commission, **−3.90%**.

So the market's pricing of favourites is very nearly fair — half a percentage point from exact, over 33,508 races. What turns a nearly-fair bet into a losing one is the 6.5% deducted from winnings, worth roughly 4.4 points of return here.

That ordering is the finding. The residual mispricing in the favourite, in whichever direction it runs, is **smaller than the cost of transacting**. A strategy would have to beat the market by more than the commission before any of it reached the bettor, and the measured gap to beat is half a percentage point.

The result holds across the window rather than resting on one stretch of it: the morning favourite's win return is stable across all six half-year periods in the sample.

## What follows

Nothing about this is a claim that favourites are bad bets and outsiders are good ones. Backing both the first and second favourite returned −4.79%, which is worse, not better. The point is narrower and duller: **within the range this measurement covers, the exchange price is close enough to correct that the fee decides the outcome.**

We publish this because it is the strongest form of evidence we have about our own limits. mazetick does not sell selections and does not promise a return. When a page here says a horse has placed in 27% of its runs on soft ground, that number is a count, and the reason to trust the count is that we also publish the measurements that went against us.
