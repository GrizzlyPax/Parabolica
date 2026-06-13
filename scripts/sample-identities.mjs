// Throwaway: eyeball + distribution-check the procedural identity generators
// (#185 league names, #191 driver names, #183 team identity). Prints sample
// universes and verifies tier weights over a big draw.
// Run: npx tsx scripts/sample-identities.mjs [sampleSeeds]
import { mulberry32, deriveSeed } from '../src/engine/rng.ts';
import { generateDriverName, NAME_TIER_WEIGHTS } from '../src/generators/names.ts';
import { leagueNameForSeed } from '../src/generators/leagueName.ts';
import { teamIdentitiesForSeed } from '../src/generators/teamIdentity.ts';

const SAMPLES = Number(process.argv[2] ?? 6);

console.log('=== SAMPLE UNIVERSES ===\n');
for (let s = 0; s < SAMPLES; s++) {
  const seed = Math.floor(mulberry32(1000 + s)() * 2 ** 31);
  const rng = mulberry32(deriveSeed(seed, 'genesis', 'drivers'));
  const league = leagueNameForSeed(seed);
  const grid = [];
  for (let i = 0; i < 22; i++) {
    const n = generateDriverName(rng);
    grid.push(n.isCorrupted ? `${n.fullName} ⚠` : n.tier === 'mononym' ? `${n.fullName} ·` : n.fullName);
    // burn a few draws to mimic the real pipeline's per-driver consumption
    rng(); rng(); rng();
  }
  console.log(`${league}  (seed ${seed})`);
  console.log('  ' + grid.join(' · '));
  const ids = teamIdentitiesForSeed(seed, 11);
  console.log('  teams: ' + ids.map(id => `${id.emoji}${id.color}`).join(' '));
  console.log('');
}

console.log('=== TIER DISTRIBUTION (200k draws) ===');
const N = 200000;
const counts = { international: 0, absurd: 0, mononym: 0, corrupted: 0 };
const rng = mulberry32(42);
let corruptedExamples = [];
for (let i = 0; i < N; i++) {
  const n = generateDriverName(rng);
  counts[n.tier]++;
  if (n.isCorrupted && corruptedExamples.length < 12) corruptedExamples.push(n.fullName);
}
for (const tier of Object.keys(counts)) {
  const actual = (counts[tier] / N * 100).toFixed(1);
  const target = (NAME_TIER_WEIGHTS[tier] * 100).toFixed(0);
  console.log(`  ${tier.padEnd(14)} ${actual}%  (target ~${target}%)`);
}
console.log('\n=== CORRUPTED SAMPLES ===');
console.log('  ' + corruptedExamples.join('   '));

// Repeat-rate across a 22-grid: how often does a full name collide?
console.log('\n=== REPEAT CHECK (1000 grids of 22) ===');
let gridsWithDup = 0;
const r2 = mulberry32(7);
for (let g = 0; g < 1000; g++) {
  const seen = new Set();
  let dup = false;
  for (let i = 0; i < 22; i++) {
    const fn = generateDriverName(r2).fullName;
    if (seen.has(fn)) dup = true;
    seen.add(fn);
  }
  if (dup) gridsWithDup++;
}
console.log(`  grids with at least one duplicate full name: ${(gridsWithDup / 10).toFixed(1)}%`);
