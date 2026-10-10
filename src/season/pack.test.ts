// #316: card packs + the team locker.
import { describe, it, expect } from 'vitest';
import {
  dealPack, packOffer, packTierForRank, packTierFor, applyPack, applyCurse, moveGear, teamCardState, pendingPack, pendingOffer, validatePackApplication, validateCurse, validateGearMove, gearLeft,
  PACK_ODDS, PACK_TIERS, TRAIT_CHANCE, FIRST_PACK_TIER, PLAYER_CARD_SCALE, GEAR_STRENGTH, GEAR_LIFE, OFFER_ODDS, CURSE_LIFE, playerCard, type PackApplication, type PackKind,
} from './pack';
import { activeEffects } from './effects';
import { newSeason, seasonState, setLineup, settleRound, constructorStandings, leagueForRound, poolFor, saveSeason, loadSeason, type SeasonFacts, type SeasonStore } from './season';
import { quickDraft, draftOrder, draftState } from './draft';
import { openPack } from './testHelpers';
import { CARDS_BY_ID, RUN_CARDS_BY_ID, RUN_CURSES, RUN_DECK, cardById } from '../cards';
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
    for (const h of facts.setup.humans) expect(packOffer(facts, 0, h.teamId)!.tier).toBe('uncommon');
    // After a round, the pack tier is the quarter of the standing before the next round.
    const played = playRound(facts);
    const standings = constructorStandings(played);
    for (const h of played.setup.humans) {
      const rank = standings.find(s => s.teamId === h.teamId)!.rank;
      expect(packTierFor(played, 1, h.teamId)).toBe(packTierForRank(rank, 10));
    }
    // Replaying the round-1 deal later, with more results on the facts, gives the same tier.
    const later = playRound(played);
    for (const h of later.setup.humans) expect(packOffer(later, 1, h.teamId)).toEqual(packOffer(played, 1, h.teamId));
  });

  it('same seed + standings → same offer and cards; CPU teams get none', () => {
    const a = scripted(5, 8, [2]), b = scripted(5, 8, [2]);
    const human = a.setup.humans[0].teamId;
    const offer = packOffer(a, 0, human)!;
    expect(offer).toEqual(packOffer(b, 0, human));
    for (const k of offer.packs) {
      const p = dealPack(a, 0, human, k)!;
      expect(p).toEqual(dealPack(b, 0, human, k));
      expect(p.cards.every(c => c.kind !== 'effect' && c.target === k)).toBe(true);
    }
    // A pack not on offer deals nothing.
    const off = (['driver', 'car', 'team'] as PackKind[]).find(k => !offer.packs.includes(k))!;
    expect(dealPack(a, 0, human, off)).toBeNull();
    const cpu = poolFor(a).teams.find(t => t.id !== human)!.id;
    expect(packOffer(a, 0, cpu)).toBeNull();
    expect(dealPack(a, 0, cpu, 'driver')).toBeNull();
  });

  it('the offer (#627): about 60% pick 1 of 2, 30% one pack, 10% a forced curse; a choice is two different places', () => {
    const kinds: Record<string, number> = { choice: 0, single: 0, curse: 0 };
    let n = 0;
    for (let seed = 0; seed < 150; seed++) {
      const facts = scripted(seed, 10, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const t of poolFor(facts).teams) {
        const o = packOffer(facts, 0, t.id)!;
        n++; kinds[o.kind]++;
        if (o.kind === 'choice') { expect(o.packs).toHaveLength(2); expect(o.packs[0]).not.toBe(o.packs[1]); }
        if (o.kind === 'single') expect(o.packs).toHaveLength(1);
        if (o.kind === 'curse') { expect(o.packs).toEqual([]); expect(o.curse).toBeTruthy(); }
      }
    }
    for (const k of ['choice', 'single', 'curse'] as const) {
      expect(kinds[k] / n).toBeGreaterThan(OFFER_ODDS[k] / 100 - 0.04);
      expect(kinds[k] / n).toBeLessThan(OFFER_ODDS[k] / 100 + 0.04);
    }
  });

  it('deals a trait about 1 in 4, gear otherwise, with the metal odds of the tier, from the run deck as written (gear 2×)', () => {
    let traits = 0, n = 0;
    const metals: Record<string, number> = {};
    for (let seed = 0; seed < 150; seed++) {
      const facts = scripted(seed, 10, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const t of poolFor(facts).teams) {
        const o = packOffer(facts, 0, t.id)!;
        if (o.kind === 'curse') continue;
        const p = dealPack(facts, 0, t.id, o.packs[0])!;
        n++;
        if (p.cards[0].kind === 'trait') traits++;
        metals[p.cards[0].rarity!] = (metals[p.cards[0].rarity!] ?? 0) + 1;
        expect(['trait', 'equipment', 'upgrade', 'facility']).toContain(p.cards[0].kind);
        for (const c of p.cards) {
          const base = RUN_CARDS_BY_ID.get(c.id)!;
          expect(base.deck).toBe('run');
          const k = c.kind === 'trait' ? 1 : GEAR_STRENGTH;
          expect(c.stats.map(s => s.pct)).toEqual(base.stats.map(s => s.pct * k));
        }
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
  /** A seed whose round-1 FIRST pack for the human leads with a given kind of card. */
  function findPack(kind: 'equipment' | 'upgrade' | 'facility' | 'trait', target?: string): SeasonFacts {
    for (let seed = 100; seed < 3000; seed++) {
      const facts = scripted(seed, 5, [1]);
      const p = pendingPack(facts);
      if (p && p.cards[0].kind === kind && (!target || p.cards[0].target === target)) return facts;
    }
    throw new Error(`no seed deals ${kind}`);
  }
  const app = (facts: SeasonFacts, over: Partial<PackApplication> = {}): PackApplication => {
    const p = pendingPack(facts)!;
    return { type: 'pack', round: p.round, teamId: p.teamId, tier: p.tier, pack: p.kind, cardId: p.cards[0].id, dealt: p.cards.map(c => c.id), target: { kind: 'team' }, ...over };
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
    expect(validatePackApplication(facts, app(facts, { pack: undefined }))).toMatch(/name the pack/);
    const notOffered = (['driver', 'car', 'team'] as PackKind[]).find(k => !pendingOffer(facts)!.packs.includes(k));
    if (notOffered) expect(validatePackApplication(facts, app(facts, { pack: notOffered }))).toMatch(/the offer is/);
    expect(validatePackApplication(facts, app(facts, { teamId: other }))).toMatch(/clock/);
    expect(validatePackApplication(facts, app(facts, { replaces: 'eq-bronze-speed', target: { kind: 'driver', id: roster[human].driverIds[1] } }))).toMatch(/nothing to replace/);
    const bench = roster[human].driverIds[1];
    const next = applyPack(facts, app(facts, { target: { kind: 'driver', id: bench } }));
    expect(teamCardState(next, human).drivers[bench].equipment.map(c => c.id)).toEqual([pack.cards[0].id]);
    expect(validatePackApplication(next, app(facts, { target: { kind: 'driver', id: bench } }))).toMatch(/already open/);
    expect(pendingPack(next)).toBeNull();
    expect(pendingOffer(next)).toBeNull();
  });

  it('the forced Curse pack (#647): one of the eight named curses on the car or team, both drivers, one race; nothing else to open', () => {
    for (let seed = 100; seed < 3000; seed++) {
      const facts = scripted(seed, 5, [1]);
      const offer = pendingOffer(facts);
      if (!offer || offer.kind !== 'curse') continue;
      const human = facts.setup.humans[0].teamId;
      expect(pendingPack(facts)).toBeNull();
      expect(validatePackApplication(facts, { type: 'pack', round: 0, teamId: human, tier: offer.tier, pack: 'driver', cardId: 'eq-bronze-speed', dealt: [], target: { kind: 'team' } })).toMatch(/Curse pack/);
      expect(validateCurse(facts, { type: 'curse', round: 0, teamId: human, effectId: 'nope' })).toMatch(/the curse is/);
      const c = offer.curse!;
      expect(c.source).toBe('curse');
      expect(['car', 'team']).toContain(c.target.kind);
      const named = RUN_CURSES.find(x => x.name === c.name)!;
      expect(named).toBeTruthy();
      expect(c.target.kind).toBe(named.target);
      expect(c.stats).toEqual(named.stats);
      expect(c.stats.every(s => s.pct < 0)).toBe(true);
      expect(CURSE_LIFE).toBe(1);
      expect(c.timer).toEqual({ races: CURSE_LIFE });
      const next = applyCurse(facts, { type: 'curse', round: 0, teamId: human, effectId: c.id });
      expect(pendingOffer(next)).toBeNull();
      expect(activeEffects(next, human, 0).map(e => [e.id, e.left])).toEqual([[c.id, CURSE_LIFE]]);
      expect(activeEffects(next, human, CURSE_LIFE)).toEqual([]);
      // Both drivers carry it in the race; the rest of the grid does not.
      const before = leagueForRound(facts, 0).roster, after = leagueForRound(next, 0).roster;
      for (const d of after) {
        const was = before.find(x => x.id === d.id)!;
        if (d.kingdomId !== human) { expect(d).toEqual(was); continue; }
        const block = c.target.kind === 'car' ? [d.carStats!, was.carStats!] : [d.teamStats!, was.teamStats!];
        for (const s of c.stats) {
          // grade points on the 1–5 star scale: pct × 4 / 100 stars
          expect((block[0] as unknown as Record<string, number>)[s.stat]).toBeCloseTo((block[1] as unknown as Record<string, number>)[s.stat] + (s.pct * 4) / 100, 10);
        }
        expect(d.effects!.some(e => e.id === c.id && e.left === '1 race left')).toBe(true);
      }
      // Gone the next race.
      expect(leagueForRound({ ...next, results: [], lineups: [] }, 1).roster.filter(d => d.kingdomId === human).every(d => !d.effects?.some(e => e.id === c.id))).toBe(true);
      expect(() => applyCurse(next, { type: 'curse', round: 0, teamId: human, effectId: c.id })).toThrow(/already open/);
      return;
    }
    throw new Error('no seed offers a curse');
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
      // #335: grade points on the 1–5 star scale: +pct × 4 / 100 stars; the dealt card already carries gear's 2× on the run deck's written points.
      expect(stat.pct).toBe(RUN_CARDS_BY_ID.get(pack.cards[0].id)!.stats.find(s => s.stat === key)!.pct * GEAR_STRENGTH);
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
      const first = pendingPack(facts);
      if (!first || first.cards[0].kind !== 'upgrade') continue;
      const played = playRound(facts); // the helper puts the first upgrade in the car's slot
      const second = pendingPack(played);
      if (second && second.cards[0].kind === 'upgrade' && second.cards[0].id !== first.cards[0].id) return { facts: played, human };
    }
    throw new Error('no seed');
  }

  it('gear into a full slot needs `replaces`; the old card lands in the locker; moves round-trip', () => {
    const { facts, human } = twoUpgrades();
    const pack = pendingPack(facts)!;
    const inSlot = teamCardState(facts, human).car.upgrade[0];
    const base: PackApplication = { type: 'pack', round: 1, teamId: human, tier: pack.tier, pack: pack.kind, cardId: pack.cards[0].id, dealt: pack.cards.map(c => c.id), target: { kind: 'car' } };
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
      const p = pendingPack(facts);
      if (!p || p.cards[0].kind !== 'equipment') continue;
      const ids = draftState(poolFor(facts), facts.draftPicks).rosters[human].driverIds;
      let f = applyPack(facts, { type: 'pack', round: 0, teamId: human, tier: p.tier, pack: p.kind, cardId: p.cards[0].id, dealt: p.cards.map(c => c.id), target: { kind: 'driver', id: ids[0] } });
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
    expect(a.cardFacts.filter(f => f.type === 'pack' || f.type === 'curse')).toHaveLength(CALENDAR.length);
    for (const h of a.setup.humans) {
      const s = teamCardState(a, h.teamId);
      const held = Object.values(s.drivers).flatMap(d => [...d.traits, ...d.equipment]).length + s.car.traits.length + s.car.upgrade.length + s.team.traits.length + s.team.facility.length + s.locker.length;
      // After three rounds the round-0 gear is worn out (GEAR_LIFE); traits stay; curses hold no card.
      const kept = a.cardFacts.filter(f => f.type === 'pack' && (cardById(f.cardId)!.kind === 'trait' || gearLeft(f.round, CALENDAR.length) > 0));
      expect(held).toBe(kept.length);
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
    expect(RUN_DECK).toHaveLength(60);
    // A grid-deck card the player holds (old saves) is still × 3, gear × 6; a run-deck card is as written.
    expect(playerCard(CARDS_BY_ID.get('eq-bronze-speed')!).stats[0].pct).toBe(5 * PLAYER_CARD_SCALE * GEAR_STRENGTH);
    expect(playerCard(CARDS_BY_ID.get('tr-driver-bronze-speed')!).stats[0].pct).toBe(5 * PLAYER_CARD_SCALE);
    expect(playerCard(RUN_CARDS_BY_ID.get('rd-hothead')!).stats[0].pct).toBe(15);
    expect(playerCard(RUN_CARDS_BY_ID.get('rd-lightweight-helmet')!).stats[0].pct).toBe(15 * GEAR_STRENGTH);
  });
});

describe('keep 1 of 3 (#533)', () => {
  it('a pack deals three distinct cards of its tier and place', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7]) {
      const facts = scripted(seed, 8);
      const human = facts.setup.humans[0].teamId;
      const offer = packOffer(facts, 0, human)!;
      for (const k of offer.packs) {
        const p = dealPack(facts, 0, human, k)!;
        expect(p.cards).toHaveLength(3);
        expect(new Set(p.cards.map(c => c.id)).size).toBe(3);
        for (const c of p.cards) { expect(c.kind).not.toBe('effect'); expect(c.target).toBe(k); }
        expect(dealPack(facts, 0, human, k)).toEqual(p); // seeded
      }
    }
  });

  it('you keep any one of the three; the fact records the pack, all three and which was kept', () => {
    const facts = [11, 12, 13, 14, 15, 16].map(s => scripted(s, 8)).find(f => pendingPack(f))!;
    const human = facts.setup.humans[0].teamId;
    const roster = draftState(poolFor(facts), facts.draftPicks).rosters[human];
    const p = pendingPack(facts)!;
    const holderFor = (c: { kind: string; target: string }) => (c.target === 'driver' ? { kind: 'driver' as const, id: roster.driverIds[0] } : { kind: c.target as 'car' | 'team' });
    const dealt = p.cards.map(c => c.id);
    for (const kept of p.cards) {
      const fact: PackApplication = { type: 'pack', round: 0, teamId: human, tier: p.tier, pack: p.kind, cardId: kept.id, dealt, target: holderFor(kept) };
      const next = applyPack(facts, fact);
      expect(next.cardFacts.at(-1)).toEqual(fact);
      expect(pendingPack(next)).toBeNull();
    }
    const fact: PackApplication = { type: 'pack', round: 0, teamId: human, tier: p.tier, pack: p.kind, cardId: p.cards[1].id, dealt, target: holderFor(p.cards[1]) };
    expect(validatePackApplication(facts, { ...fact, dealt: undefined })).toMatch(/record all three/);
    expect(validatePackApplication(facts, { ...fact, dealt: [...dealt].reverse() })).toMatch(/record all three/);
  });

  it('a saved season with a kept card replays exactly', () => {
    let facts = [12, 13, 14, 15, 16, 17].map(s => scripted(s, 8)).find(f => pendingPack(f))!;
    const human = facts.setup.humans[0].teamId;
    const roster = draftState(poolFor(facts), facts.draftPicks).rosters[human];
    const p = pendingPack(facts)!;
    const kept = p.cards[2];
    const target = kept.target === 'driver' ? { kind: 'driver' as const, id: roster.driverIds[0] } : { kind: kept.target };
    facts = applyPack(facts, { type: 'pack', round: 0, teamId: human, tier: p.tier, pack: p.kind, cardId: kept.id, dealt: p.cards.map(c => c.id), target });
    const store = memoryStore();
    saveSeason(facts, store);
    const loaded = loadSeason(store)!;
    expect(loaded).toEqual(facts);
    expect(teamCardState(loaded, human)).toEqual(teamCardState(facts, human));
  });

  it('a pre-#533 fact (one card, no dealt list, no pack) still replays', () => {
    const facts = scripted(13, 8);
    const human = facts.setup.humans[0].teamId;
    const roster = draftState(poolFor(facts), facts.draftPicks).rosters[human];
    const old = CARDS_BY_ID.get('eq-bronze-speed')!;
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
    const dealt = [up, 'up-bronze-grip', 'up-bronze-reliability'];
    // Use raw facts (the deal check is a validation concern; the fold is what this tests).
    facts = { ...facts, cardFacts: [
      { type: 'pack', round: 0, teamId: human, tier: 'uncommon', pack: 'car', cardId: up, dealt, target: { kind: 'car' } },
      { type: 'move', round: 0, teamId: human, cardId: up, to: 'locker' },
      { type: 'pack', round: 0, teamId: human, tier: 'uncommon', pack: 'car', cardId: up, dealt, target: { kind: 'car' } },
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

describe('gear mileage (#627)', () => {
  it('gear is gone after GEAR_LIFE races wherever it sits; traits stay; moves of worn gear are skipped; replays and carries', () => {
    const facts = scripted(21, 8);
    const human = facts.setup.humans[0].teamId;
    const ids = draftState(poolFor(facts), facts.draftPicks).rosters[human].driverIds;
    const eq = 'eq-silver-speed', up = 'up-bronze-grip', tr = 'tr-car-bronze-grip';
    // Raw facts: a round-0 equipment on driver 1, moved to the locker; a round-1 upgrade on the car; a round-1 car trait.
    const f: SeasonFacts = { ...facts, cardFacts: [
      { type: 'pack', round: 0, teamId: human, tier: 'uncommon', pack: 'driver', cardId: eq, dealt: [eq, 'eq-bronze-luck', 'eq-bronze-speed'], target: { kind: 'driver', id: ids[0] } },
      { type: 'move', round: 0, teamId: human, cardId: eq, to: 'locker' },
      { type: 'pack', round: 1, teamId: human, tier: 'uncommon', pack: 'car', cardId: up, dealt: [up, 'up-bronze-power', 'up-bronze-reliability'], target: { kind: 'car' } },
      { type: 'pack', round: 2, teamId: human, tier: 'uncommon', pack: 'car', cardId: tr, dealt: [tr, 'tr-car-bronze-power', 'tr-car-bronze-reliability'], target: { kind: 'car' } },
      // A move of the equipment back onto a driver, after it has worn out (round 3): skipped silently.
      { type: 'move', round: 3, teamId: human, cardId: eq, to: { kind: 'driver', id: ids[1] } },
    ] };
    const at = (round: number) => teamCardState(f, human, round);
    expect(at(0).locker.map(c => c.id)).toEqual([eq]);
    expect(at(0).mileage).toEqual({ [eq]: GEAR_LIFE });
    expect(at(2).locker.map(c => c.id)).toEqual([eq]);
    expect(at(2).car.upgrade.map(c => c.id)).toEqual([up]);
    expect(at(2).mileage).toEqual({ [eq]: 1, [up]: 2 });
    expect(gearLeft(0, 3)).toBe(0);
    // Round 3: the equipment is worn out; the upgrade has 1 left; the trait is for good.
    expect(at(3).locker).toEqual([]);
    expect(at(3).car.upgrade.map(c => c.id)).toEqual([up]);
    expect(at(3).car.traits.map(c => c.id)).toEqual([tr]);
    expect(at(3).mileage).toEqual({ [up]: 1 });
    expect(at(4).car.upgrade).toEqual([]);
    expect(at(4).mileage).toEqual({});
    // The sim reads the same: the car's grip gains the upgrade's grade points in round 2, not in round 4 (same lineup, no results needed).
    const grip = (round: number) => leagueForRound({ ...f, lineups: [] }, round).roster.find(d => d.kingdomId === human)!.carStats!.grip;
    const base = poolFor(f).cars.find(c => c.id === draftState(poolFor(f), f.draftPicks).rosters[human].carId)!.stats.grip;
    // Grid-deck ids (old saves): held at the player's 3×, gear × 2 again.
    const upPts = cardById(up)!.stats[0].pct * PLAYER_CARD_SCALE * GEAR_STRENGTH;
    const trPts = cardById(tr)!.stats[0].pct * PLAYER_CARD_SCALE;
    expect(grip(2)).toBeCloseTo(base + ((upPts + trPts) * 4) / 100, 10);
    expect(grip(4)).toBeCloseTo(base + (trPts * 4) / 100, 10);
    // Gear infos ride on the roster for display.
    const infos = leagueForRound({ ...f, lineups: [] }, 2).roster.find(d => d.kingdomId === human)!.effects!;
    expect(infos.some(e => e.id === up && e.left === '2 races left' && e.source === 'gear')).toBe(true);
  });
});
