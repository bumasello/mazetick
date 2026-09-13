---
title: "Crossing the spread costs 3.5%, and our first measurement was wrong"
dek: "We measured the cost of trading a race market, published the figure internally, and abandoned a strategy partly because of it. Then we found the bug: one line of our filter read the year out of a URL instead of the course, so a third of the quotes were not British or Irish racing at all."
description: "212,373 order-book quotes over 26 days: crossing the spread costs 3.53%. Our first figure was inflated by a filter that never filtered."
sample: "212,373 quotes · 1,089 races · 26 consecutive days · UK & Ireland"
window: "20 August – 13 September 2026"
windowShort: "26 days, Aug–Sep 2026"
method: "Best available prices on both sides of the exchange book, sampled every 15 minutes, expressed as a percentage of the mid price and in exchange ticks."
measured: 2026-09-13
published: 2026-09-13
verdict: negative
order: 5
limits:
  - "This is one exchange, and a smaller one. Its books are wider than the largest exchange's, so this remains an upper bound on cost rather than a measurement of the cheapest venue available."
  - "Quoted spread is not realised cost. An order that waits rather than crossing can do better, at the price of not always being filled — and an unfilled leg on a two-legged trade is its own loss."
  - "There is no profit figure here, and that is deliberate. The net-return scenarios we previously computed were derived from this same curve and inherited the same contamination. They have been withdrawn rather than corrected, and will not be quoted again until they are recomputed."
  - "The signal these costs are compared against was measured on a window already used for other tests. Nothing in this correction changes that, and nothing here should be read as reviving the strategy."
  - "26 consecutive days of one late-summer period, on one exchange. The daily medians were stable across all of them, which is evidence against a day effect, not proof of a year-round figure."
---

For about three weeks we believed that crossing the spread in a race market cost **4.35%** of the price, against a signal worth 5.39% — that trading away 81% of your edge before the position was even open. We had written down in advance that we would abandon the idea if execution cost exceeded 80% of the gross. It did, and we did.

The figure was wrong. Not by a little, and not because of the sample size we had been worrying about.

## The bug

Our collector sampled every race market on the exchange and then filtered to British and Irish racing. The filter read the venue out of the market's URL path, which looks like this:

```
/sport/horse-racing/<course>/<year>/<month>/<day>/<time>
```

It took element 4 of the path, split on the slash. But a string with a leading slash puts an empty string at element 0, which makes element 3 the course and element **4 the year**. The filter was checking `"2026"` against a list of foreign course suffixes, never matching, and returning true for everything.

**It never filtered anything.** On the day we had measured, **6,104 of 16,902 quotes — 36% — were Australian, American and French racing**: different books, wider spreads, and trading in a different part of the clock. The number we acted on was an average of two unrelated things.

The fix is one line. There is now a regression test for it, and the test was confirmed failing against the old implementation before the fix went in — an assertion that has never failed is not an assertion.

## The symptom was in the draft, and we wrote it up as a finding

This is the part worth dwelling on.

The contaminated data said the spread was **8.7% in the morning and 10.8% in the afternoon** — that the book got *wider* as the race approached. Order books do not do that. Liquidity concentrates towards the off; spreads tighten. It is one of the few things about market microstructure that is not in dispute.

An earlier draft of this very article contained the sentence: *"Note that the book does not tighten through the day in the way you might expect."* The anomaly was observed, written down, and presented as an interesting feature of racing markets. It was an artefact of mixing in meetings from three other continents, each trading on its own clock, and it was sitting in plain sight in our own table.

**Finding something surprising in your data is not the same as discovering something.** The first question has to be whether the instrument is broken, and here the instrument was broken in a way the data itself was announcing.

## What the clean measurement says

26 consecutive days, 20 August to 13 September 2026: **212,373 quotes across 1,089 UK and Irish races**, the book sampled every fifteen minutes.

<div class="table-scroll">
<table class="dense">
  <thead>
    <tr>
      <th scope="col">Odds band</th>
      <th scope="col" class="num">Morning width</th>
      <th scope="col" class="num">Ticks</th>
      <th scope="col" class="num">Afternoon</th>
      <th scope="col" class="num">Near the off</th>
    </tr>
  </thead>
  <tbody>
    <tr><td data-label="Band">4 – 8</td><td data-label="Morning width" class="num">7.1%</td><td data-label="Ticks" class="num">3.0</td><td data-label="Afternoon" class="num">5.6%</td><td data-label="Near off" class="num">3.8%</td></tr>
    <tr><td data-label="Band">8 – 13</td><td data-label="Morning width" class="num">11.7%</td><td data-label="Ticks" class="num">3.2</td><td data-label="Afternoon" class="num">9.0%</td><td data-label="Near off" class="num">6.4%</td></tr>
    <tr><td data-label="Band">13 – 20</td><td data-label="Morning width" class="num">14.9%</td><td data-label="Ticks" class="num">5.0</td><td data-label="Afternoon" class="num">11.7%</td><td data-label="Near off" class="num">8.3%</td></tr>
  </tbody>
</table>
</div>

Those figures are the **width** of the book — the whole gap between the two sides. Crossing it costs **half** of that against the mid price, because you cross one side, not both. The distinction matters: at odds 4 to 8 in the morning the book is 7.1% wide and entering a position costs 3.53%.

The book tightens through the day in every band, by roughly half between morning and the off. That is what an order book is supposed to do, and it is the first sign that the instrument is now reading something real.

## The decisive cell

The signal we were evaluating entered at a median price of about 5.85 — the first row, in the morning. That cell holds **14,187 quotes**.

<div class="table-scroll">
<table class="dense">
  <thead>
    <tr>
      <th scope="col">Spread width, odds 4–8, morning</th>
      <th scope="col" class="num">p10</th>
      <th scope="col" class="num">p25</th>
      <th scope="col" class="num">median</th>
      <th scope="col" class="num">p75</th>
      <th scope="col" class="num">p90</th>
    </tr>
  </thead>
  <tbody>
    <tr><td data-label="Measure">Width, % of price</td><td data-label="p10" class="num">3.4</td><td data-label="p25" class="num">5.2</td><td data-label="median" class="num"><strong>7.1</strong></td><td data-label="p75" class="num">10.1</td><td data-label="p90" class="num">14.1</td></tr>
    <tr><td data-label="Measure">In ticks</td><td data-label="p10" class="num">—</td><td data-label="p25" class="num">2.0</td><td data-label="median" class="num"><strong>3.0</strong></td><td data-label="p75" class="num">4.0</td><td data-label="p90" class="num">6.0</td></tr>
  </tbody>
</table>
</div>

Half of that median width is what entering costs against the mid price: **3.53%**, against a gross signal of 5.39%. **65% of the edge, consumed on entry** — and that is one side only, before any cost of getting out.

Twenty-two per cent of quotes show a two-tick book, 72% fit within four ticks, and 91% within six. Liquidity was never the constraint — the amount available at the best price had a median of about £45, with £12 at the tenth percentile, which is ample for any stake under discussion.

The daily median for this cell sat between **6.0% and 8.4% on every one of the 25 days with a usable sample**, with no outlier. We had suspected that our single measured day — a Thursday of a major festival — was unrepresentatively liquid, and had held this article back on those grounds. It was not: at 7.6% it is the **widest** day in the set, not the tightest. The bias we feared ran the other way, and the thing that was actually wrong was not the sample at all.

## What this changes, and what it does not

**It changes one thing: a discard criterion no longer fires.** At 65%, the threshold we had written down — abandon if cost exceeds 80% of gross — is not met. The specific reason we recorded for stopping was based on a number that was wrong.

**It does not revive the strategy, and should not be read as an argument to.** What removed a reason for closing is not the same as a reason for opening. Three things are unchanged and each is sufficient on its own:

- The directional signal these costs are weighed against was measured on a window already spent on other tests. A result from a re-used window is a hypothesis, not a finding, and this correction touches the cost side only.
- This exchange is smaller than the largest one and its books are wider, so the figure remains an upper bound on cost rather than an estimate of the cheapest available execution.
- **There is no net figure.** The profit-and-loss scenarios we had were computed from this same curve, inherited the same contamination, and have been withdrawn. Publishing a cost that has been corrected alongside a profit that has not would be worse than publishing nothing.

What remains true, in the weaker and more accurate form: crossing the spread once consumes about two-thirds of the gross signal, and whether anything survives depends on an execution assumption whose plausible range is wider than the signal itself. A strategy that is profitable under one defensible assumption and unprofitable under another is not a strategy with an uncertainty attached to it. It is an open question wearing a decision's clothes.

## Why publish this

Because the correction is more useful than the measurement.

The original figure was not a rounding error or a matter of interpretation. It was an off-by-one in a URL path, it inflated a cost by about a fifth, and it contributed to shutting down a line of work. We found it by re-running the measurement on more data and asking why a stable quantity had moved — not by anyone reviewing the line.

Our reason for holding this article back was that one day is not a sample. That instinct was right and the diagnosis was wrong, which is its own lesson: **the flaw you can name is not automatically the flaw you have.** Had we published on the strength of the day-count alone, the number would still have been wrong, only with more days behind it.

The figures on this site are published with their sample, their window and their method so that they can be checked. This one was checked, it failed, and the failure is on the page.
