// How often do tag actions fire over a season? node --import tsx scripts/action-probe.mjs
import { createLeague } from '../src/league/league.ts';
import { settleLeague } from '../src/league/settle.ts';
import { TEAMS } from '../src/data/teams.ts';
import { CURRENT_TRACKS } from '../src/generators/tracks.ts';
const HOUR = 3_600_000, T0 = 1_750_000_000_000;
const counts = {}; let seasons = 0, acq = 0;
for (let seed = 1; seed <= 20; seed++) {
  const setup = { name: 'P', godId: 'the-scrap-heap', teamIds: TEAMS.map(t => t.id), trackIds: CURRENT_TRACKS.map(t => t.id), raceIntervalMs: HOUR, createdAt: T0 };
  const lg = settleLeague(createLeague(seed, setup), { now: T0 + 100 * HOUR }).league;
  seasons++;
  for (const e of lg.interventionLog) {
    if (e.type !== 'acquire-tag') continue;
    if (e.ruleId.includes(':')) counts[e.ruleId] = (counts[e.ruleId] ?? 0) + 1; else acq++;
  }
  if (seed === 1) for (const d of lg.digests) for (const c of d.tagChanges ?? []) if (/Void|haunting|Bad Blood|hardens|listen/.test(c.headline)) console.log(`r${d.index}: ${c.headline}`);
}
console.log(`\n${seasons} seasons, ${CURRENT_TRACKS.length} races each · acquisitions/season ${(acq/seasons).toFixed(1)}`);
for (const [k, v] of Object.entries(counts)) console.log(`${k}: ${(v/seasons).toFixed(2)}/season`);
