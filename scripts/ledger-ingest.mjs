// Fold a `ledger` issue's JSON batch into public/ledger/runs.jsonl and
// public/ledger/presets.json. Run by .github/workflows/ledger.yml; also
// usable locally: ISSUE_BODY="$(cat batch.md)" node scripts/ledger-ingest.mjs
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';

const body = process.env.ISSUE_BODY ?? '';
const issue = Number(process.env.ISSUE_NUMBER ?? 0);
const user = process.env.ISSUE_USER ?? '';
const m = body.match(/```json\s*([\s\S]*?)```/);
if (!m) { console.error('No ```json block in the issue body'); process.exit(1); }
const batch = JSON.parse(m[1]);
if (batch.kind !== 'ledger-batch' || !Array.isArray(batch.runs) || !Array.isArray(batch.presets)) { console.error('Not a ledger batch'); process.exit(1); }

const RUNS = 'public/ledger/runs.jsonl', PRESETS = 'public/ledger/presets.json';
const haveRuns = new Set(existsSync(RUNS) ? readFileSync(RUNS, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).id) : []);
const presets = existsSync(PRESETS) ? JSON.parse(readFileSync(PRESETS, 'utf8')) : [];
const byId = new Map(presets.map(p => [p.id, p]));

let newRuns = 0, newPresets = 0;
for (const r of batch.runs) {
  if (!r.id || haveRuns.has(r.id)) continue;
  appendFileSync(RUNS, JSON.stringify({ ...r, issue, user }) + '\n');
  haveRuns.add(r.id); newRuns++;
}
for (const p of batch.presets) {
  if (!p.id) continue;
  if (!byId.has(p.id)) newPresets++;
  byId.set(p.id, { ...p, issue, user });
}
writeFileSync(PRESETS, JSON.stringify([...byId.values()].sort((a, b) => b.createdAt - a.createdAt), null, 2) + '\n');
const summary = `${newRuns} run${newRuns === 1 ? '' : 's'}, ${newPresets} new preset${newPresets === 1 ? '' : 's'} (${batch.presets.length - newPresets} updated)`;
console.log(summary);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `summary=${summary}\n`);
