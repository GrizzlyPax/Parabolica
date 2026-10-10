// #646: driver XP, ranks and the rank-up pick. XP is championship points;
// ranks at 100 / 220 / 400; a rank-up deals a stat jump, a trait and a wild
// card at the rank's metal, blocks the Paddock turn until taken, applies from
// that round, replays exactly, and carries up a run.
import { describe, it, expect } from 'vitest';
import {
  RANKS, JUMP, LEVEL_POINTS, SHOWBOAT_XP, MENTOR_SHARE, GRUDGE_LEVELS, HOME_HERO_LEVELS,
  driverXp, xpInRound, rankIndex, rankName, pendingRankUps, dealRankUp, applyRankUp, validateRankUp, rankUpCard, rankUpCardsFor, driverRanks, wildOf, type RankUpPick,
} from './xp';
import { leagueForRound, newSeason, poolFor, seasonState, setLineup, settleRound, type SeasonFacts } from './season';
import { draftState, quickDraft } from './draft';
import { defaultSetup } from './setup';
import { openPack, takeRankUps } from './testHelpers';
import { driverPointsInRace } from '../fantasy/types';
import { CARDS_BY_ID, DRIVER_STATS } from '../cards';
import { PLAYER_CARD_SCALE } from './pack';
import { newRun, currentLeague, withCurrentLeague, promote, runState, seasonFactsFor, type RunFacts } from '../run/run';
import { generateSeasonPool } from './genesis';

function drafted(seed: number, races = 3): SeasonFacts {
  const d = defaultSetup(seed);
  let facts = newSeason({ ...d, calendar: d.calendar.slice(0, races) });
  return { ...facts, draftPicks: quickDraft(poolFor(facts)) };
}
const you = (f: SeasonFacts) => f.setup.humans[0].teamId;
const mine = (f: SeasonFacts) => draftState(poolFor(f), f.draftPicks).rosters[you(f)].driverIds;

/** Rig the results so the player's first driver wins every round (XP by hand). */
function rigged(seed: number, wins: number): SeasonFacts {
  const facts = drafted(seed, 6);
  const [a, b] = mine(facts);
  const others = poolFor(facts).drivers.map(d => d.id).filter(id => id !== a && id !== b);
  const digest = (i: number) => ({ index: i, trackId: facts.setup.calendar[i], trackName: 't', trackEmoji: '', finishOrder: [a, b, ...others], dnfDriverIds: [], fastestLapDriverId: null, totalTicks: 1000, highlights: [] });
  return { ...facts, results: Array.from({ length: wins }, (_, i) => digest(i)) };
}

describe('XP and ranks', () => {
  it('XP is championship points only; ranks at 100 / 220 / 400', () => {
    expect(RANKS.map(r => r.xp)).toEqual([0, 100, 220, 400]);
    expect([0, 99, 100, 219, 220, 399, 400, 900].map(rankIndex)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(rankName(250)).toBe('Ace');
    const facts = rigged(7, 4); // four wins: 25 each
    const [a, b] = mine(facts);
    expect(driverXp(facts, a)).toBe(100);
    expect(driverXp(facts, b)).toBe(72); // four P2s
    expect(driverXp(facts, a, 2)).toBe(50);
    expect(xpInRound(facts, a, 0)).toBe(driverPointsInRace(facts.results[0], a));
    expect(driverRanks(facts)[a]).toEqual({ xp: 100, rank: 'Pro', next: 220 });
    expect(driverRanks(facts)[b]).toEqual({ xp: 72, rank: 'Rookie', next: 100 });
  });

  it('a rank-up is owed when a rank is reached, blocks the turn until taken, deals three sized cards, and is a fact that replays', () => {
    const facts = rigged(8, 4);
    const [a, b] = mine(facts);
    const round = 4;
    expect(pendingRankUps(facts, round, you(facts))).toEqual([{ driverId: a, rank: 1 }]);
    // Rivals never rank up.
    const rival = poolFor(facts).teams.find(t => t.id !== you(facts))!.id;
    expect(pendingRankUps(facts, round, rival)).toEqual([]);
    // The turn waits on it.
    let f = setLineup(facts, { round, teamId: you(facts), driverIds: [a, b] });
    const offerDone = openPack({ ...f, rankUps: [] }); // the helper takes the rank-up too
    expect(seasonState(offerDone).phase).toBe('ready-for-go');
    const deal = dealRankUp(f, a, 1, round);
    expect(deal.rankName).toBe('Pro');
    expect(deal.cards).toHaveLength(3);
    const [jump, trait, wild] = deal.cards;
    expect(jump.id).toMatch(/^jump-1-/);
    expect(jump.stats).toHaveLength(JUMP[1].stats);
    expect(jump.stats[0].pct).toBe(JUMP[1].levels * LEVEL_POINTS); // +6 levels = +30 grade = a Silver at 3×
    expect(trait.kind).toBe('trait'); expect(trait.target).toBe('driver'); expect(trait.rarity).toBe('silver');
    expect(trait.stats[0].pct).toBe(CARDS_BY_ID.get(trait.id)!.stats[0].pct * PLAYER_CARD_SCALE);
    expect(wildOf(wild.id)).toBeTruthy();
    expect(dealRankUp(f, a, 1, round)).toEqual(deal); // seeded
    // Validation.
    const pick: RankUpPick = { type: 'rank-up', round, teamId: you(f), driverId: a, rank: 1, dealt: deal.cards.map(c => c.id), cardId: jump.id };
    expect(validateRankUp(f, { ...pick, driverId: b })).toMatch(/no rank-up/);
    expect(validateRankUp(f, { ...pick, rank: 2 })).toMatch(/owed is Pro/);
    expect(validateRankUp(f, { ...pick, cardId: 'eq-bronze-speed' })).toMatch(/not dealt/);
    expect(validateRankUp(f, { ...pick, dealt: [] })).toMatch(/record all three/);
    expect(validateRankUp(f, { ...pick, teamId: rival })).toMatch(/clock/);
    f = applyRankUp(f, pick);
    expect(pendingRankUps(f, round, you(f))).toEqual([]);
    expect(() => applyRankUp(f, pick)).toThrow(/no rank-up/);
    // The jump is on the driver from this round, not before; the sim reads it.
    const stat = jump.stats[0].stat;
    const before = leagueForRound({ ...f, rankUps: [] }, round).roster.find(d => d.id === a)!.stats;
    const after = leagueForRound(f, round).roster.find(d => d.id === a)!;
    expect(after.stats[stat as keyof typeof after.stats]).toBeCloseTo(before[stat as keyof typeof before] + (jump.stats[0].pct * 0.30) / 100, 10);
    expect(after.cards!.some(c => c.id === jump.id)).toBe(true);
    expect(leagueForRound(f, 3).roster.find(d => d.id === a)!.cards!.some(c => c.id === jump.id)).toBe(false);
    // Legend deals Iridium-sized: +9 levels on three stats.
    const legend = dealRankUp(f, a, 3, round);
    expect(legend.cards[0].stats).toHaveLength(3);
    expect(legend.cards[0].stats.every(s => s.pct === 9 * LEVEL_POINTS)).toBe(true);
    expect(legend.cards[1].rarity).toBe('iridium');
    expect(rankUpCard('jump-2-baseSpeed+luck').stats.map(s => [s.stat, s.pct])).toEqual([['baseSpeed', 30], ['luck', 30]]);
    expect(() => rankUpCard('nope')).toThrow();
  });

  it('wild cards: Showboat 1.5× XP, Mentor gives the teammate 25%, Grudge Match only in the boss race, Home Hero only at its track', () => {
    const base = rigged(9, 4);
    const [a, b] = mine(base);
    const held = (cardId: string, driverId = a, round = 0): SeasonFacts => ({ ...base, rankUps: [{ type: 'rank-up', round, teamId: you(base), driverId, rank: 1, dealt: [cardId], cardId }] });
    // XP rules
    expect(driverXp(held('wild-showboat'), a)).toBe(100 * SHOWBOAT_XP);
    expect(driverXp(held('wild-showboat', a, 2), a)).toBe(50 + 50 * SHOWBOAT_XP); // from its round
    expect(driverXp(held('wild-mentor'), b)).toBe(72 + 100 * MENTOR_SHARE);
    expect(driverXp(held('wild-mentor'), a)).toBe(100);
    // Stat rules: the boss race is the last round of a run league.
    const boss = { ...held('wild-grudge-match'), setup: { ...base.setup, league: { index: 0, name: 'Juniors', fieldShift: 0, nemesisShift: 0, bossRound: 5 } } };
    expect(rankUpCardsFor(boss, 4)[a]).toBeUndefined();
    expect(rankUpCardsFor(boss, 5)[a]![0].stats).toEqual(DRIVER_STATS.map(stat => ({ stat, pct: GRUDGE_LEVELS * LEVEL_POINTS })));
    expect(rankUpCardsFor(held('wild-grudge-match'), 5)[a]).toBeUndefined(); // no boss round outside a run
    const track = base.setup.calendar[2];
    const home = held(`wild-home-hero:${track}`);
    expect(rankUpCardsFor(home, 2)[a]![0].stats.every(s => s.pct === HOME_HERO_LEVELS * LEVEL_POINTS)).toBe(true);
    const elsewhere = base.setup.calendar.findIndex(t => t !== track);
    expect(rankUpCardsFor(home, elsewhere)[a]).toBeUndefined();
    expect(rankUpCard(`wild-home-hero:${track}`).name).toMatch(/^Home Hero: /);
    expect(rankUpCardsFor(held('wild-showboat'), 0)[a]).toBeUndefined();
  });

  it('a real league: ranks arrive as points pile up, picks are taken in the Paddock, and the season still replays', () => {
    const play = (seed: number) => {
      let f = drafted(seed, 6);
      while (seasonState(f).phase !== 'finished') {
        const s = seasonState(f);
        if (s.phase === 'paddock') {
          const r = draftState(poolFor(f), f.draftPicks).rosters[s.whoseTurn!];
          f = openPack(setLineup(f, { round: s.round, teamId: s.whoseTurn!, driverIds: [r.driverIds[0], r.driverIds[1]] }));
        } else f = settleRound(f);
      }
      return f;
    };
    for (const seed of [31, 32, 33]) {
      const a = play(seed), b = play(seed);
      expect(b).toEqual(a);
      const ids = mine(a);
      for (const id of ids) {
        const xp = driverXp(a, id);
        expect(xp).toBeGreaterThanOrEqual(a.results.reduce((s, d) => s + driverPointsInRace(d, id), 0));
        // Every rank reached before the last Paddock was taken there; one reached by the last race waits for the next league.
        expect((a.rankUps ?? []).filter(p => p.driverId === id)).toHaveLength(rankIndex(driverXp(a, id, a.results.length - 1)));
      }
      expect(takeRankUps(a)).toEqual(a);
    }
  });
});

describe('carrying up a run', () => {
  it('XP and every pick ride up with the team; the next league counts on from there', () => {
    const seed = 41;
    const pool = generateSeasonPool(seed, 5);
    const t = pool.teams[0];
    let run: RunFacts = newRun({ seed, teamCount: 5, races: 2, team: { teamId: t.id, name: 'You', color: '#123456', ink: '#FFFFFF' } });
    let league = currentLeague(run);
    league = { ...league, draftPicks: quickDraft(poolFor(league)) };
    const [a, b] = mine(league);
    const others = pool.drivers.map(d => d.id).filter(id => id !== a && id !== b);
    const digest = (i: number) => ({ index: i, trackId: league.setup.calendar[i], trackName: 't', trackEmoji: '', finishOrder: [a, b, ...others], dnfDriverIds: [], fastestLapDriverId: null, totalTicks: 1000, highlights: [] });
    // Two wins, a lineup fact per round, the pack taken, the Pro rank-up taken in round 1 (after one win: 25 XP... so give three wins' worth by hand).
    league = { ...league, results: [digest(0), digest(1)] };
    league = { ...league, setup: { ...league.setup }, rankUps: [] };
    run = withCurrentLeague(run, league);
    expect(runState(run).phase).toBe('league-won');
    const won = seasonFactsFor(run, 0);
    expect(driverXp(won, a)).toBe(50);
    const next = promote(run);
    const up = currentLeague(next);
    expect(up.setup.carry?.xp).toEqual({ [a]: 50, [b]: 36 });
    expect(driverXp(up, a)).toBe(50);
    // Two more wins up there: Pro at 100.
    const upOthers = poolFor(up).drivers.map(d => d.id).filter(id => id !== a && id !== b);
    const d2 = (i: number) => ({ index: i, trackId: up.setup.calendar[i], trackName: 't', trackEmoji: '', finishOrder: [a, b, ...upOthers], dnfDriverIds: [], fastestLapDriverId: null, totalTicks: 1000, highlights: [] });
    const played = { ...up, results: [d2(0), d2(1)] };
    expect(driverXp(played, a)).toBe(100);
    expect(pendingRankUps(played, 2, you(played))).toEqual([{ driverId: a, rank: 1 }]);
    // A pick made in league 1 carries into league 2 as a held card.
    const pick: RankUpPick = { type: 'rank-up', round: 1, teamId: you(won), driverId: a, rank: 1, dealt: ['x'], cardId: 'jump-1-baseSpeed' };
    const withPick = withCurrentLeague(run, { ...won, rankUps: [pick] });
    const up2 = currentLeague(promote(withPick));
    expect(up2.setup.carry?.rankUps).toEqual([pick]);
    expect(rankUpCardsFor(up2, 0)[a]!.map(c => c.id)).toEqual(['jump-1-baseSpeed']);
    expect(pendingRankUps({ ...up2, results: [d2(0), d2(1)] }, 2, you(up2))).toEqual([]); // Pro already taken; Ace needs 220
  });
});
