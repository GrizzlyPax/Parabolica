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

const engine = RaceEngine.createForWorker(CANON_VARIABLES);
for (let i = 0; i < RACES; i++) {
  const track = ALL_TRACKS[i % ALL_TRACKS.length];
  const roster = withCars(generateRoster(), generateCarsForKingdoms(TEAMS.map(t => t.id)));
  engine.loadGeneratedRoster(roster);
  engine.updateConfig({ totalLaps: track.laps, lapLength: track.length, maxStoredEvents: 0 });
  engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji,
    funEmoji: track.funEmoji, description: track.description ?? '', laps: track.laps });
  if (WEATHER === 'rolled') engine.setWeather(rollWeather());
  else if (forced) engine.setWeather({ id: forced.id, name: forced.name, emoji: forced.emoji,
    intensity: 1, conditions: forced.conditions, effects: forced.id === 'clear' ? {} : forced.baseEffects });
  else engine.setWeather(null); // 'dry'
  const { raceState } = engine.runHeadless();
  const winner = raceState.finishOrder[0];
  for (const d of roster) {
    const won = d.id === winner;
    for (const t of [d.driverTag, d.carTag, d.teamTag]) if (t) bump(t.id, won);
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
