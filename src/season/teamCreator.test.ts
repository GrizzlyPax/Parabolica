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

describe('one ink rule (#639)', () => {
  it("all 28 deck colours get Radio's table ink: from inkFor, on deck teams and in the creator", async () => {
    const { DECK_COLOURS } = await import('../data/teamColours');
    const { BASE_DECK_TEAMS } = await import('../data/deckTeams');
    const { inkFor } = await import('../icons/ink');
    const [h] = humansFor(generateSeasonPool(7, 10), [null]);
    expect(DECK_COLOURS).toHaveLength(28);
    for (const c of DECK_COLOURS) {
      expect(inkFor(c.hex), c.name).toBe(c.ink);
      expect(inkFor(c.hex.toLowerCase()), c.name).toBe(c.ink);
      const team = BASE_DECK_TEAMS.find(t => t.color.toUpperCase() === c.hex);
      expect(team?.ink, `${c.name} deck team`).toBe(c.ink);
      expect(wearBuiltTeam(h, { name: 'X', colour: c.hex, logo: 'owl' }).ink, `${c.name} in the creator`).toBe(c.ink);
    }
    // Raspberry is white, as Kanzaki ships (the luminance cut alone said near-black).
    expect(inkFor('#E63281')).toBe('#FFFFFF');
    // Off-table colours still get the contrast rule.
    expect(inkFor('#ffffff')).toBe('#0b0b0c');
    expect(inkFor('#1e3a8a')).toBe('#ffffff');
  });
});
