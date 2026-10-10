// #346: the team creator's colours and logos mirror Radio's page, every logo
// is vendored, and a built team is what the season shows.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEAM_COLOURS, TEAM_LOGOS, TEAM_NAME_MAX, wearBuiltTeam } from './teamCreator';
import { resolveIcon } from '../icons/registry';
import { generateSeasonPool } from './genesis';
import { humansFor } from './setup';
import { newSeason } from './season';
import { teamsOf } from './ui/teams';

const md = readFileSync(join(__dirname, '../../docs/story/team-identity.md'), 'utf8');
const creator = md.slice(md.indexOf('## Team creator'), md.indexOf('\n## ', md.indexOf('## Team creator') + 1));

describe('team creator', () => {
  it('offers the 28 colours of team-identity.md, in picker order, with their ink', () => {
    const rows = [...creator.matchAll(/^\| (\d+) \| ([^|]+) \| `(#[0-9A-F]{6})` \| `(#[0-9A-F]{6})` \|/gm)];
    expect(rows).toHaveLength(28);
    expect(TEAM_COLOURS.map(c => [c.name, c.hex, c.ink])).toEqual(rows.map(r => [r[2].trim(), r[3], r[4]]));
  });

  it("offers Radio's 20 logos, each vendored by the right author", () => {
    const links = [...creator.matchAll(/game-icons\.net\/1x1\/([a-z0-9-]+)\/([a-z0-9-]+)\.html/g)];
    expect(links).toHaveLength(20);
    // The Badges cog is vendored as `cog-badge` (`cog` is Lorc's, the gear card icon).
    const ids = links.map(([, author, id]) => ({ author, id: author === 'badges' && id === 'cog' ? 'cog-badge' : id }));
    expect(TEAM_LOGOS.flatMap(g => g.ids)).toEqual(ids.map(x => x.id));
    for (const { author, id } of ids) expect(resolveIcon(id)?.author, id).toBe(author);
  });

  it('a built team dresses your slot: name trimmed and capped, colour with its ink, logo', () => {
    const pool = generateSeasonPool(7, 10);
    const [h] = humansFor(pool, [null]);
    const you = wearBuiltTeam(h, { name: '  Pax   Racing  ', colour: '#006EBE', logo: 'fox-head' });
    expect(you).toMatchObject({ teamId: h.teamId, name: 'Pax Racing', color: '#006EBE', ink: '#FFFFFF', iconId: 'fox-head' });
    expect(wearBuiltTeam(h, { name: '   ', colour: '#F4EEDE', logo: 'owl' })).toMatchObject({ name: 'Your team', ink: '#0A0A0C' });
    expect(wearBuiltTeam(h, { name: 'x'.repeat(40), colour: '#006EBE', logo: 'owl' }).name).toHaveLength(TEAM_NAME_MAX);
    // The season shows it.
    const facts = newSeason({ seed: 7, teamCount: 10, humans: [you], calendar: ['speed-power'] });
    expect(teamsOf(facts)[h.teamId]).toMatchObject({ name: 'Pax Racing', color: '#006EBE', iconId: 'fox-head' });
  });
});
