// Throwaway: dominance A/B across candidate balance levers, paired universes.
// Same meta-seed per scenario → identical league seeds/teams/calendars, so
// scenario deltas are physics-only (paired comparison, minimal sampling noise).
// Scenarios: canon | powerPerStar 0.014 | powerPerStar 0.011 | genesis star
// clamp ≤18 | 0.014+clamp. Run: npx tsx scripts/dominance-ab.mjs [seasons]
import { createLeague } from '../src/league/league.ts';
import { settleLeague } from '../src/league/settle.ts';
import { getSeasonStandings } from '../src/types/season.ts';
import { CURRENT_TRACKS } from '../src/generators/tracks.ts';
import { TEAMS } from '../src/data/teams.ts';
import { mulberry32, shuffle } from '../src/engine/rng.ts';
import { CANON_VARIABLES, cloneVariables } from '../src/simlab/types.ts';

const SEASONS = Number(process.argv[2] ?? 150);
const TEAM_COUNT = 11;
const RACE_COUNT = 24;

function withPower(perStar) {
  const v = cloneVariables(CANON_VARIABLES);
  // Keep the 3★ midpoint at 0.984 so field pace doesn't shift
  v.carStats.powerPerStar = perStar;
  v.carStats.powerBase = 0.984 - 3 * perStar;
  return v;
}

// Genesis star budget: clamp team hardware (power+grip+rel+tireMgmt+pitCrew)
// to ≤ maxStars by decrementing lowest-impact stats first (grip → reliability
// → pitCrew → tireMgmt → power last), floor 1 each. Mirrors the doc §5 rule.
function clampRoster(roster, maxStars) {
  const order = ['grip', 'reliability', 'pitCrew', 'tireManagement', 'power'];
  const byTeam = new Map();
  for (const d of roster) {
    const key = d.kingdomId;
    if (!byTeam.has(key)) {
      const stats = { power: d.carStats.power, grip: d.carStats.grip, reliability: d.carStats.reliability,
        tireManagement: d.teamStats.tireManagement, pitCrew: d.teamStats.pitCrew };
      let total = Object.values(stats).reduce((a, b) => a + b, 0);
      let i = 0;
      while (total > maxStars) {
        const stat = order[i % order.length];
        if (stats[stat] > 1) { stats[stat]--; total--; }
        i++;
        if (i > 50) break;
      }
      byTeam.set(key, stats);
    }
  }
  return roster.map(d => {
    const s = byTeam.get(d.kingdomId);
    return { ...d,
      carStats: { power: s.power, grip: s.grip, reliability: s.reliability },
      teamStats: { tireManagement: s.tireManagement, pitCrew: s.pitCrew } };
  });
}

// #82 mistakes layer at the §3 first-lab values (built v0.3.30, dormant in
// canon). Optionally stacked on power compression — the A+B acceptance combo.
function withMistakes(base = CANON_VARIABLES) {
  const v = cloneVariables(base);
  v.performance.mistakeBaseChance = 1.5e-4;
  v.performance.mistakeConsistencyWeight = 1.5;
  v.performance.mistakeAggressionWeight = 0.5;
  v.performance.mistakeSpeedPenalty = 0.85;
  v.performance.mistakeDurationTicks = 150;
  v.performance.mistakeCooldownTicks = 300;
  return v;
}

const ALL_SCENARIOS = [
  { key: 'canon', name: 'canon (0.018)', simVars: CANON_VARIABLES, clamp: null },
  { key: 'p014', name: 'power 0.014', simVars: withPower(0.014), clamp: null },
  { key: 'p011', name: 'power 0.011', simVars: withPower(0.011), clamp: null },
  { key: 'clamp', name: 'clamp ≤18', simVars: CANON_VARIABLES, clamp: 18 },
  { key: 'p014clamp', name: '0.014 + clamp', simVars: withPower(0.014), clamp: 18 },
  { key: 'mistakes', name: 'mistakes (lab)', simVars: withMistakes(), clamp: null },
  { key: 'mp014', name: 'mistakes + 0.014', simVars: withMistakes(withPower(0.014)), clamp: null },
];
// Optional scenario filter: comma-separated keys as argv[3]
const only = process.argv[3]?.split(',');
const SCENARIOS = only ? ALL_SCENARIOS.filter(s => only.includes(s.key)) : ALL_SCENARIOS;

console.log(`DOMINANCE A/B — ${SEASONS} paired universes × ${RACE_COUNT} races, ${TEAM_COUNT} teams`);
console.log(['scenario', 'median win%', 'p95', '>50%', '>=2/3', 'distinct W', 'P1-P2 gap', 'DNF%', 'champ 4★+', 'champ 5★'].join('\t'));
for (const sc of SCENARIOS) {
  const metaRng = mulberry32(20260612); // same universes every scenario
  const winShares = [], gaps = [], distinct = [];
  let dnfTotal = 0, drTotal = 0, champ5p = 0, champ4p = 0;
  const t0 = Date.now();
  for (let s = 0; s < SEASONS; s++) {
    const leagueSeed = Math.floor(metaRng() * 2 ** 31);
    const teamIds = shuffle(TEAMS, metaRng).slice(0, TEAM_COUNT).map(t => t.id);
    const trackIds = shuffle(CURRENT_TRACKS, metaRng).slice(0, RACE_COUNT).map(t => t.id);
    let league = createLeague(leagueSeed, {
      name: `ab-${s}`, godId: 'probe', teamIds, trackIds, raceIntervalMs: 1, createdAt: 0,
    });
    if (sc.clamp) league = { ...league, roster: clampRoster(league.roster, sc.clamp) };
    const { league: settled } = settleLeague(league, { now: Date.now(), simVars: sc.simVars });
    const standings = getSeasonStandings(settled.season);
    const top = standings[0];
    winShares.push(top.wins / RACE_COUNT);
    gaps.push(top.points - standings[1].points);
    distinct.push(new Set(settled.digests.map(d => d.finishOrder[0])).size);
    const w = settled.roster.find(d => d.id === top.driverId);
    if ((w.carStats?.power ?? 3) === 5) champ5p++;
    if ((w.carStats?.power ?? 3) >= 4) champ4p++;
    for (const st of standings) { dnfTotal += st.dnfs; drTotal += st.raceResults.length; }
  }
  const sorted = [...winShares].sort((a, b) => a - b);
  const pct = p => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
  // Print each row as soon as its scenario finishes — an interrupted run
  // keeps everything already measured.
  console.log([sc.name,
    (pct(0.5) * 100).toFixed(0) + '%', (pct(0.95) * 100).toFixed(0) + '%',
    (winShares.filter(x => x >= 0.5).length / SEASONS * 100).toFixed(0) + '%',
    (winShares.filter(x => x >= 2 / 3).length / SEASONS * 100).toFixed(1) + '%',
    mean(distinct).toFixed(1), mean(gaps).toFixed(0),
    (dnfTotal / drTotal * 100).toFixed(1) + '%',
    (champ4p / SEASONS * 100).toFixed(0) + '%', (champ5p / SEASONS * 100).toFixed(0) + '%',
  ].join('\t'));
  console.error(`${sc.name}: done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
