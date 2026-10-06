// npm run calibrate [-- races] [tagId ...]
// Measures every genesis tag solo (paired against the untagged race) and writes
// src/data/tagCalibration.json. Deterministic: same batch seed → same file.
import { writeFileSync } from 'node:fs';
import { calibrateTags, genesisTagIds, CALIBRATION_RACES, bandViolation, describeCalibration } from '../src/racecontrol/calibrate.ts';
import { getTagById } from '../src/data/tags.ts';

const args = process.argv.slice(2);
const races = /^\d+$/.test(args[0] ?? '') ? Number(args.shift()) : CALIBRATION_RACES;
const tagIds = args.length ? args : genesisTagIds();
const t0 = Date.now();
let last = '';
const { file } = calibrateTags(tagIds, {
  races,
  onProgress: (done, total, label) => {
    if (label !== last || done === total) { process.stdout.write(`\r${label.padEnd(24)} ${done}/${total}   `); last = label; }
  },
});
process.stdout.write('\n');
for (const c of file.tags) {
  const v = bandViolation(c);
  console.log(`${(getTagById(c.tagId)?.name ?? c.tagId).padEnd(22)} ${c.rarity.padEnd(10)} ${describeCalibration(c)}${v ? `   ⚠ ${v}` : ''}`);
}
if (tagIds.length === genesisTagIds().length && races === CALIBRATION_RACES) {
  writeFileSync('src/data/tagCalibration.json', JSON.stringify(file, null, 2) + '\n');
  console.log(`\nWrote src/data/tagCalibration.json (baseline ${file.baselineFingerprint}) in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
} else {
  console.log(`\nPartial run (not written). Baseline fingerprint ${file.baselineFingerprint}.`);
}
