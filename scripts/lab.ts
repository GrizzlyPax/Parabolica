// npm run lab -- <seed> [races=100] [all|random] [card ...]
// Replays a Race Control / SimLab batch outside the browser and prints the
// same fingerprint the lab shows, plus the headline numbers. If the
// fingerprints match, the browser and the script ran the same races.
import { labSpec, runLabRace, raceFingerprint, batchFingerprint } from '../src/racecontrol/runner.ts';
import RaceEngine from '../src/RaceEngine.ts';

const [seedArg, racesArg = '100', modeArg = 'all', ...cards] = process.argv.slice(2);
if (!seedArg) { console.error('usage: npm run lab -- <seed> [races] [all|random] [card ...]'); process.exit(1); }
const seed = Number(seedArg) >>> 0, races = Number(racesArg);
const mode = modeArg === 'random' ? 'random' : 'all';
const engine = RaceEngine.createForWorker();
const fps: string[] = [];
let dnf = 0, starters = 0, passes = 0, sc = 0, stops = 0, finishers = 0, ticks = 0;
for (let i = 0; i < races; i++) {
  const r = runLabRace(labSpec(seed, i, cards, mode), { engine });
  fps.push(raceFingerprint(r));
  starters += r.drivers.length; ticks += r.raceState.totalTicks;
  for (const d of r.drivers) { if (d.status === 'dnf') dnf++; else { finishers++; stops += d.pitStops.length; } }
  passes += r.events.filter(e => e.type === 'overtake' && /passes/.test(e.description)).length;
  sc += r.events.filter(e => e.type === 'unsafety_car_deployed').length / 2;
  if ((i + 1) % 25 === 0) process.stdout.write(`\r${i + 1}/${races}   `);
}
process.stdout.write('\n');
console.log(`seed ${seed} · ${races} races · tracks ${mode} · cards ${cards.join(' ') || 'none'}`);
console.log(`fingerprint #${batchFingerprint(fps)}`);
console.log(`DNF ${(100 * dnf / starters).toFixed(1)}% · stops/finisher ${(stops / finishers).toFixed(2)} · passes/race ${(passes / races).toFixed(0)} · safety cars/race ${(sc / races).toFixed(2)} · length ${(ticks / races).toFixed(0)} ticks`);
