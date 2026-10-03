// Headless SimLab runner.
// Runs the SimLab batch loop (src/simlab/simLabWorker.ts) directly in node —
// no browser, no Web Worker. This closes the balance loop: change variables,
// run a batch, read the report, no human in the middle.
//
// Run: npx tsx scripts/simlab-run.mjs [--races N] [--tracks all|random] [--vars '<json>'] [--out path] [--tsv]
//
// Examples:
//   npx tsx scripts/simlab-run.mjs --races 500
//   npx tsx scripts/simlab-run.mjs --races 2000 --tracks random --out reports/canon.json --tsv
//   npx tsx scripts/simlab-run.mjs --races 500 --vars '{"mistakeRate":0.05}'

import { runSimulation } from '../src/simlab/simLabWorker.ts';
import { conditionsSections } from '../src/simlab/reportSections.ts';
import { writeFileSync } from 'node:fs';

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}
function flag(name) {
  return process.argv.includes(name);
}

const races = Number(arg('--races', '500'));
const tracks = arg('--tracks', 'all');
const varsRaw = arg('--vars', null);
const out = arg('--out', `simlab-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
const wantTsv = flag('--tsv');

if (!Number.isFinite(races) || races <= 0) {
  console.error('--races must be a positive number');
  process.exit(1);
}
if (tracks !== 'all' && tracks !== 'random') {
  console.error("--tracks must be 'all' or 'random'");
  process.exit(1);
}
let variables;
if (varsRaw) {
  try {
    variables = JSON.parse(varsRaw);
  } catch {
    console.error('--vars must be valid JSON');
    process.exit(1);
  }
}

console.log(`Running ${races} races (tracks: ${tracks})${variables ? ' with variable overrides' : ''}...`);
const t0 = Date.now();
const results = await runSimulation({ batchSize: races, trackSelection: tracks }, variables);
if (!results) {
  console.error('Simulation failed (no results returned)');
  process.exit(1);
}

writeFileSync(out, JSON.stringify(results, null, 2));
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${results.totalRaces} races, ${results.totalDriverRaces} driver-races`);
console.log(`JSON: ${out}`);

if (wantTsv) {
  const tsvPath = out.replace(/\.json$/, '') + '.tsv';
  const parts = [];
  for (const s of conditionsSections(results)) {
    parts.push(s.title);
    if (s.note) parts.push(`# ${s.note}`);
    parts.push(s.columns.join('\t'));
    for (const row of s.rows) parts.push(row.join('\t'));
    parts.push('');
  }
  writeFileSync(tsvPath, parts.join('\n'));
  console.log(`TSV: ${tsvPath}`);
}
