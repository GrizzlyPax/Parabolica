// #246 mechanics probe: pure drivers, no tags, canon physics. Measures the
// things a race fan would check: does pace rank predict results, how much
// does the running order change, stops/pit loss, lapped cars, margins,
// attrition. npx tsx scripts/mechanics-probe.mjs [races] [noTags=1]
import RaceEngine from '../src/RaceEngine.ts';
import { createLeague } from '../src/league/league.ts';
import { prepareScheduledRace } from '../src/league/settle.ts';
import { CURRENT_TRACKS } from '../src/generators/tracks.ts';
import { TEAMS } from '../src/data/teams.ts';
import { resolveRuleset } from '../src/rules/ruleset.ts';
import { RULE_CARDS_BY_ID } from '../src/data/ruleCards.ts';
import { mulberry32, shuffle } from '../src/engine/rng.ts';

const RACES = Number(process.argv[2] ?? 200);
const NO_TAGS = (process.argv[3] ?? '1') === '1';
const meta = mulberry32(246);
const ruleset = resolveRuleset(NO_TAGS ? ['no-tags'] : [], RULE_CARDS_BY_ID);

// Deterministic "pace score" from stats, the thing a fan would call "the package".
const pace = d => (1 + (d.stats.baseSpeed - 1) * 0.12) * (0.942 + (d.carStats?.power ?? 3) * 0.014);
const spearman = (a, b) => { const n = a.length; const ra = rank(a), rb = rank(b); let s = 0; for (let i = 0; i < n; i++) s += (ra[i] - rb[i]) ** 2; return 1 - 6 * s / (n * (n * n - 1)); };
const rank = v => { const idx = v.map((x, i) => [x, i]).sort((p, q) => q[0] - p[0]); const r = new Array(v.length); idx.forEach(([, i], k) => r[i] = k + 1); return r; };

const acc = { rho: [], gridRho: [], gridPaceRho: [], poleWins: [], winnerGrid: [], winnerPaceRank: [], posChanges: [], netPlaceSwaps: [], stops: [], lapped: [], margin: [], dnf: 0, drivers: 0, sc: 0, ticks: [], lapTicks: [], pitTicks: [], compounds: { soft: 0, medium: 0, hard: 0 }, blowouts: 0, crashes: 0, mech: 0, penalties: 0, passes: 0, battles: 0, penaltyWinnerLoss: 0, reasons: {}, plans: {}, firstStopFrac: [], stopLapSpread: [], lapsPerStint: { soft: [], medium: [], hard: [] }, lapsLed: [], closeCalls: 0 };
let laps = 0;

for (let r = 0; r < RACES; r++) {
  const seed = Math.floor(meta() * 2 ** 31);
  const teamIds = shuffle(TEAMS, meta).slice(0, 11).map(t => t.id);
  const track = CURRENT_TRACKS[Math.floor(meta() * CURRENT_TRACKS.length)];
  const league = createLeague(seed, { name: 'p', godId: 'probe', teamIds, trackIds: [track.id], raceIntervalMs: 1, createdAt: 0, ruleset });
  const engine = RaceEngine.createForWorker();
  prepareScheduledRace(engine, league, 0, track, ruleset.simVars);
  engine.updateConfig({ maxStoredEvents: Number.MAX_SAFE_INTEGER });
  const { drivers, raceState, events } = engine.runHeadless(league.schedule[0].seed);
  laps = track.laps;
  const hist = engine.getLapHistory();
  const finish = raceState.finishOrder;
  const byId = new Map(drivers.map(d => [d.id, d]));
  const classified = finish.filter(id => byId.get(id).status !== 'dnf');
  // pace rank vs finish rank among classified
  const paces = classified.map(id => pace(byId.get(id)));
  const finPos = classified.map((_, i) => classified.length - i);
  if (classified.length > 5) acc.rho.push(spearman(paces, finPos));
  const allPaceSorted = [...drivers].sort((a, b) => pace(b) - pace(a)).map(d => d.id);
  const gridIds = engine.getGridOrder();
  if (gridIds.length) {
    acc.poleWins.push(gridIds[0] === finish[0] ? 1 : 0);
    acc.winnerGrid.push(gridIds.indexOf(finish[0]) + 1);
    const gPos = classified.map(id => classified.length - gridIds.indexOf(id)); // higher = better grid
    acc.gridRho.push(spearman(gPos, finPos));
    acc.gridPaceRho.push(spearman(gridIds.map(id => pace(byId.get(id))), gridIds.map((_, i) => gridIds.length - i)));
  }
  acc.winnerPaceRank.push(allPaceSorted.indexOf(finish[0]) + 1);
  // running-order churn: sum over laps of |rank change| per driver
  let changes = 0;
  for (let l = 1; l < hist.length; l++) {
    const prev = hist[l - 1].order, cur = hist[l].order;
    for (const id of cur) { const a = prev.indexOf(id), b = cur.indexOf(id); if (a >= 0 && b >= 0 && a !== b) changes++; }
  }
  acc.posChanges.push(changes / Math.max(1, hist.length - 1));
  const grid = hist[0]?.order ?? [];
  let swaps = 0; for (const id of classified) { const g = grid.indexOf(id), f = finish.indexOf(id); if (g >= 0) swaps += Math.abs(g - f); }
  acc.netPlaceSwaps.push(swaps / Math.max(1, classified.length));
  for (const d of drivers) {
    acc.drivers++;
    if (d.status === 'dnf') { acc.dnf++; const why = d.dnfInfo?.reason ?? d.dnfInfo?.type ?? ''; if (/blow|tire|tyre/i.test(why)) acc.blowouts++; else if (/crash|collision|pile/i.test(why)) acc.crashes++; else acc.mech++; continue; }
    acc.stops.push(d.pitStops.length);
    if (d.lapsBehind > 0) acc.lapped.push(1); else acc.lapped.push(0);
    for (const c of d.usedCompounds) acc.compounds[c] = (acc.compounds[c] ?? 0) + 1;
    if (d.pitStops[0]) acc.firstStopFrac.push((d.pitStops[0].lap ?? 0) / track.laps);
    for (const p of d.pitStops) if (p.duration) acc.pitTicks.push(p.duration);
    if (d.penaltyTicks > 0) acc.penalties++;
    const plan = d.usedCompounds.map(c => c[0].toUpperCase()).join('→'); acc.plans[plan] = (acc.plans[plan] ?? 0) + 1;
    if (d.lapTimes.length) acc.lapTicks.push(d.lapTimes.reduce((a, b) => a + b, 0) / d.lapTimes.length);
  }
  const stopLaps = drivers.flatMap(d => d.pitStops.map(p => p.lap ?? 0));
  if (stopLaps.length) { const m = stopLaps.reduce((a, b) => a + b, 0) / stopLaps.length; acc.stopLapSpread.push(Math.sqrt(stopLaps.reduce((s, x) => s + (x - m) ** 2, 0) / stopLaps.length)); }
  const w = byId.get(finish[0]), second = byId.get(finish[1]);
  if (w && second && second.status !== 'dnf' && w.finishTick && second.finishTick) acc.margin.push((second.finishTick - w.finishTick) / (w.lapTimes.at(-1) || 100));
  acc.ticks.push(raceState.totalTicks);
  acc.sc += events.filter(e => e.type === 'unsafety_car_deployed').length / 2; // engine double-logs
  acc.closeCalls += events.filter(e => e.type === 'close_call').length;
  acc.passes += events.filter(e => e.type === 'overtake' && /passes/.test(e.description)).length;
  acc.battles += events.filter(e => e.type === 'battle').length;
  for (const e of events) if (e.type === 'pit_entry') { const r = e.description.replace('Boxes — ', ''); acc.reasons[r] = (acc.reasons[r] ?? 0) + 1; }
  const leaders = new Set(hist.map(h => h.order[0])); acc.lapsLed.push(leaders.size);
  if ((r + 1) % 50 === 0) console.error(`${r + 1}/${RACES}`);
}
const mean = v => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
const pct = v => `${(100 * mean(v)).toFixed(1)}%`;
const med = v => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
console.log(`\n== Mechanics probe · ${RACES} races · ${NO_TAGS ? 'NO TAGS' : 'tags on'} · ${laps}-ish laps ==`);
console.log(`Pace rank → finish rank (Spearman): ${mean(acc.rho).toFixed(2)}  (1 = results are pure stats, 0 = lottery)`);
console.log(`Winner's pace rank (median): P${med(acc.winnerPaceRank)}   top-3 package wins ${pct(acc.winnerPaceRank.map(x => x <= 3 ? 1 : 0))}, outside top-10 wins ${pct(acc.winnerPaceRank.map(x => x > 10 ? 1 : 0))}`);
console.log(`Grid → finish (Spearman): ${mean(acc.gridRho).toFixed(2)}   grid vs package: ${mean(acc.gridPaceRho).toFixed(2)}   pole wins ${pct(acc.poleWins)}   winner from P${med(acc.winnerGrid)} (median)`);
console.log(`Running-order changes per lap (all drivers): ${mean(acc.posChanges).toFixed(1)}   avg |grid − finish|: ${mean(acc.netPlaceSwaps).toFixed(1)} places`);
console.log(`Distinct leaders per race: ${mean(acc.lapsLed).toFixed(1)}   winning margin: ${(100 * mean(acc.margin)).toFixed(0)}% of a lap`);
console.log(`Stops per finisher: ${mean(acc.stops).toFixed(2)}   first stop at ${pct(acc.firstStopFrac)} distance   stop-lap spread (sd): ${mean(acc.stopLapSpread).toFixed(2)} laps`);
console.log(`Pit stop in-lane time: ${mean(acc.pitTicks).toFixed(0)} ticks = ${(mean(acc.pitTicks) / mean(acc.lapTicks)).toFixed(2)} laps   (lap ≈ ${mean(acc.lapTicks).toFixed(0)} ticks)`);
console.log(`Lapped finishers: ${pct(acc.lapped)}   compounds used (finisher-stints): S${acc.compounds.soft} M${acc.compounds.medium} H${acc.compounds.hard}`);
console.log(`DNF: ${pct([acc.dnf / acc.drivers])} of starters (${(acc.dnf / RACES).toFixed(1)}/race) — crash ${acc.crashes}, blowout ${acc.blowouts}, mech ${acc.mech}`);
console.log(`Penalised finishers: ${pct([acc.penalties / Math.max(1, acc.stops.length)])}   why they boxed: ${Object.entries(acc.reasons).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${Math.round(100*v/Object.values(acc.reasons).reduce((a,b)=>a+b,0))}%`).join(' · ')}`);
console.log(`Plans (finishers): ${Object.entries(acc.plans).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`${k} ${v}`).join(' · ')}`);
console.log(`Passes/race: ${(acc.passes / RACES).toFixed(0)}   battles/race: ${(acc.battles / RACES).toFixed(0)}`);
console.log(`Safety cars/race: ${(acc.sc / RACES).toFixed(2)}   close calls/race: ${(acc.closeCalls / RACES).toFixed(0)}   race length: ${mean(acc.ticks).toFixed(0)} ticks`);
