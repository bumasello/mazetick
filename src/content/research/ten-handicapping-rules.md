---
title: "Ten handicapping rules against 180,000 runners"
dek: "Every rule a form student applies — never won, out of form, long layoff, weak jockey, top weight, first-time headgear — was tested against what the market price already implied. All ten were already in the price, to within half a percentage point."
description: "179,990 runners: ten classic handicapping rules tested against the market's own implied loss rate. Each was already priced, to within 0.5pp."
sample: "179,990 runners · 662,000 historical results · ~55 test cells"
window: "Results from 2019 to July 2026; runners matched to settled markets"
windowShort: "2019 – Jul 2026"
method: "Point-in-time features — each rule uses only races run before the day in question. Flagged runners' actual loss rate compared with the loss rate implied by their price. Random 30% flag as control."
measured: 2026-09-07
derivation: "src/oneTimeScript/human_rules_probe.py@54ee96a"
published: 2026-09-13
verdict: negative
order: 4
limits:
  - "This tests rules applied one at a time, and stacked into a simple score. It does not test a skilled reader weighing many factors against each other, which is not a thing we can encode and therefore not a thing we have measured."
  - "It uses what is in the public form book. A rule drawing on information not in the form book — a stable whisper, a paddock look, a private clock — is outside what this can see."
  - "One rule, R4 'stepping up in class', returned almost no cases: race class is recorded in only about 60% of the historical results and rarely in two consecutive runs for the same horse. Nine of the ten were testable."
  - "The one cell that cleared zero did so by 0.01pp, is one of roughly 55 cells examined, and did not reproduce in any other odds band. We report it as noise, and would report it as noise whichever way it had fallen."
---

The proposition is reasonable, and it comes up whenever a model disappoints: forget the machine learning, encode what an experienced form reader actually does. Fade the horse that has never won in a dozen attempts. Fade the one returning from eight months off. Fade the top weight, the weak yard, the first-time blinkers.

These are not arbitrary. They are the working vocabulary of handicapping, and each one describes something real about a horse's chances. The question is not whether they contain information. It is whether they contain information **the market has not already used.**

## How the test was framed

That distinction decides everything, and it is where this kind of test usually goes wrong. Showing that flagged horses lose more often than unflagged ones proves nothing: the market can see the same form book, and a horse that has never won will already be priced as a horse that has never won.

So the question was put as a comparison against the price:

> Do the horses a rule flags lose **more often than their own price already implies?**

If yes, the rule knows something the market does not. If the two match, the rule is real and already paid for.

Ten rules were encoded, each from the published form book: never won in six or more starts; finished fifth or worse in each of the last three; more than 120 days since last run; stepping up in class; jockey strike rate under 8%; trainer strike rate under 8%; a veteran by age for the discipline; a debutant with no runs at all; carrying top weight in a field of eight or more; and first-time headgear.

Every feature is **point-in-time**: computed only from races run before the day being tested, with trainer and jockey records accumulated to the day before. A rule that uses a horse's full-career record to judge a race in the middle of that career is reading the answer. **179,990 runners** survived matching to a settled market, drawn from about 662,000 historical results. A random flag on 30% of runners was carried through as a control.

<div class="table-scroll">
<table class="dense">
  <thead>
    <tr>
      <th scope="col">Odds band</th>
      <th scope="col" class="num">Actual loss rate</th>
      <th scope="col" class="num">Implied by price</th>
      <th scope="col" class="num">Best rule found</th>
      <th scope="col" class="num">95% interval</th>
    </tr>
  </thead>
  <tbody>
    <tr><td data-label="Band">13 – 20</td><td data-label="Actual" class="num">93.7%</td><td data-label="Implied" class="num">93.7%</td><td data-label="Best rule" class="num">+0.83pp</td><td data-label="95% interval" class="num faint">+0.01 to +1.61</td></tr>
    <tr><td data-label="Band">6 – 13</td><td data-label="Actual" class="num">88.3%</td><td data-label="Implied" class="num">88.4%</td><td data-label="Best rule" class="num">+1.12pp</td><td data-label="95% interval" class="num faint">−0.59 to +2.81</td></tr>
    <tr><td data-label="Band">3 – 6</td><td data-label="Actual" class="num">77.2%</td><td data-label="Implied" class="num">77.2%</td><td data-label="Best rule" class="num">+0.81pp</td><td data-label="95% interval" class="num faint">−0.56 to +2.30</td></tr>
    <tr><td data-label="Band"><strong>All</strong></td><td data-label="Actual" class="num"><strong>89.0%</strong></td><td data-label="Implied" class="num"><strong>89.0%</strong></td><td data-label="Best rule" class="num">+0.14pp</td><td data-label="95% interval" class="num faint">−0.13 to +0.44</td></tr>
  </tbody>
</table>
</div>

The first two columns are the result. **Across roughly 55 test cells, the rate at which flagged horses actually lost matched the rate implied by their price to within about half a percentage point** — rule or no rule, and with the random control behaving the same way.

## The one cell that looked promising

One combination cleared zero: "never won in six or more starts", among runners priced between 13 and 20, with a lower interval bound of **+0.01pp**.

We are reporting it as noise, and it is worth being explicit about why, because this is the exact shape of finding that has misled this project four separate times.

It is one cell out of about 55. At that number of comparisons, a bound that clears zero by a hundredth of a percentage point is what chance produces. And it does not reproduce: the same rule in the other bands gives −0.05pp, +0.14pp and +0.07pp — scattered around nothing. Stacking rules into a score does not rescue it either; requiring four or more rules to fire gives **−0.56pp** in that same band, pointing the wrong way.

A finding that survives only in the cell where you happened to look is not a finding.

## What this means, and what it does not

It does not mean handicapping knowledge is worthless. It means something more specific and, once seen, fairly obvious: **the market is not an opponent that has failed to read the form book. It is several thousand people reading the same form book, applying these same rules, plus whatever is not public.** The price is the aggregate of that work. Arriving with the same ten rules is arriving with what is already there.

This closes a line of enquiry for us rather than opening one. Combined with an earlier result — that a model with 74 engineered features adds nothing to the price either — the conclusion arrives twice from opposite directions, and the second time with ten times the sample. Both the machine version and the human version of "read the public form and beat the price" come out at zero.

What would change it is not a better rule over the same form book. It would have to be information the form book does not contain.
