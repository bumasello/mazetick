---
title: "The classic each-way terms table is not wrong. It has no date."
dek: "It describes the opening of the market, and it is right almost everywhere the terms never move. Where it looks wrong is where the bookmaker promotes during the day — one more place, a worse fraction. In 54 promotions across nine days, the fraction never once improved."
description: "324 races, 81 term changes: the classic each-way table describes the market's opening. What nobody publishes is what happens after."
sample: "324 races · 81 term changes · UK & Ireland"
window: "6–14 September 2026, nine consecutive days"
windowShort: "9 days, Sep 2026"
method: "Each-way terms read hourly from one bookmaker's own public race pages, 06:00–21:00 UTC, with every change time-stamped. Opening and closing terms compared separately."
measured: 2026-09-14
derivation: "scripts/ew_terms_audit.py@318b8bc"
published: 2026-09-14
verdict: negative
order: 2
limits:
  - "Nine days, and one bookmaker. Terms are set per firm, and the ladder below is this firm's, read from its own behaviour — not an industry standard. At thirty days we will re-run it; the derivation is versioned so that re-running is a command, not a project."
  - "\"Opening\" means the first reading we hold, from 06:00 UTC. If a firm sets terms earlier than that and moves them before we look, we cannot see it, and this article would mistake that for a stable opening."
  - "We read terms once an hour. A change made and reverted inside the same hour is invisible to us, and we would report the race as unchanged."
  - "It measures what was advertised, not what anybody was paid. We do not track settled bets, and nothing here says whether an each-way bet at these terms wins or loses money."
  - "The ladder boundaries are read from 324 races. The ones supported by few races will move as more are collected, and the article will change with them."
---

There is a small table that everyone who bets each-way knows. Handicap with sixteen or more runners: four places at a quarter. Eight to fifteen: three places at a fifth. Non-handicap, five to seven: two places at a quarter. It is printed in strategy guides, wired into calculators, and hard-coded in spreadsheets — including, for a while, our own.

We measured it against what a bookmaker actually advertised, hour by hour, for nine days. Our first two attempts said the table was badly wrong. Both were mistakes of our own making, and the corrected answer is more interesting than either:

**The table is not wrong. It has no date.**

## Where the table is exactly right

Take the races where the terms never moved at all. Over nine days, two whole categories sat completely still:

<div class="table-scroll">
<table class="dense">
  <thead>
    <tr>
      <th scope="col">Category</th>
      <th scope="col" class="num">Races</th>
      <th scope="col" class="num">Changed</th>
      <th scope="col">What happened</th>
    </tr>
  </thead>
  <tbody>
    <tr><td data-label="Category">Handicap, 10–11 runners</td><td data-label="Races" class="num">45</td><td data-label="Changed" class="num">0</td><td data-label="What happened">3 at 1/5, all day, every day</td></tr>
    <tr><td data-label="Category">Non-handicap, 10+</td><td data-label="Races" class="num">68</td><td data-label="Changed" class="num">0</td><td data-label="What happened">3 at 1/5, all day, every day</td></tr>
    <tr><td data-label="Category">Handicap, 12–15</td><td data-label="Races" class="num">88</td><td data-label="Changed" class="num">31</td><td data-label="What happened">3 at 1/4 exists at the open, gone by the close</td></tr>
    <tr><td data-label="Category">Handicap, 16+</td><td data-label="Races" class="num">40</td><td data-label="Changed" class="num">24</td><td data-label="What happened">4 at 1/4 and 3 at 1/4 at the open, no 1/4 at all by the close</td></tr>
  </tbody>
</table>
</div>

**113 races, zero changes.** The table describes those perfectly. Where it appears to fail is precisely the two categories that move — and they move in one direction, on a schedule.

The same thing measured as a divergence rate makes the point sharply. Comparing the advertised fraction with the classic table:

- **At the opening:** the table overstates the fraction in **28.7%** of races.
- **At the close:** **39.5%**.

Those are the same races and the same table. **The eleven-point difference between the two lines is the promotion.** Publish only the closing figure — which is what our own first attempt did — and you are calling the bookmaker's offer of the day an error in a reference table.

## What a promotion actually is

Across nine days there were **81 changes to each-way terms**. Sorting them:

<div class="table-scroll">
<table class="dense">
  <thead>
    <tr><th scope="col">What changed</th><th scope="col" class="num">Count</th></tr>
  </thead>
  <tbody>
    <tr><td data-label="What changed">Gained a place, <strong>and the fraction was cut</strong></td><td data-label="Count" class="num">48</td></tr>
    <tr><td data-label="What changed">Gained a place, fraction already at the worse level</td><td data-label="Count" class="num">6</td></tr>
    <tr><td data-label="What changed">Gained a place <em>and</em> the fraction improved</td><td data-label="Count" class="num">0</td></tr>
    <tr><td data-label="What changed">Lost a place</td><td data-label="Count" class="num">26</td></tr>
    <tr><td data-label="What changed">Fraction changed on its own</td><td data-label="Count" class="num">1</td></tr>
  </tbody>
</table>
</div>

**In 54 promotions, the fraction did not improve once.** Either it was cut in the same move, or it was already at the worse level with nothing left to cut.

So the extra place is not a gift. It is a trade: one more place to finish in, each of them paying less. Whether that trade is good depends on the race and on the bet, and this article does not tell you which — but it is a trade, and it is not described anywhere the bettor can see.

A typical one: a handicap that opened at **3 places at 1/4** and, at 09:00, became **4 at 1/5**. A fourth place appeared. The other three got 20% smaller.

## Places also get taken away

Twenty-six of the 81 changes removed a place. Twenty-two of those came with the field shrinking — a non-runner, which is ordinary and expected; fewer horses, fewer places.

**Four did not.** In these, the field was unchanged and the offer was simply withdrawn:

<div class="table-scroll">
<table class="dense">
  <thead>
    <tr>
      <th scope="col">Course</th><th scope="col">When</th>
      <th scope="col">Was</th><th scope="col">Became</th><th scope="col" class="num">Field</th>
    </tr>
  </thead>
  <tbody>
    <tr><td data-label="Course">Leicester</td><td data-label="When" class="n">8 Sep, 11:00</td><td data-label="Was" class="n">3 at 1/5</td><td data-label="Became" class="n">2 at 1/4</td><td data-label="Field" class="num">9, unchanged</td></tr>
    <tr><td data-label="Course">Galway</td><td data-label="When" class="n">8 Sep, 11:00</td><td data-label="Was" class="n">5 at 1/5</td><td data-label="Became" class="n">4 at 1/5</td><td data-label="Field" class="num">16, unchanged</td></tr>
    <tr><td data-label="Course">Goodwood</td><td data-label="When" class="n">8 Sep, 14:00</td><td data-label="Was" class="n">4 at 1/5</td><td data-label="Became" class="n">3 at 1/5</td><td data-label="Field" class="num">12, unchanged</td></tr>
    <tr><td data-label="Course">Doncaster</td><td data-label="When" class="n">11 Sep, 09:00</td><td data-label="Was" class="n">5 at 1/5</td><td data-label="Became" class="n">4 at 1/5</td><td data-label="Field" class="num">17, unchanged</td></tr>
  </tbody>
</table>
</div>

This is the direction that costs the bettor, and it is the half that gets no coverage anywhere. Somebody who backed each-way that morning expecting the extra place did not have it by the afternoon. Four cases in nine days is not common. It is also not zero, and there is no way to find out except by writing down what the terms were, hour by hour.

## The terms move at nine o'clock

**52 of the 81 changes landed at exactly 09:00 UTC.** The remainder are scattered thinly between 07:00 and 20:00.

That single fact is worth more, practically, than the divergence rates above. The terms you see before nine are not the terms you will get, in the categories that move; the terms you see after nine mostly are. A table cannot tell you this, because a table has no clock.

## One real error, and it is not a promotion

Separately from all of the above, the classic table gets the small fields wrong in a way that never corrects itself during the day:

- In fields of **five to six**, it promises two places. The bookmaker pays **win only**.
- In fields of **eight to nine**, it promises a fifth. The bookmaker pays **a quarter** — in the bettor's favour, for once.

This is a boundary disagreement, not a timing one, and it is the only part of this measurement where "the table is wrong" is a fair description.

## The ladder the bookmaker actually uses

Read from the 324 races rather than from any book:

<div class="table-scroll">
<table class="dense">
  <thead>
    <tr><th scope="col">Field size</th><th scope="col">Handicap</th><th scope="col">Non-handicap</th></tr>
  </thead>
  <tbody>
    <tr><td data-label="Field size">Up to 6</td><td data-label="Handicap">win only</td><td data-label="Non-handicap">win only</td></tr>
    <tr><td data-label="Field size">7–9</td><td data-label="Handicap">2 at 1/4</td><td data-label="Non-handicap">2 at 1/4</td></tr>
    <tr><td data-label="Field size">10–13</td><td data-label="Handicap">3 at 1/5</td><td data-label="Non-handicap">3 at 1/5</td></tr>
    <tr><td data-label="Field size">14–19</td><td data-label="Handicap"><strong>4 at 1/5</strong></td><td data-label="Non-handicap">3 at 1/5</td></tr>
    <tr><td data-label="Field size">20+</td><td data-label="Handicap"><strong>5–6 at 1/5</strong></td><td data-label="Non-handicap">3 at 1/5</td></tr>
  </tbody>
</table>
</div>

**Handicaps and non-handicaps are treated identically up to thirteen runners.** The classic table splits them from eight — and that split is where most of its trouble comes from.

## What this is not

It is not an accusation. The bookmaker hides nothing: the terms for every race are on its own pages, all day, for anyone to read. Nothing here was obtained from anywhere else.

What is not published anywhere — by them or by anybody — is the **history**: what the terms were at ten and what they became at two. That absence is not concealment, it is simply nobody's job. It became ours because we were writing the numbers down every hour for a different reason, and discovered they moved.

Nine days is nine days, and the figures above will shift as the sample grows. The direction of the trade, though, is 54 out of 54, with nothing pulling the other way.

**What to take from it:** a terms table is a photograph of the opening. If you are betting each-way in a big handicap, the number that matters is not in any table — it is what the bookmaker is showing at the hour you actually place the bet.
