// #316: card packs + the team locker.
import { describe, it, expect } from 'vitest';
import {
  dealPack, packTierForRank, packTierFor, applyPack, moveGear, teamCardState, pendingPack, validatePackApplication, validateGearMove,
  PACK_ODDS, PACK_TIERS, TRAIT_CHANCE, FIRST_PACK_TIER, type PackApplication,
} from './pack';
import { newSeason, seasonState, setLineup, settleRound, constructorStandings, leagueForRound, poolFor, saveSeason, loadSeason, type SeasonFacts, type SeasonStore } from './season';
import { quickDraft, draftOrder, draftState } from './draft';
import { openPack } from './testHelpers';
import { CARDS_BY_ID } from '../cards';
import { CURRENT_TRACKS } from '../generators/tracks';

const CALENDAR = CURRENT_TRACKS.slice(0, 3).map(t => t.id);

function scripted(seed: number, teams: number, humanSlots: number[] = [3]): SeasonFacts {
  const probe = newSeason({ seed, teamCount: teams, humans: [], calendar: CALENDAR });
  const order = draftOrder(poolFor(probe));
  const humans = humanSlots.map((slot, i) => ({ teamId: order[slot], name: `Human ${i + 1}`, color: '#123456' }));
  let facts = newSeason({ seed, teamCount: teams, humans, calendar: CALENDAR });
  facts = { ...facts, draftPicks: quickDraft(poolFor(facts)) };
  return facts;
}

function defaultLineup(facts: SeasonFacts, teamId: string): [number, number] {
  const r = draftState(poolFor(facts), facts.draftPicks).rosters[teamId];
  return [r.driverIds[0], r.driverIds[1]];
}

/** Everyone sets a lineup and opens their pack, then the round races. */
function playRound(facts: SeasonFacts): SeasonFacts {
  for (;;) {
    const s = seasonState(facts);
    if (s.phase !== 'paddock') break;
    facts = openPack(setLineup(facts, { round: s.round, teamId: s.whoseTurn!, driverIds: defaultLineup(facts, s.whoseTurn!) }));
  }
  return settleRound(facts);
}

function memoryStore(): SeasonStore {
  const map = new Map<string, string>();
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: k => void map.delete(k) };
}

describe('the deal', () => {
  it('tier follows standing in quarters, round 1 is Uncommon for everyone', () => {
    expect(packTierForRank(1, 10)).toBe('common');
    expect(packTierForRank(3, 10)).toBe('common');
    expect(packTierForRank(4, 10)).toBe('uncommon');
    expect(packTierForRank(6, 10)).toBe('rare');
    expect(packTierForRank(9, 10)).toBe('legendary');
    expect(packTierForRank(10, 10)).toBe('legendary');
    expect([1, 2, 3, 4, 5].map(r => packTierForRank(r, 5))).toEqual(['common', 'common', 'uncommon', 'rare', 'legendary']);
    expect(FIRST_PACK_TIER).toBe('uncommon');
    const facts = scripted(1, 10, [0, 9]);
    for (const h of facts.setup.humans) expect(dealPack(facts, 0, h.teamId)!.tier).toBe('uncommon');
    // After a round, the pack tier is the quarter of the standing before the next round.
    const played = playRound(facts);
    const standings = constructorStandings(played);
    for (const h of played.setup.humans) {
      const rank = standings.find(s => s.teamId === h.teamId)!.rank;
      expect(packTierFor(played, 1, h.teamId)).toBe(packTierForRank(rank, 10));
    }
    // Replaying the round-1 deal later, with more results on the facts, gives the same tier.
    const later = playRound(played);
    for (const h of later.setup.humans) expect(dealPack(later, 1, h.teamId)).toEqual(dealPack(played, 1, h.teamId));
  });

  it('same seed + standings → same card; CPU teams get none', () => {
    const a = scripted(5, 8, [2]), b = scripted(5, 8, [2]);
    const human = a.setup.humans[0].teamId;
    expect(dealPack(a, 0, human)).toEqual(dealPack(b, 0, human));
    expect(dealPack(a, 0, human)!.cards[0].kind).not.toBe('effect');
    const cpu = poolFor(a).teams.find(t => t.id !== human)!.id;
    expect(dealPack(a, 0, cpu)).toBeNull();
    expect(dealPack(scripted(6, 8, [2]), 0, scripted(6, 8, [2]).setup.humans[0].teamId)).not.toEqual(dealPack(a, 0, human));
  });

  it('deals a trait about 1 in 4, gear otherwise, with the metal odds of the tier', () => {
    let traits = 0, n = 0;
    const metals: Record<string, number> = {};
    for (let seed = 0; seed < 150; seed++) {
      const facts = scripted(seed, 10, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const t of poolFor(facts).teams) {
        const p = dealPack(facts, 0, t.id)!;
        n++;
        if (p.cards[0].kind === 'trait') traits++;
        metals[p.cards[0].rarity!] = (metals[p.cards[0].rarity!] ?? 0) + 1;
        expect(['trait', 'equipment', 'upgrade', 'facility']).toContain(p.cards[0].kind);
      }
    }
    expect(traits / n).toBeGreaterThan(TRAIT_CHANCE - 0.04);
    expect(traits / n).toBeLessThan(TRAIT_CHANCE + 0.04);
    const odds = PACK_ODDS.uncommon;
    for (const m of ['bronze', 'silver', 'gold'] as const) {
      expect(metals[m] / n).toBeGreaterThan(odds[m] / 100 - 0.05);
      expect(metals[m] / n).toBeLessThan(odds[m] / 100 + 0.05);
    }
    expect(PACK_TIERS).toEqual(['common', 'uncommon', 'rare', 'legendary']);
  });
});

describe('applying a pack', () => {
  /** A seed whose round-1 pack for the human is a given kind of card. */
  function findPack(kind: 'equipment' | 'upgrade' | 'facility' | 'trait', target?: string): SeasonFacts {
    for (let seed = 100; seed < 2000; seed++) {
      const facts = scripted(seed, 5, [1]);
      const p = dealPack(facts, 0, facts.setup.humans[0].teamId)!;
      if (p.cards[0].kind === kind && (!target || p.cards[0].target === target)) return facts;
    }
    throw new Error(`no seed deals ${kind}`);
  }
  const app = (facts: SeasonFacts, over: Partial<PackApplication> = {}): PackApplication => {
    const p = pendingPack(facts)!;
    return { type: 'pack', round: p.round, teamId: p.teamId, tier: p.tier, cardId: p.cards[0].id, dealt: p.cards.map(c => c.id), target: { kind: 'team' }, ...over };
  };

  it('equipment goes on one of your drivers (bench included); the wrong holder, card or team is refused', () => {
    const facts = findPack('equipment');
    const human = facts.setup.humans[0].teamId;
    const roster = draftState(poolFor(facts), facts.draftPicks).rosters;
    const pack = pendingPack(facts)!;
    expect(pack.teamId).toBe(human);
    expect(validatePackApplication(facts, app(facts, { target: { kind: 'car' } }))).toMatch(/does not fit/);
    expect(validatePackApplication(facts, app(facts, { target: { kind: 'driver', id: 999 } }))).toMatch(/not on this team/);
    const other = poolFor(facts).teams.find(t => t.id !== human)!.id;
    expect(validatePackApplication(facts, app(facts, { target: { kind: 'driver', id: roster[other].driverIds[0] } }))).toMatch(/not on this team/);
    expect(validatePackApplication(facts, app(facts, { cardId: 'eq-iridium-speed+acceleration+aggression' }))).toMatch(/not in the pack/);
    expect(validatePackApplication(facts, app(facts, { tier: 'legendary' }))).toMatch(/the pack is/);
    expect(validatePackApplication(facts, app(facts, { teamId: other }))).toMatch(/clock/);
    expect(validatePackApplication(facts, app(facts, { replaces: 'eq-bronze-speed', target: { kind: 'driver', id: roster[human].driverIds[1] } }))).toMatch(/nothing to replace/);
    const bench = roster[human].driverIds[1];
    const next = applyPack(facts, app(facts, { target: { kind: 'driver', id: bench } }));
    expect(teamCardState(next, human).drivers[bench].equipment.map(c => c.id)).toEqual([pack.cards[0].id]);
    expect(validatePackApplication(next, app(facts, { target: { kind: 'driver', id: bench } }))).toMatch(/already open/);
    expect(pendingPack(next)).toBeNull();
  });

  it('a trait lands on its own target type and never on the wrong one', () => {
    const facts = findPack('trait', 'car');
    expect(validatePackApplication(facts, app(facts, { target: { kind: 'team' } }))).toMatch(/car trait/);
    const next = applyPack(facts, app(facts, { target: { kind: 'car' } }));
    expect(teamCardState(next, facts.setup.humans[0].teamId).car.traits).toHaveLength(1);
  });

  it('a facility lifts both racers; the card is in the race from this round on', () => {
    const facts = findPack('facility');
    const human = facts.setup.humans[0].teamId;
    const pack = pendingPack(facts)!;
    const before = leagueForRound(facts, 0).roster.filter(d => d.kingdomId === human);
    const next = applyPack(facts, app(facts, { target: { kind: 'team' } }));
    const after = leagueForRound(next, 0).roster.filter(d => d.kingdomId === human);
    expect(after).toHaveLength(2);
    for (const stat of pack.cards[0].stats) {
      const key = stat.stat as 'tireManagement' | 'pitCrew';
      // #335: grade points on the 1–5 star scale: +pct × 4 / 100 stars.
      for (let i = 0; i < 2; i++) expect(after[i].teamStats![key]).toBeCloseTo(before[i].teamStats![key] + (stat.pct * 4) / 100, 10);
    }
    // Rivals untouched.
    const rival = leagueForRound(next, 0).roster.find(d => d.kingdomId !== human)!;
    expect(rival).toEqual(leagueForRound(facts, 0).roster.find(d => d.id === rival.id));
  });
});

describe('slots and the locker', () => {
  /** A human whose round-1 pack is an upgrade, with another upgrade already in the car's slot via a seeded earlier pack. */
  function twoUpgrades(): { facts: SeasonFacts; human: string } {
    for (let seed = 300; seed < 4000; seed++) {
      const facts = scripted(seed, 5, [1]);
      const human = facts.setup.humans[0].teamId;
      const first = dealPack(facts, 0, human)!;
      if (first.cards[0].kind !== 'upgrade') continue;
      const played = playRound(facts); // the helper puts the first upgrade in the car's slot
      const second = dealPack(played, 1, human)!;
      if (second.cards[0].kind === 'upgrade' && second.cards[0].id !== first.cards[0].id) return { facts: played, human };
    }
    throw new Error('no seed');
  }

  it('gear into a full slot needs `replaces`; the old card lands in the locker; moves round-trip', () => {
    const { facts, human } = twoUpgrades();
    const pack = pendingPack(facts)!;
    const inSlot = teamCardState(facts, human).car.upgrade[0];
    const base: PackApplication = { type: 'pack', round: 1, teamId: human, tier: pack.tier, cardId: pack.cards[0].id, dealt: pack.cards.map(c => c.id), target: { kind: 'car' } };
    expect(validatePackApplication(facts, base)).toMatch(/full/);
    const notInSlot = inSlot.id === 'up-bronze-grip' ? 'up-bronze-power' : 'up-bronze-grip';
    expect(validatePackApplication(facts, { ...base, replaces: notInSlot })).toMatch(/not there/);
    let f = applyPack(facts, { ...base, replaces: inSlot.id });
    let s = teamCardState(f, human);
    expect(s.car.upgrade.map(c => c.id)).toEqual([pack.cards[0].id]);
    expect(s.locker.map(c => c.id)).toEqual([inSlot.id]);
    // The race uses the new one, not the old one.
    const withNew = leagueForRound(f, 1).roster.find(d => d.kingdomId === human)!.carStats;
    const withOld = leagueForRound({ ...f, cardFacts: f.cardFacts.filter(x => x.round !== 1) }, 1).roster.find(d => d.kingdomId === human)!.carStats;
    expect(withNew).not.toEqual(withOld);
    // Unequip to the locker, then equip the old one from the locker: a round trip.
    expect(validateGearMove(f, { type: 'move', round: 1, teamId: human, cardId: inSlot.id, to: { kind: 'car' } })).toMatch(/full/);
    expect(validateGearMove(f, { type: 'move', round: 1, teamId: human, cardId: inSlot.id, to: 'locker' })).toMatch(/already in the locker/);
    expect(validateGearMove(f, { type: 'move', round: 1, teamId: human, cardId: inSlot.id, to: { kind: 'team' } })).toMatch(/does not fit/);
    expect(validateGearMove(f, { type: 'move', round: 1, teamId: human, cardId: 'tr-car-bronze-grip', to: 'locker' })).toMatch(/traits never move/);
    f = moveGear(f, { type: 'move', round: 1, teamId: human, cardId: pack.cards[0].id, to: 'locker' });
    s = teamCardState(f, human);
    expect(s.car.upgrade).toEqual([]);
    expect(s.locker.map(c => c.id)).toEqual([inSlot.id, pack.cards[0].id]);
    f = moveGear(f, { type: 'move', round: 1, teamId: human, cardId: inSlot.id, to: { kind: 'car' } });
    s = teamCardState(f, human);
    expect(s.car.upgrade.map(c => c.id)).toEqual([inSlot.id]);
    expect(s.locker.map(c => c.id)).toEqual([pack.cards[0].id]);
    // The locker is uncapped; nothing is ever lost.
    const all = [...s.car.upgrade, ...s.locker].map(c => c.id).sort();
    expect(all).toEqual([inSlot.id, pack.cards[0].id].sort());
    // Only on your turn, in the current round.
    expect(validateGearMove(f, { type: 'move', round: 0, teamId: human, cardId: pack.cards[0].id, to: { kind: 'car' } })).toMatch(/round/);
    const other = poolFor(f).teams.find(t => t.id !== human)!.id;
    expect(validateGearMove(f, { type: 'move', round: 1, teamId: other, cardId: pack.cards[0].id, to: { kind: 'car' } })).toMatch(/clock/);
  });

  it('equipment moves between your two drivers (#585: no bench)', () => {
    for (let seed = 500; seed < 4000; seed++) {
      const facts = scripted(seed, 5, [0]);
      const human = facts.setup.humans[0].teamId;
      const p = dealPack(facts, 0, human)!;
      if (p.cards[0].kind !== 'equipment') continue;
      const ids = draftState(poolFor(facts), facts.draftPicks).rosters[human].driverIds;
      let f = applyPack(facts, { type: 'pack', round: 0, teamId: human, tier: p.tier, cardId: p.cards[0].id, dealt: p.cards.map(c => c.id), target: { kind: 'driver', id: ids[0] } });
      f = moveGear(f, { type: 'move', round: 0, teamId: human, cardId: p.cards[0].id, to: { kind: 'driver', id: ids[1] } });
      const s = teamCardState(f, human);
      expect(s.drivers[ids[0]].equipment).toEqual([]);
      expect(s.drivers[ids[1]].equipment.map(c => c.id)).toEqual([p.cards[0].id]);
      expect(validateGearMove(f, { type: 'move', round: 0, teamId: human, cardId: p.cards[0].id, to: { kind: 'driver', id: ids[1] } })).toMatch(/already there/);
      // Both drivers race (#585): the gear races with them.
      const grid = leagueForRound(f, 0).roster.filter(d => d.kingdomId === human).map(d => d.id);
      expect(grid.sort()).toEqual([...ids].sort());
      return;
    }
    throw new Error('no seed');
  });
});

describe('the whole season', () => {
  it('with packs every round, replays identically and survives save → load', () => {
    const play = (seed: number) => { let f = scripted(seed, 10, [0]); while (seasonState(f).phase !== 'finished') f = playRound(f); return f; };
    const a = play(77), b = play(77);
    expect(a).toEqual(b);
    expect(a.cardFacts.filter(f => f.type === 'pack')).toHaveLength(CALENDAR.length);
    for (const h of a.setup.humans) {
      const s = teamCardState(a, h.teamId);
      const held = Object.values(s.drivers).flatMap(d => [...d.traits, ...d.equipment]).length + s.car.traits.length + s.car.upgrade.length + s.team.traits.length + s.team.facility.length + s.locker.length;
      expect(held).toBe(CALENDAR.length);
    }
    const store = memoryStore();
    const mid = playRound(scripted(77, 10, [0]));
    saveSeason(mid, store);
    const loaded = loadSeason(store)!;
    expect(loaded).toEqual(mid);
    let x = loaded, y = mid;
    while (seasonState(x).phase !== 'finished') { x = playRound(x); y = playRound(y); }
    expect(x).toEqual(y);
    expect(x.results.map(d => d.finishOrder)).toEqual(a.results.map(d => d.finishOrder));
    // Cards change the races: a season with every pack binned differs from one where they were worn.
    const bare = { ...a, cardFacts: [] };
    expect(leagueForRound(bare, 2).roster.map(d => d.stats)).not.toEqual(leagueForRound(a, 2).roster.map(d => d.stats));
    expect(CARDS_BY_ID.size).toBe(94);
  });
});

describe('keep 1 of 3 (#533)', () => {
  it('a pack deals three distinct cards of its tier; card one is the pre-#533 card', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const facts = scripted(seed, 8);
      const human = facts.setup.humans[0].teamId;
      const p = dealPack(facts, 0, human)!;
      expect(p.cards).toHaveLength(3);
      expect(new Set(p.cards.map(c => c.id)).size).toBe(3);
      for (const c of p.cards) expect(c.kind).not.toBe('effect');
      expect(dealPack(facts, 0, human)).toEqual(p); // seeded
    }
  });

  it('you keep any one of the three; the fact records all three and which was kept', () => {
    const facts = scripted(11, 8);
    const human = facts.setup.humans[0].teamId;
    const roster = draftState(poolFor(facts), facts.draftPicks).rosters[human];
    const p = pendingPack(facts)!;
    const holderFor = (c: { kind: string; target: string }) => (c.target === 'driver' ? { kind: 'driver' as const, id: roster.driverIds[0] } : { kind: c.target as 'car' | 'team' });
    const dealt = p.cards.map(c => c.id);
    for (const kept of p.cards) {
      const fact: PackApplication = { type: 'pack', round: 0, teamId: human, tier: p.tier, cardId: kept.id, dealt, target: holderFor(kept) };
      const next = applyPack(facts, fact);
      expect(next.cardFacts.at(-1)).toEqual(fact);
      expect(pendingPack(next)).toBeNull();
    }
    const fact: PackApplication = { type: 'pack', round: 0, teamId: human, tier: p.tier, cardId: p.cards[1].id, dealt, target: holderFor(p.cards[1]) };
    expect(validatePackApplication(facts, { ...fact, dealt: undefined })).toMatch(/record all three/);
    expect(validatePackApplication(facts, { ...fact, dealt: [...dealt].reverse() })).toMatch(/record all three/);
  });

  it('a saved season with a kept card replays exactly', () => {
    let facts = scripted(12, 8);
    const human = facts.setup.humans[0].teamId;
    const roster = draftState(poolFor(facts), facts.draftPicks).rosters[human];
    const p = pendingPack(facts)!;
    const kept = p.cards[2];
    const target = kept.target === 'driver' ? { kind: 'driver' as const, id: roster.driverIds[0] } : { kind: kept.target };
    facts = applyPack(facts, { type: 'pack', round: 0, teamId: human, tier: p.tier, cardId: kept.id, dealt: p.cards.map(c => c.id), target });
    const store = memoryStore();
    saveSeason(facts, store);
    const loaded = loadSeason(store)!;
    expect(loaded).toEqual(facts);
    expect(teamCardState(loaded, human)).toEqual(teamCardState(facts, human));
  });

  it('a pre-#533 fact (one card, no dealt list) still replays', () => {
    const facts = scripted(13, 8);
    const human = facts.setup.humans[0].teamId;
    const roster = draftState(poolFor(facts), facts.draftPicks).rosters[human];
    const old = dealPack(facts, 0, human)!.cards[0];
    const target = old.target === 'driver' ? { kind: 'driver' as const, id: roster.driverIds[0] } : { kind: old.target };
    const legacy = { ...facts, cardFacts: [{ type: 'pack' as const, round: 0, teamId: human, tier: 'uncommon' as const, cardId: old.id, target }] };
    expect(() => teamCardState(legacy, human)).not.toThrow();
  });
});

describe('duplicate cards (#556)', () => {
  it('two copies of the same gear: each moves on its own when the move names where it comes from', () => {
    // Build a team with one copy equipped on the car and one in the locker, via plain facts.
    let facts = scripted(21, 8);
    const human = facts.setup.humans[0].teamId;
    const up = 'up-bronze-power';
    const pack0 = pendingPack(facts)!;
    const dealt = pack0.cards.map(c => c.id);
    // Use raw facts (the deal check is a validation concern; the fold is what this tests).
    facts = { ...facts, cardFacts: [
      { type: 'pack', round: 0, teamId: human, tier: pack0.tier, cardId: up, dealt, target: { kind: 'car' } },
      { type: 'move', round: 0, teamId: human, cardId: up, to: 'locker' },
      { type: 'pack', round: 0, teamId: human, tier: pack0.tier, cardId: up, dealt, target: { kind: 'car' } },
    ] };
    let s = teamCardState(facts, human);
    expect(s.locker.map(c => c.id)).toEqual([up]);
    expect(s.car.upgrade.map(c => c.id)).toEqual([up]);
    // Unequip the car's copy: without `from` the locker copy would be found first.
    const unequip = { type: 'move' as const, round: 0, teamId: human, cardId: up, from: { kind: 'car' as const }, to: 'locker' as const };
    s = teamCardState({ ...facts, cardFacts: [...facts.cardFacts, unequip] }, human);
    expect(s.locker.map(c => c.id)).toEqual([up, up]);
    expect(s.car.upgrade).toEqual([]);
    // Naming a place the card isn't is refused.
    const wrong = { ...unequip, from: { kind: 'team' as const } };
    expect(() => teamCardState({ ...facts, cardFacts: [...facts.cardFacts, wrong] }, human)).toThrow();
  });
});
