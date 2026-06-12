// Throwaway: headless SEASON dominance probe. The SimLab measures races with a
// fresh roster every time; a league locks one grid for a whole season, so the
// lab is blind to within-season win concentration. This runs N full leagues
// (createLeague → settleLeague, the real pipeline) and reports how dominant
// the best package is per universe.
// Run: npx tsx scripts/season-probe.mjs [seasons] [teams] [races]
import { createLeague } from '../src/league/league.ts';
import { settleLeague } from '../src/league/settle.ts';
import { getSeasonStandings } from '../src/types/season.ts';
import { CURRENT_TRACKS } from '../src/generators/tracks.ts';
import { TEAMS } from '../src/data/teams.ts';
import { mulberry32, shuffle } from '../src/engine/rng.ts';

const SEASONS = Number(process.argv[2] ?? 100);
const TEAM_COUNT = Number(process.argv[3] ?? 11);
const RACE_COUNT = Number(process.argv[4] ?? 24);

const metaRng = mulberry32(20260612);

const winShares = [];
const gaps = [];
const distinctWinners = [];
const winnerPackages = [];
let dnfTotal = 0, driverRaceTotal = 0;

const t0 = Date.now();
for (let s = 0; s < SEASONS; s++) {
  const leagueSeed = Math.floor(metaRng() * 2 ** 31);
  const teamIds = shuffle(TEAMS, metaRng).slice(0, TEAM_COUNT).map(t => t.id);
  const trackIds = shuffle(CURRENT_TRACKS, metaRng).slice(0, RACE_COUNT).map(t => t.id);

  const league = createLeague(leagueSeed, {
    name: `probe-${s}`, godId: 'probe', teamIds, trackIds,
    raceIntervalMs: 1, createdAt: 0,
  });
  const { league: settled } = settleLeague(league, { now: Date.now() });

  const standings = getSeasonStandings(settled.season);
  const top = standings[0];
  winShares.push(top.wins / RACE_COUNT);
  gaps.push(top.points - standings[1].points);
  distinctWinners.push(new Set(settled.digests.map(d => d.finishOrder[0])).size);

  const byId = new Map(settled.roster.map(d => [d.id, d]));
  const w = byId.get(top.driverId);
  winnerPackages.push({
    power: w.carStats?.power ?? 3,
    speed: w.stats.baseSpeed,
    consistency: w.stats.consistency,
    grip: w.carStats?.grip ?? 3,
  });

  for (const st of standings) {
    dnfTotal += st.dnfs;
    driverRaceTotal += st.raceResults.length;
  }
  if ((s + 1) % 10 === 0) console.error(`season ${s + 1}/${SEASONS} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}

const sorted = [...winShares].sort((a, b) => a - b);
const pct = p => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

console.log(`\nSEASON DOMINANCE PROBE — ${SEASONS} universes × ${RACE_COUNT} races, ${TEAM_COUNT} teams`);
console.log(`top-driver win share: mean ${(mean(winShares) * 100).toFixed(1)}%  p25 ${(pct(0.25) * 100).toFixed(0)}%  median ${(pct(0.5) * 100).toFixed(0)}%  p75 ${(pct(0.75) * 100).toFixed(0)}%  p95 ${(pct(0.95) * 100).toFixed(0)}%`);
console.log(`seasons where champ won >=50% of races: ${(winShares.filter(x => x >= 0.5).length / SEASONS * 100).toFixed(0)}%`);
console.log(`seasons where champ won >=2/3 of races (a "Reason Bell"): ${(winShares.filter(x => x >= 2 / 3).length / SEASONS * 100).toFixed(0)}%`);
console.log(`P1-P2 points gap: mean ${mean(gaps).toFixed(0)}  max possible/race=25`);
console.log(`distinct race winners per season: mean ${mean(distinctWinners).toFixed(1)} of ${TEAM_COUNT * 2} drivers`);
console.log(`champion package: avg power ${mean(winnerPackages.map(p => p.power)).toFixed(2)}★, avg speed ${mean(winnerPackages.map(p => p.speed)).toFixed(3)}, avg consistency ${mean(winnerPackages.map(p => p.consistency)).toFixed(3)}, avg grip ${mean(winnerPackages.map(p => p.grip)).toFixed(2)}★`);
console.log(`champions with 5★ power: ${(winnerPackages.filter(p => p.power === 5).length / SEASONS * 100).toFixed(0)}%  (4★+: ${(winnerPackages.filter(p => p.power >= 4).length / SEASONS * 100).toFixed(0)}%)`);
console.log(`DNF rate: ${(dnfTotal / driverRaceTotal * 100).toFixed(1)}%`);
