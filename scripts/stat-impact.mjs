// Headless STAT IMPACT probe — the Q1→Q5 win-rate delta per stat, the same
// table SimLab's in-app batch prints, but runnable from the CLI so a candidate
// canon can be checked without the UI. Mirrors simLabWorker's per-race setup
// (fresh roster + cars, rolled weather, intrinsic track tags) and quintile
// bucketing. Used to (a) confirm the #220 "Power #1 ≥ Consistency" acceptance
// criterion on the candidate canon, and (b) recalibrate betting.strengthWeights
// to the post-flip deltas. Run: npx tsx scripts/stat-impact.mjs [races] [scenario]
import RaceEngine from '../src/RaceEngine.ts';
import { CANON_VARIABLES, cloneVariables } from '../src/simlab/types.ts';
import { generateRoster } from '../src/generators/drivers.ts';
import { generateCarsForKingdoms } from '../src/generators/cars.ts';
import { CURRENT_TRACKS } from '../src/generators/tracks.ts';
import { TEAMS } from '../src/data/teams.ts';
import { rollWeather } from '../src/data/weather.ts';
import { intrinsicTrackTags } from '../src/data/trackTags.ts';

const RACES = Number(process.argv[2] ?? 2000);
const SCENARIO = process.argv[3] ?? 'canon';

function withPower(perStar) {
  const v = cloneVariables(CANON_VARIABLES);
  v.carStats.powerPerStar = perStar;
  v.carStats.powerBase = 0.984 - 3 * perStar; // keep 3★ midpoint
  return v;
}
function withMistakes(base, chance) {
  const v = cloneVariables(base);
  v.performance.mistakeBaseChance = chance;
  v.performance.mistakeConsistencyWeight = 1.5;
  v.performance.mistakeAggressionWeight = 0.5;
  v.performance.mistakeSpeedPenalty = 0.85;
  v.performance.mistakeDurationTicks = 150;
  v.performance.mistakeCooldownTicks = 300;
  return v;
}
const SCENARIOS = {
  canon: CANON_VARIABLES,
  p014: withPower(0.014),
  candidate: withMistakes(withPower(0.014), Number(process.argv[4] ?? 4.5e-4)),
};
const variables = SCENARIOS[SCENARIO] ?? CANON_VARIABLES;

function createRosterWithCars(roster, cars) {
  return roster.map(d => {
    const c = cars.get(d.kingdomId);
    return { ...d, carStats: c?.stats, carName: c?.name, teamStats: c?.teamStats,
      driverTag: d.tag, carTag: c?.carTag, teamTag: c?.teamTag };
  });
}
function quintile(value, min, max) {
  const n = (value - min) / (max - min);
  return n < 0.2 ? 1 : n < 0.4 ? 2 : n < 0.6 ? 3 : n < 0.8 ? 4 : 5;
}
// Driver stat ranges (from simLabWorker); car/team stats are 1–5 stars direct.
const RANGES = {
  speed: [0.85, 1.15], consistency: [0.3, 0.8], luck: [0.85, 1.15],
  acceleration: [0.85, 1.15], endurance: [0.85, 1.15], aggression: [0.3, 0.8],
};
const STATS = ['speed','consistency','luck','acceleration','endurance','aggression',
  'carPower','carGrip','carReliability','pitCrew','tireManagement'];
const buckets = Object.fromEntries(STATS.map(s => [s, [0,0,0,0,0,0].map(() => ({ entries: 0, wins: 0 }))]));
function bucketOf(driver, stat) {
  if (stat === 'carPower') return driver.carStats?.power ?? 3;
  if (stat === 'carGrip') return driver.carStats?.grip ?? 3;
  if (stat === 'carReliability') return driver.carStats?.reliability ?? 3;
  if (stat === 'pitCrew') return driver.teamStats?.pitCrew ?? 3;
  if (stat === 'tireManagement') return driver.teamStats?.tireManagement ?? 3;
  const [min, max] = RANGES[stat];
  return quintile(driver.stats[stat], min, max);
}

const engine = RaceEngine.createForWorker(variables);
let dnfTotal = 0, driverRaces = 0;
const t0 = Date.now();
for (let i = 0; i < RACES; i++) {
  const track = CURRENT_TRACKS[i % CURRENT_TRACKS.length];
  const rosterWithCars = createRosterWithCars(generateRoster(), generateCarsForKingdoms(TEAMS.map(t => t.id)));
  engine.loadGeneratedRoster(rosterWithCars);
  engine.updateConfig({ totalLaps: track.laps, lapLength: track.length, maxStoredEvents: 1000 });
  engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji, funEmoji: track.funEmoji,
    description: track.description ?? '', laps: track.laps });
  engine.setWeather(rollWeather());
  engine.setTrackTags(intrinsicTrackTags(track.id));
  const res = engine.runHeadless();
  const winnerId = res.raceState.finishOrder[0];
  for (const d of res.drivers) {
    driverRaces++;
    if (d.status === 'dnf') dnfTotal++;
    const isWinner = d.id === winnerId;
    for (const stat of STATS) {
      const b = buckets[stat][bucketOf(d, stat)];
      b.entries++;
      if (isWinner) b.wins++;
    }
  }
  if ((i + 1) % 250 === 0) console.error(`race ${i + 1}/${RACES} (${((Date.now()-t0)/1000).toFixed(0)}s)`);
}

console.log(`\nSTAT IMPACT — ${SCENARIO} (${RACES} races, ${driverRaces} driver-races), DNF ${(dnfTotal/driverRaces*100).toFixed(1)}%`);
console.log(['stat','Q1 win%','Q5 win%','Δ'].join('\t'));
const rows = [];
for (const stat of STATS) {
  const q1 = buckets[stat][1], q5 = buckets[stat][5];
  const q1w = q1.entries ? q1.wins / q1.entries : 0;
  const q5w = q5.entries ? q5.wins / q5.entries : 0;
  rows.push({ stat, delta: q5w - q1w, q1w, q5w });
}
rows.sort((a, b) => b.delta - a.delta);
for (const r of rows) {
  console.log([r.stat, (r.q1w*100).toFixed(1)+'%', (r.q5w*100).toFixed(1)+'%', (r.delta*100>=0?'+':'')+(r.delta*100).toFixed(1)+'%'].join('\t'));
}
