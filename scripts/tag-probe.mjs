// Throwaway: headless tag win-rate probe mirroring the SimLab's batch loop.
// Confirms the #156 calibration direction before burning a full 2000-race run.
// Run: npx tsx scripts/tag-probe.mjs [races]
import RaceEngine from '../src/RaceEngine.ts';
import { CANON_VARIABLES } from '../src/simlab/types.ts';
import { generateRoster } from '../src/generators/drivers.ts';
import { generateCarsForKingdoms } from '../src/generators/cars.ts';
import { ALL_TRACKS } from '../src/generators/tracks.ts';
import { TEAMS } from '../src/data/teams.ts';
import { rollWeather, WEATHER_TYPES } from '../src/data/weather.ts';
import { intrinsicTrackTags } from '../src/data/trackTags.ts';

const RACES = Number(process.argv[2] ?? 1500);
// 'dry' (no weather), 'rolled' (per-race weather roll), or a weather id to force.
const WEATHER = process.argv[3] ?? 'rolled';
const forced = WEATHER_TYPES.find(w => w.id === WEATHER);

function withCars(roster, cars) {
  return roster.map(d => {
    const car = cars.get(d.kingdomId);
    return { ...d, carStats: car?.stats, carName: car?.name, teamStats: car?.teamStats,
      driverTag: d.tag, carTag: car?.carTag, teamTag: car?.teamTag };
  });
}

const stat = new Map(); // tagId -> { appearances, wins }
const bump = (id, won) => {
  const s = stat.get(id) ?? { appearances: 0, wins: 0 };
  s.appearances++; if (won) s.wins++;
  stat.set(id, s);
};
const wx = new Map();      // weatherId -> { races, dnfs, driverRaces }
const reactive = new Map(); // tagId -> { in:{a,w}, out:{a,w} }

const engine = RaceEngine.createForWorker(CANON_VARIABLES);
for (let i = 0; i < RACES; i++) {
  const track = ALL_TRACKS[i % ALL_TRACKS.length];
  const roster = withCars(generateRoster(), generateCarsForKingdoms(TEAMS.map(t => t.id)));
  engine.loadGeneratedRoster(roster);
  engine.updateConfig({ totalLaps: track.laps, lapLength: track.length, maxStoredEvents: 0 });
  engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji,
    funEmoji: track.funEmoji, description: track.description ?? '', laps: track.laps });
  let weather = null;
  if (WEATHER === 'rolled') weather = rollWeather();
  else if (forced) weather = { id: forced.id, name: forced.name, emoji: forced.emoji,
    intensity: 1, conditions: forced.conditions, effects: forced.id === 'clear' ? {} : forced.baseEffects };
  engine.setWeather(weather);
  const trackTags = intrinsicTrackTags(track.id); // mirror the SimLab loop
  engine.setTrackTags(trackTags);
  const { raceState, drivers } = engine.runHeadless();
  const winner = raceState.finishOrder[0];
  // Union of all condition sources, matching the engine
  const conditions = [...(weather?.conditions ?? []), ...trackTags.flatMap(t => t.conditions ?? [])];
  const wId = weather?.id ?? 'clear';
  const ws = wx.get(wId) ?? { races: 0, dnfs: 0, driverRaces: 0 };
  ws.races++; ws.driverRaces += roster.length;
  ws.dnfs += drivers.filter(d => d.status === 'dnf').length;
  wx.set(wId, ws);
  for (const d of roster) {
    const won = d.id === winner;
    for (const t of [d.driverTag, d.carTag, d.teamTag]) if (t) {
      bump(t.id, won);
      if (t.condition?.when === 'condition') {
        const r = reactive.get(t.id) ?? { in: { a: 0, w: 0 }, out: { a: 0, w: 0 }, cond: t.condition.has };
        const side = conditions.includes(t.condition.has) ? r.in : r.out;
        side.a++; if (won) side.w++;
        reactive.set(t.id, r);
      }
    }
  }
}

const baseline = (100 / 22).toFixed(1);
console.log(`\n${RACES} races · baseline win ≈ ${baseline}%\n`);
console.log('tag'.padEnd(20), 'appear', 'win%', 'x base');
for (const [id, s] of [...stat.entries()].sort((a, b) => b[1].wins / b[1].appearances - a[1].wins / a[1].appearances)) {
  const win = (s.wins / s.appearances) * 100;
  console.log(id.padEnd(20), String(s.appearances).padStart(6),
    win.toFixed(1).padStart(5), (win / (100 / 22)).toFixed(1).padStart(5) + '×');
}

if (wx.size > 1) {
  console.log('\nWEATHER DISTRIBUTION');
  console.log('weather'.padEnd(10), 'races', '%races', 'DNF%');
  for (const [id, w] of [...wx.entries()].sort((a, b) => b[1].races - a[1].races)) {
    console.log(id.padEnd(10), String(w.races).padStart(5),
      ((w.races / RACES) * 100).toFixed(1).padStart(6), ((w.dnfs / w.driverRaces) * 100).toFixed(1).padStart(5));
  }
  if (reactive.size) {
    console.log('\nWEATHER-REACTIVE TAGS (in-condition vs out)');
    for (const [id, r] of reactive) {
      const iW = r.in.a ? (r.in.w / r.in.a) * 100 : 0;
      const oW = r.out.a ? (r.out.w / r.out.a) * 100 : 0;
      console.log(`  ${id} [${r.cond}]  in ${iW.toFixed(1)}% (n=${r.in.a})  out ${oW.toFixed(1)}% (n=${r.out.a})  swing +${(iW - oW).toFixed(1)}%`);
    }
  }
}
