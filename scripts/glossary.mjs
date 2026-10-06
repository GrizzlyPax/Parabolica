// Regenerate docs/GLOSSARY.md from the data modules.
// Run: npm run glossary   (or: npx tsx scripts/glossary.mjs)
import { writeFileSync } from 'node:fs';
import { buildGlossary, renderGlossaryMd } from '../src/data/glossary.ts';
import pkg from '../package.json' with { type: 'json' };
const md = renderGlossaryMd(buildGlossary(), pkg.version);
writeFileSync(new URL('../docs/GLOSSARY.md', import.meta.url), md);
console.log(`docs/GLOSSARY.md written (${md.split('\n').length} lines)`);
