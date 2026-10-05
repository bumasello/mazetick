---
title: "One more place at a fifth beat three at a quarter, in every price band"
dek: "We called the bookmaker's morning promotion a trade and left its value open. Measured over 6,602 handicaps, the place half of an each-way bet returned 0.80 per unit at three places and a quarter, and 0.96 at four places and a fifth. The gap closes only for the shortest favourites."
description: "6,602 handicaps, 2019 to 2026: the place half of an each-way bet returned 0.80 at 3 places and 1/4, and 0.96 at 4 places and 1/5."
sample: "6,602 handicaps of 13 to 20 runners (95,979 runners); 719 handicaps of 18 to 27 for the second swap"
window: "28 April 2019 – 22 July 2026"
windowShort: "Apr 2019 – Jul 2026"
method: "For every runner, the return on the place half of a one-unit each-way bet settled at the starting price, under each set of terms, in the same races. Each difference carries a 95% interval from resampling whole races."
measured: 2026-10-05
derivation: "scripts/ew_terms_value.py@760b708"
published: 2026-10-05
verdict: positive
order: 2.5
limits:
  - "It is the place half only. The win half of an each-way bet is the same under both sets of terms and is not in these figures, so nothing here says whether an each-way bet wins or loses money."
  - "Returns are at the starting price. A bet struck the day before is settled at the price taken then, which we do not have, and this measurement says nothing about it."
  - "The terms are applied to the field that ran. A bookmaker sets terms on the declared field and adjusts them as horses come out, and none of that is modelled."
  - "The archive marks a race as a handicap only when it carries a rating band. Handicaps with no upper rating limit are missing, and those are the largest fields: the Grand National, the big Royal Ascot handicap, most Cheltenham Grade 3s, and most Irish handicaps."
  - "The archive is not a census. Whole months are thin or absent, and we do not know that the gaps are random."
  - "Where a figure is above 1.00 it is a point estimate with no interval of its own. Only the difference between the two sets of terms carries one."
  - "Dead heats for a place are paid in full here. Applying the dead-heat rule moves the main difference in the fourth decimal."
---

An earlier article on this site, [about the classic each-way terms table](/research/each-way-terms-table), described what a bookmaker's morning promotion is. A handicap opens at three places and a quarter of the odds. At about nine o'clock the day before the race it becomes four places and a fifth. A fourth place appears, and the other three pay less.

That article called it a trade and stopped there. It said that whether the trade is good "depends on the race and on the bet, and this article does not tell you which". A reader asked the obvious next question: what is each set of terms actually worth, for a given field?

This is the measurement. **On the results we hold, the extra place came out ahead in every price band and every field size where it could be tested.**

## What was measured

An each-way bet is two bets of equal stake. The win half is the same whatever the place terms are. The place half pays a fraction of the odds if the horse finishes in the places, and nothing if it does not.

So for every runner, under each set of terms, we worked out what one unit on the place half returned at the starting price: one plus the fraction of the odds if the horse finished inside the places, zero otherwise. Averaged over a group of runners, that is what came back for every unit staked. A figure of 0.85 means 85 came back out of every 100.

The two sets of terms are compared on the **same races and the same runners**. The only thing that changes is the rule.

The races are handicaps with 13 to 20 runners, which is where our hourly record shows the swap from three places at a quarter to four at a fifth. There are 6,602 of them, with 95,979 runners.

## Three at a quarter against four at a fifth

<div class="table-scroll">
<table class="dense">
  <thead>
    <tr>
      <th scope="col">Starting price</th>
      <th scope="col" class="num">Runners</th>
      <th scope="col" class="num">3 at 1/4</th>
      <th scope="col" class="num">4 at 1/5</th>
      <th scope="col" class="num">Difference</th>
      <th scope="col" class="num">95% interval</th>
    </tr>
  </thead>
  <tbody>
    <tr><td data-label="Starting price"><strong>All runners</strong></td><td data-label="Runners" class="num">95,979</td><td data-label="3 at 1/4" class="num">0.800</td><td data-label="4 at 1/5" class="num">0.956</td><td data-label="Difference" class="num"><strong>+0.157</strong></td><td data-label="95% interval" class="num">+0.151 to +0.162</td></tr>
    <tr><td data-label="Starting price">Up to 2/1</td><td data-label="Runners" class="num">867</td><td data-label="3 at 1/4" class="num">0.909</td><td data-label="4 at 1/5" class="num">0.951</td><td data-label="Difference" class="num">+0.042</td><td data-label="95% interval" class="num">+0.020 to +0.065</td></tr>
    <tr><td data-label="Starting price">2/1 to 4/1</td><td data-label="Runners" class="num">5,466</td><td data-label="3 at 1/4" class="num">0.887</td><td data-label="4 at 1/5" class="num">0.957</td><td data-label="Difference" class="num">+0.071</td><td data-label="95% interval" class="num">+0.058 to +0.083</td></tr>
    <tr><td data-label="Starting price">4/1 to 7/1</td><td data-label="Runners" class="num">13,548</td><td data-label="3 at 1/4" class="num">0.835</td><td data-label="4 at 1/5" class="num">0.940</td><td data-label="Difference" class="num">+0.105</td><td data-label="95% interval" class="num">+0.095 to +0.115</td></tr>
    <tr><td data-label="Starting price">7/1 to 12/1</td><td data-label="Runners" class="num">19,821</td><td data-label="3 at 1/4" class="num">0.835</td><td data-label="4 at 1/5" class="num">0.966</td><td data-label="Difference" class="num">+0.130</td><td data-label="95% interval" class="num">+0.120 to +0.140</td></tr>
    <tr><td data-label="Starting price">12/1 to 20/1</td><td data-label="Runners" class="num">18,989</td><td data-label="3 at 1/4" class="num">0.800</td><td data-label="4 at 1/5" class="num">0.969</td><td data-label="Difference" class="num">+0.169</td><td data-label="95% interval" class="num">+0.155 to +0.183</td></tr>
    <tr><td data-label="Starting price">20/1 to 40/1</td><td data-label="Runners" class="num">20,963</td><td data-label="3 at 1/4" class="num">0.781</td><td data-label="4 at 1/5" class="num">0.967</td><td data-label="Difference" class="num">+0.186</td><td data-label="95% interval" class="num">+0.167 to +0.204</td></tr>
    <tr><td data-label="Starting price">40/1 and longer</td><td data-label="Runners" class="num">16,325</td><td data-label="3 at 1/4" class="num">0.716</td><td data-label="4 at 1/5" class="num">0.930</td><td data-label="Difference" class="num">+0.214</td><td data-label="95% interval" class="num">+0.180 to +0.252</td></tr>
  </tbody>
</table>
</div>

Seven price bands, and the interval sits above zero in all seven. The difference grows with the price: four hundredths of a unit for the shortest prices, twenty-one for the longest.

The reason is in the arithmetic of a single horse. If it finishes in the first three, the cut from a quarter to a fifth costs it a twentieth of its odds. If it finishes exactly fourth, the new terms pay where the old ones paid nothing. For an outsider, fourth is common next to first three, and the fourth place is worth far more than the cut. For a short favourite, fourth is rare.

## Where the gap closes

That last sentence predicts where the advantage should vanish, so we cut the shortest prices finer.

<div class="table-scroll">
<table class="dense">
  <thead>
    <tr>
      <th scope="col">Starting price</th>
      <th scope="col" class="num">Runners</th>
      <th scope="col" class="num">Finished 4th</th>
      <th scope="col" class="num">Difference</th>
      <th scope="col" class="num">95% interval</th>
      <th scope="col">Reading</th>
    </tr>
  </thead>
  <tbody>
    <tr><td data-label="Starting price">Odds-on</td><td data-label="Runners" class="num">98</td><td data-label="Finished 4th" class="num">4</td><td data-label="Difference" class="num">+0.022</td><td data-label="95% interval" class="num">−0.016 to +0.072</td><td data-label="Reading">Too few to say</td></tr>
    <tr><td data-label="Starting price">Evens to 6/4</td><td data-label="Runners" class="num">276</td><td data-label="Finished 4th" class="num">10</td><td data-label="Difference" class="num">+0.001</td><td data-label="95% interval" class="num">−0.026 to +0.030</td><td data-label="Reading">Level</td></tr>
    <tr><td data-label="Starting price">6/4 to 2/1</td><td data-label="Runners" class="num">493</td><td data-label="Finished 4th" class="num">45</td><td data-label="Difference" class="num">+0.069</td><td data-label="95% interval" class="num">+0.033 to +0.105</td><td data-label="Reading">Four at a fifth ahead</td></tr>
  </tbody>
</table>
</div>

Between evens and 6/4 the two sets of terms returned the same. Below evens there are 98 runners and four of them finished fourth, which decides nothing. **The data supports "the advantage shrinks to nothing for a short favourite". It does not support "three at a quarter is better for a short favourite".**

A warning about cells like these, because it nearly caught us. Where no horse in a cell finished in the new place, resampling races cannot invent one. The difference is then negative in every resample and the interval comes out narrow and below zero, by construction. Twelve runners in the second comparison below looked like proof that the old terms were better. The script now refuses a reading for any cell with fewer than ten finishers in the new place.

## By field size

<div class="table-scroll">
<table class="dense">
  <thead>
    <tr>
      <th scope="col">Runners in the race</th>
      <th scope="col" class="num">Races</th>
      <th scope="col" class="num">3 at 1/4</th>
      <th scope="col" class="num">4 at 1/5</th>
      <th scope="col" class="num">Difference</th>
      <th scope="col" class="num">95% interval</th>
    </tr>
  </thead>
  <tbody>
    <tr><td data-label="Runners in the race">13</td><td data-label="Races" class="num">2,132</td><td data-label="3 at 1/4" class="num">0.842</td><td data-label="4 at 1/5" class="num">1.023</td><td data-label="Difference" class="num">+0.181</td><td data-label="95% interval" class="num">+0.170 to +0.191</td></tr>
    <tr><td data-label="Runners in the race">14</td><td data-label="Races" class="num">2,092</td><td data-label="3 at 1/4" class="num">0.814</td><td data-label="4 at 1/5" class="num">0.979</td><td data-label="Difference" class="num">+0.164</td><td data-label="95% interval" class="num">+0.154 to +0.174</td></tr>
    <tr><td data-label="Runners in the race">15</td><td data-label="Races" class="num">861</td><td data-label="3 at 1/4" class="num">0.801</td><td data-label="4 at 1/5" class="num">0.943</td><td data-label="Difference" class="num">+0.141</td><td data-label="95% interval" class="num">+0.128 to +0.155</td></tr>
    <tr><td data-label="Runners in the race">16</td><td data-label="Races" class="num">650</td><td data-label="3 at 1/4" class="num">0.768</td><td data-label="4 at 1/5" class="num">0.913</td><td data-label="Difference" class="num">+0.145</td><td data-label="95% interval" class="num">+0.130 to +0.161</td></tr>
    <tr><td data-label="Runners in the race">17</td><td data-label="Races" class="num">325</td><td data-label="3 at 1/4" class="num">0.747</td><td data-label="4 at 1/5" class="num">0.877</td><td data-label="Difference" class="num">+0.130</td><td data-label="95% interval" class="num">+0.110 to +0.151</td></tr>
    <tr><td data-label="Runners in the race">18</td><td data-label="Races" class="num">283</td><td data-label="3 at 1/4" class="num">0.715</td><td data-label="4 at 1/5" class="num">0.833</td><td data-label="Difference" class="num">+0.118</td><td data-label="95% interval" class="num">+0.100 to +0.136</td></tr>
    <tr><td data-label="Runners in the race">19</td><td data-label="Races" class="num">139</td><td data-label="3 at 1/4" class="num">0.692</td><td data-label="4 at 1/5" class="num">0.798</td><td data-label="Difference" class="num">+0.106</td><td data-label="95% interval" class="num">+0.085 to +0.126</td></tr>
    <tr><td data-label="Runners in the race">20</td><td data-label="Races" class="num">120</td><td data-label="3 at 1/4" class="num">0.685</td><td data-label="4 at 1/5" class="num">0.796</td><td data-label="Difference" class="num">+0.111</td><td data-label="95% interval" class="num">+0.088 to +0.137</td></tr>
  </tbody>
</table>
</div>

Both columns fall as the field grows, which is what a fixed number of places in a bigger field must do. The difference falls too, from 0.181 at thirteen runners to about 0.11 at nineteen and twenty, and stays above zero throughout.

## The other swap: four at a quarter against five at a fifth

In the largest fields our record shows a second swap, from four places at a quarter to five at a fifth, in handicaps of 18 to 27 runners. There are 719 such races in the archive, with 14,174 runners.

Over all of them the place half returned 0.936 at four places and a quarter, and the five-place terms returned **0.083 more** (95% interval +0.071 to +0.094). The direction is the same as in the first comparison and the sample is nine times smaller. By price, the interval is above zero from 4/1 upwards. For 2/1 to 4/1 it runs from −0.002 to +0.093 and does not separate, and under 2/1 there are 46 runners, three of them in the new place.

## What we got wrong

The earlier article said the extra place "is not a gift". On the terms themselves that is exact: in the promotions it counted, the fraction never improved. But the sentence was read, by us as much as by anybody, as saying the promotion might not be worth having. We repeated that reading in public, on a forum, two days before making this measurement.

It was a conclusion drawn from the arithmetic of the terms without measuring what the extra place returns. Measured, the promotion is better for whoever holds the bet in every band where the data can tell, and level at the shortest prices.

The same earlier article also said that the terms shown before the morning change are not the terms a bettor ends up with. That part stands, and this measurement is what makes it matter.

## What this is not

It is not advice, and it is not a claim that anything here makes money. Every figure is the place half of the bet, at the starting price, over races that have already been run. The win half is not in it. A figure above 1.00 in one cell is a point estimate, with no interval of its own, for half of a bet.

It is not a statement about every handicap. The archive only marks a handicap when the race carries a rating band, and that leaves out the largest uncapped fields, which are exactly the races where extra places are most advertised.

And it is not about one bookmaker's prices. The terms compared here are the two sides of a swap we recorded on one bookmaker's pages, applied to results and starting prices from the whole of British and Irish racing.
