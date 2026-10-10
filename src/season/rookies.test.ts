// #660: the rookie start. Rookies are level 5 ± wobble + the archetype's
// nudge; the offer has every archetype; the re-roll is one and free; the pick
// makes the team, league 0 opens in the Paddock with a rookie CPU field and a
// real Juniors nemesis at +6; the rank-up trait follows the archetype.
import { describe, it, expect } from 'vitest';
import {
  ARCHETYPES, ARCHETYPE_INFO, CAR_SETUPS, CAR_SETUP_IDS, CPU_WOBBLE, OFFER_SIZE, OFFER_WOBBLE, ROOKIE_GRADE, ROOKIE_ID_BASE,
  archetypeTraits, rookieOffer, setupCard,
} from './rookies';
import { rating, level } from './grades';
import { newRun, pickRookies, rerollRookies, rookieOfferFor, rookieTeam, runState, validateRookiePick, LEAGUE_LADDER, PLAYER_TEAM_ID, leagueContext, seasonFactsFor, currentLeague } from '../run/run';
import { rookieRun, TEST_TEAM } from '../run/testHelpers';
import { generateSeasonPool, DEFAULT_TEAMS, LEAGUE_ID_STRIDE } from './genesis';
import { poolFor, seasonState, rivalShifts, leagueForRound } from './season';
import { draftState } from './draft';
import { dealRankUp, RANKS } from './xp';
import { nemesisTeam } from './nemesis';
import { quickRace } from './quickRace';
import { DRIVER_STATS, type DriverStatKey } from '../cards';

const grade = (stat: DriverStatKey, raw: number) => rating(stat, raw);

describe('rookies (#660)', () => {
  it('a rookie is level 5 ± the wobble plus the archetype nudge, with no traits', () => {
    for (const roll of [0, 1] as const) {
      const offer = rookieOffer(9, roll);
      expect(offer).toHaveLength(OFFER_SIZE);
      for (const d of offer) {
        expect(d.traits).toEqual([]);
        expect(d.archetype).toBeDefined();
        const nudge = ARCHETYPE_INFO[d.archetype!].nudge;
        for (const st of DRIVER_STATS) {
          const g = grade(st, d.stats[st]);
          const centre = ROOKIE_GRADE + (nudge[st] ?? 0);
          expect(g).toBeGreaterThanOrEqual(centre - OFFER_WOBBLE - 1e-9);
          expect(g).toBeLessThanOrEqual(centre + OFFER_WOBBLE + 1e-9);
        }
        expect(level(grade('luck', d.stats.luck))).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('every offer has at least one of each archetype; the re-roll is a different, deterministic deal with its own ids', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const roll of [0, 1] as const) {
        const kinds = new Set(rookieOffer(seed, roll).map(d => d.archetype));
        expect([...ARCHETYPES].every(a => kinds.has(a))).toBe(true);
      }
    }
    const a = rookieOffer(5, 0), b = rookieOffer(5, 1);
    expect(a).toEqual(rookieOffer(5, 0));
    expect(a.map(d => d.id)).toEqual([0, 1, 2, 3, 4, 5].map(i => ROOKIE_ID_BASE + i));
    expect(b.map(d => d.id)).toEqual([0, 1, 2, 3, 4, 5].map(i => ROOKIE_ID_BASE + OFFER_SIZE + i));
    expect(a.map(d => d.fullName)).not.toEqual(b.map(d => d.fullName));
    expect(new Set(a.map(d => d.number)).size).toBe(OFFER_SIZE);
    expect(ROOKIE_ID_BASE).toBeGreaterThanOrEqual(LEAGUE_ID_STRIDE * LEAGUE_LADDER.length);
  });

  it('the re-roll is one and free; the pick must be two different rookies of the standing offer and a setup', () => {
    const run = newRun({ seed: 3, teamCount: 5, races: 2, team: TEST_TEAM });
    expect(run.setup.team.teamId).toBe(PLAYER_TEAM_ID);
    expect(runState(run).phase).toBe('start');
    const first = rookieOfferFor(run);
    const rolled = rerollRookies(run);
    expect(rookieOfferFor(rolled)).toEqual(rookieOffer(3, 1));
    expect(() => rerollRookies(rolled)).toThrow(/spent/);
    // After the re-roll the first deal is gone.
    expect(validateRookiePick(rolled, { driverIds: [first[0].id, first[1].id], setup: 'twisty' })).toMatch(/from the offer/);
    const [a, b] = rookieOfferFor(rolled);
    expect(validateRookiePick(rolled, { driverIds: [a.id, a.id], setup: 'twisty' })).toMatch(/different/);
    expect(validateRookiePick(rolled, { driverIds: [a.id, b.id], setup: 'rocket' as never })).toMatch(/no car setup/);
    expect(validateRookiePick(rolled, { driverIds: [a.id, b.id], setup: 'bulletproof' })).toBeNull();
    const picked = pickRookies(rolled, { driverIds: [a.id, b.id], setup: 'bulletproof' });
    expect(() => rerollRookies(picked)).toThrow(/picked/);
    expect(() => pickRookies(picked, { driverIds: [a.id, b.id], setup: 'twisty' })).toThrow(/picked/);
    expect(runState(picked).phase).toBe('league');
  });

  it('the pick makes the team: the two rookies, a 2★ car wearing the setup, your look at 2★; league 0 opens in the Paddock', () => {
    const run = rookieRun(21, 5, 2, {}, 'straight-line');
    const league = currentLeague(run);
    const team = rookieTeam(run)!;
    expect(league.setup.carry).toEqual(team);
    expect(team.teamId).toBe(PLAYER_TEAM_ID);
    expect(team.drivers.map(d => d.id)).toEqual(run.rookies.pick!.driverIds);
    expect(team.car.stats).toEqual({ power: 2, grip: 2, reliability: 2 });
    expect(team.car.traits.map(c => c.id)).toEqual(['setup-straight-line']);
    expect(team.team).toMatchObject({ id: PLAYER_TEAM_ID, name: 'Kitty Hut', teamStats: { tireManagement: 2, pitCrew: 2 }, traits: [] });
    expect(seasonState(league).phase).toBe('paddock');
    const pool = poolFor(league);
    const roster = draftState(pool, league.draftPicks).rosters[PLAYER_TEAM_ID];
    expect(roster.driverIds).toEqual(team.drivers.map(d => d.id));
    expect(roster.carId).toBe(team.car.id);
    expect(pool.teams[0].id).toBe(PLAYER_TEAM_ID);
    // The setup is on the car at race build: Straight-line = +10 points of power on a 2★ car.
    const grid = leagueForRound(league, 0).roster.filter(d => d.kingdomId === PLAYER_TEAM_ID);
    expect(grid).toHaveLength(2);
    for (const d of grid) expect(d.carStats!.power).toBeCloseTo(2 + 0.4, 10);
    // Every setup is one stat, priced king ×1 / weak ×2.
    expect(CAR_SETUP_IDS.map(id => [CAR_SETUPS[id].stat, CAR_SETUPS[id].points])).toEqual([['power', 10], ['grip', 20], ['reliability', 20]]);
    expect(setupCard('twisty')).toMatchObject({ kind: 'trait', target: 'car', stats: [{ stat: 'grip', pct: 20 }] });
  });

  it('the CPU field is rookies from the same pool (±10), in every league; a stand-alone season and Quick Race roll genesis', () => {
    const run = rookieRun(8, DEFAULT_TEAMS, 2);
    const pool = poolFor(currentLeague(run));
    const cpu = pool.drivers.filter(d => d.reservedFor !== PLAYER_TEAM_ID);
    expect(cpu).toHaveLength((DEFAULT_TEAMS - 1) * 2);
    for (const d of cpu) {
      expect(d.traits).toEqual([]);
      const nudge = ARCHETYPE_INFO[d.archetype!].nudge;
      for (const st of DRIVER_STATS) {
        const g = grade(st, d.stats[st]);
        expect(Math.abs(g - (ROOKIE_GRADE + (nudge[st] ?? 0)))).toBeLessThanOrEqual(CPU_WOBBLE + 1e-9);
      }
    }
    for (const c of pool.cars.filter(c => c.reservedFor !== PLAYER_TEAM_ID)) {
      expect(c.traits).toEqual([]);
      for (const v of Object.values(c.stats)) expect(Math.abs(v - 2)).toBeLessThanOrEqual(0.4 + 1e-9);
    }
    for (const t of pool.teams.filter(t => t.id !== PLAYER_TEAM_ID)) {
      expect(t.traits).toEqual([]);
      for (const v of Object.values(t.teamStats)) expect(Math.abs(v - 2)).toBeLessThanOrEqual(0.4 + 1e-9);
    }
    // Numbers and ids stay unique with the carried pair in.
    expect(new Set(pool.drivers.map(d => d.number)).size).toBe(pool.drivers.length);
    expect(new Set(pool.drivers.map(d => d.id)).size).toBe(pool.drivers.length);
    // A later league too: the context carries `rookies` through poolFor.
    const up = generateSeasonPool(99, 5, undefined, { league: leagueContext(2, 2), rookies: true });
    expect(up.drivers.every(d => d.archetype && d.traits.length === 0)).toBe(true);
    // Not in a stand-alone season or Quick Race (the golden fingerprint's path).
    const plain = generateSeasonPool(8, DEFAULT_TEAMS);
    expect(plain.drivers.every(d => d.archetype === undefined)).toBe(true);
    expect(plain.drivers.some(d => d.traits.length > 0)).toBe(true);
    expect(quickRace(8).facts.setup.league).toBeUndefined();
  });

  it('the Juniors have a real nemesis at +6: the first fresh team, shifted field + nemesis; the ladder is 0/+6 · +7/+12 · +22/+14 · +37/+12', () => {
    expect(LEAGUE_LADDER.map(r => [r.field, r.nemesis])).toEqual([[0, 6], [7, 12], [22, 14], [37, 12]]);
    const run = rookieRun(13, 5, 2);
    const league = currentLeague(run);
    const pool = poolFor(league);
    const nemesis = pool.teams.filter(t => t.nemesis);
    expect(nemesis).toHaveLength(1);
    expect(nemesis[0].id).toBe(`team-0`);
    expect(nemesisTeam(league)?.id).toBe('team-0');
    const shifts = rivalShifts(league);
    expect(shifts[PLAYER_TEAM_ID]).toBeUndefined();
    expect(shifts['team-0']).toBe(6);
    for (const t of pool.teams) if (!t.nemesis && t.id !== PLAYER_TEAM_ID) expect(shifts[t.id]).toBe(0);
  });

  it('the rank-up trait comes from the driver\'s own archetype: the run deck\'s tags (#647), nearest metal when the deck has none', () => {
    for (const a of ARCHETYPES) {
      // Pro (silver): every archetype has its own silver driver trait.
      const silver = archetypeTraits(a, 'silver');
      expect(silver.length).toBeGreaterThan(0);
      for (const c of silver) { expect(c.deck).toBe('run'); expect(c.kind).toBe('trait'); expect(c.target).toBe('driver'); expect(c.rarity).toBe('silver'); expect([a, 'any']).toContain(c.tag); }
      for (const metal of ['gold', 'iridium'] as const) {
        const cards = archetypeTraits(a, metal);
        expect(cards.length).toBeGreaterThan(0);
        for (const c of cards) expect([a, 'any']).toContain(c.tag);
      }
    }
    // The deck's gaps fall to the nearest metal, commoner first: a Qualifier Ace gets Pole Sitter (silver).
    expect(archetypeTraits('qualifier', 'gold').map(c => c.id)).toEqual(['rd-pole-sitter']);
    expect(archetypeTraits('brawler', 'gold').map(c => c.id)).toEqual(['rd-red-mist']);
    expect(archetypeTraits('tyre-saver', 'iridium').map(c => c.id)).toEqual(['rd-complete-driver']);
    // Already held by a rank-up: skipped.
    expect(archetypeTraits('qualifier', 'gold', new Set(['rd-pole-sitter'])).map(c => c.id)).toEqual(['rd-hot-lapper', 'rd-steady-hands']);
    expect(archetypeTraits(undefined, 'silver').every(c => c.rarity === 'silver' && c.target === 'driver')).toBe(true);
    const run = rookieRun(21, 5, 2);
    const league = currentLeague(run);
    const [id] = run.rookies.pick!.driverIds;
    const archetype = poolFor(league).drivers.find(d => d.id === id)!.archetype!;
    const dealt = dealRankUp(league, id, 1);
    const trait = dealt.cards[1];
    expect(trait.rarity).toBe(RANKS[1].metal);
    expect([archetype, 'any']).toContain(trait.tag);
    void ARCHETYPE_INFO; void seasonFactsFor;
  });
});
