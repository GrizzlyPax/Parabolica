---
name: season-report
description: Read a pasted PARABOLICA SEASON REPORT and turn it into a short balance/story analysis, optionally logged as an issue. Use whenever Pax pastes a season report or asks what a season says.
---

# Season report read

Reports come from `src/league/seasonReport.ts` (header, final standings, driver attributes, cars & teams, races, stat-vs-outcome Pearson r).

## Read in this order

1. **Header sanity:** engine version, races run vs league setting (league names can lie — flag mismatches; cf. wrong-race-count bugs), seed, interventions.
2. **Dominance:** winner's points vs P2, wins share. Runaway = one driver well clear by mid-season. Compare to the current target band in `docs/SIM_MECHANICS.md`.
3. **Stat vs outcome:** which attributes predict points and DNFs. One season is **one sample** — say so; anything striking gets a `balance-read` before it's believed.
4. **DNFs:** global rate and outliers (team car tags like Cursed Chassis, Reliability ≤2).
5. **Tags:** did conditional tags get a chance to fire (weather variety, track types)? Fastest-lap or podium outliers explained by a tag?
6. **Fantasy** (if present): team totals, whether one draft pick decided it.
7. **Fun:** one or two story beats worth surfacing (comebacks, rivalries, a funny name winning).

## Output

```
**TL;DR:** one line.
- **Dominance:** …
- **What predicted points:** … (one season — needs a balance-read)
- **Flags:** … (bugs vs design questions, kept separate)
- **Story beats:** …
**Next:** A / B / C (pick marked)
```

Separate **bugs** (wrong race count, a tag never firing) from **design questions** (Speed matters more than Power — intended?). Only bugs become issues without asking Pax. Log the raw report only if Pax asks — as a `season-report` issue, tables kept, analysis on top.
