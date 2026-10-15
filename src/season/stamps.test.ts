// #704: stamps and Parcels. A Parcel is derived (seed + standings), its
// three stamps distinct and never a copy of one held; gifts are gold at
// least and never at Locals; a smudge is a one-race curse. The fold puts a
// stamp on the right card, scrapes one off a full card only when told which,
// and the title stamps read in the race build outside the slots.
import { describe, it, expect } from 'vitest';
import { newSeason, poolFor, leagueForRound, seasonState, setLineup, turnDone, type SeasonFacts } from './season';
import { quickDraft, draftState } from './draft';
import { CURRENT_TRACKS } from '../generators/tracks';
import {
  parcelFor, pendingParcel, openParcel, teamStamps, seasonCardsFor, carriedStamps, titleStamp, stampById, parcelTierForRank, isInk, inkLeft,
  STAMP_SLOTS, PARCEL_SIZE, GIFT_ODDS, SMUDGE_ODDS, GEAR_LIFE, GEAR_STRENGTH, TITLE_STAMP_LEVELS, PARCEL_METAL, type ParcelFact, type StampHolder,
} from './stamps';
import { RUN_DECK, applyCards } from '../cards';
import { POINTS_PER_LEVEL } from './grades';
import { activeEffects } from './effects';
import { openParcelQuick } from './testHelpers';
import type { Step } from '../look/step';
import { carriedTeam } from '../run/run';
import type { CarriedCards } from './genesis';

/** The same season with your team carried in wearing `cards` (redrafted, as a run step is). */
function withCarry(facts: SeasonFacts, cards: CarriedCards): SeasonFacts {
  const carry = { ...carriedTeam(facts), cards };
  // The next step up: fresh ids start a stride higher, so the carried team's don't collide (as a run promotes).
  const next: SeasonFacts = { ...facts, setup: { ...facts.setup, carry, league: { ...facts.setup.league!, index: facts.setup.league!.index + 1 } } };
  return { ...next, draftPicks: quickDraft(poolFor(next)) };
}

function paddock(seed: number, step: Step = 'state'): { facts: SeasonFacts; you: string; drivers: number[] } {
  const probe = newSeason({ seed, teamCount: 5, humans: [], calendar: CURRENT_TRACKS.slice(0, 3).map(t => t.id), league: { index: 1, step, name: 'State', fieldShift: 0, nemesisShift: 0, bossRound: 2 } });
  const you = poolFor(probe).teams[0].id;
  let facts = newSeason({ seed, teamCount: 5, humans: [{ teamId: you, name: 'You', color: '#123456' }], calendar: CURRENT_TRACKS.slice(0, 3).map(t => t.id), league: { index: 1, step, name: 'State', fieldShift: 0, nemesisShift: 0, bossRound: 2 } });
  facts = { ...facts, draftPicks: quickDraft(poolFor(facts)) };
  return { facts, you, drivers: draftState(poolFor(facts), facts.draftPicks).rosters[you].driverIds };
}
const fact = (facts: SeasonFacts, you: string, cardId: string | null, holder?: StampHolder, replaces?: string): ParcelFact => {
  const p = parcelFor(facts, 0, you)!;
  return { type: 'parcel', round: 0, teamId: you, tier: p.tier, gift: p.kind === 'gift' || undefined, dealt: p.cards.map(c => c.id), cardId, holder, replaces };
};

describe('the Parcel', () => {
  it('is derived: three distinct run-deck stamps, the same twice, Uncommon in round 1, by table position after', () => {
    const { facts, you } = paddock(1);
    const p = parcelFor(facts, 0, you)!;
    expect(p).toEqual(parcelFor(facts, 0, you));
    expect(p.tier).toBe('uncommon');
    expect(p.cards.length).toBe(PARCEL_SIZE);
    expect(new Set(p.cards.map(c => c.id)).size).toBe(PARCEL_SIZE);
    // Every stamp is a run-deck card at the player's scale: ink (gear) at × GEAR_STRENGTH, traits as written.
    for (const c of p.cards) {
      const raw = RUN_DECK.find(r => r.id === c.id)!;
      expect(c.stats.map(x => x.pct)).toEqual(raw.stats.map(x => x.pct * (isInk(c) ? GEAR_STRENGTH : 1)));
    }
    expect(parcelFor(facts, 0, poolFor(facts).teams[1].id)).toBeNull(); // rivals get none
    expect([1, 2, 3, 4, 5].map(r => parcelTierForRank(r, 5))).toEqual(['common', 'common', 'uncommon', 'rare', 'legendary']);
  });

  it('one in ten is a Watcher gift at State (the legendary odds), one in ten smudged (three stamps plus a one-race curse); no gifts at Locals, more at Nationals', () => {
    const { facts, you } = paddock(2);
    const kinds = { plain: 0, gift: 0, smudged: 0 };
    for (let round = 0; round < 400; round++) {
      const p = parcelFor({ ...facts, setup: { ...facts.setup, seed: 1000 + round } }, 0, you)!;
      kinds[p.kind]++;
      expect(p.cards).toHaveLength(PARCEL_SIZE);
      if (p.kind === 'smudged') expect(p.smudge).toMatchObject({ source: 'curse', timer: { races: 1 }, round: 0, teamId: you });
      else expect(p.smudge).toBeUndefined();
    }
    expect(kinds.gift / 400).toBeGreaterThan(GIFT_ODDS.state! / 100 - 0.05);
    expect(kinds.gift / 400).toBeLessThan(GIFT_ODDS.state! / 100 + 0.05);
    expect(kinds.smudged / 400).toBeGreaterThan(SMUDGE_ODDS / 100 - 0.05);
    expect(kinds.smudged / 400).toBeLessThan(SMUDGE_ODDS / 100 + 0.05);
    expect(PARCEL_METAL.legendary.gold + PARCEL_METAL.legendary.iridium).toBeGreaterThan(PARCEL_METAL.uncommon.gold + PARCEL_METAL.uncommon.iridium);
    const locals = paddock(2, 'locals');
    for (let round = 0; round < 200; round++) expect(parcelFor({ ...locals.facts, setup: { ...locals.facts.setup, seed: 1000 + round } }, 0, locals.you)!.kind).not.toBe('gift');
    expect(GIFT_ODDS.nationals).toBeGreaterThan(GIFT_ODDS.state!);
  });

  it('never deals a copy of a stamp the team holds', () => {
    const { facts, you, drivers } = paddock(3);
    let held: string[] = [];
    let f = facts;
    for (let i = 0; i < 6; i++) {
      const seeded = { ...f, setup: { ...f.setup, seed: 50 + i } };
      const p = parcelFor(seeded, 0, you)!;
      if (p.kind === 'smudged') continue;
      for (const c of p.cards) expect(held).not.toContain(c.id);
      held = [...held, p.cards[0].id];
      f = withCarry(facts, { drivers: { [drivers[0]]: held.filter(id => stampById(id)!.target === 'driver') }, car: held.filter(id => stampById(id)!.target !== 'driver'), titles: {} });
    }
  });
});

describe('stamps on the cards', () => {
  it('a stamp goes on its card for good; the car card takes car and garage stamps; the turn waits for the Parcel', () => {
    const { facts, you, drivers } = paddock(4);
    const p = parcelFor(facts, 0, you)!;
    if (p.kind === 'smudged') return;
    const c = p.cards[0];
    const holder: StampHolder = c.target === 'driver' ? { kind: 'driver', id: drivers[0] } : { kind: 'car' };
    const wrong: StampHolder = c.target === 'driver' ? { kind: 'car' } : { kind: 'driver', id: drivers[0] };
    expect(() => openParcel(facts, fact(facts, you, c.id, wrong))).toThrow(/does not go on/);
    expect(() => openParcel(facts, fact(facts, you, 'rd-nope', holder))).toThrow(/not in the Parcel/);
    expect(() => openParcel(facts, fact(facts, you, c.id))).toThrow(/where the stamp goes/);
    const next = openParcel(facts, fact(facts, you, c.id, holder));
    const s = teamStamps(next, you);
    expect((holder.kind === 'driver' ? s.drivers[drivers[0]] : s.car).map(x => x.id)).toEqual([c.id]);
    expect(() => openParcel(next, fact(next, you, c.id, holder))).toThrow(/already open/);
    expect(turnDone(next, 0, you)).toBe(false);
    const lined = setLineup(next, { round: 0, teamId: you, driverIds: [drivers[0], drivers[1]] });
    expect(turnDone(lined, 0, you)).toBe(true);
    expect(seasonState(lined).phase).toBe('ready-for-go');
    // The race build reads it where it applies.
    const cards = seasonCardsFor(next, 0);
    if (c.target === 'driver') expect(cards.driver![drivers[0]].map(x => x.id)).toEqual([c.id]);
    else if (c.target === 'car') expect(Object.values(cards.car!)[0].map(x => x.id)).toEqual([c.id]);
    else expect(cards.team![you].map(x => x.id)).toEqual([c.id]);
  });

  it('a box left shut keeps nothing; a full card scrapes a named stamp off, never silently', () => {
    const { facts, you, drivers } = paddock(5);
    const p = parcelFor(facts, 0, you)!;
    if (p.kind === 'smudged') return;
    expect(() => openParcel(facts, fact(facts, you, null, { kind: 'car' }))).toThrow(/left in the box/);
    const shut = openParcel(facts, fact(facts, you, null));
    expect(teamStamps(shut, you)).toEqual(teamStamps(facts, you));
    // Four driver stamps carried in: the fifth needs a scrape.
    const driverStamps = RUN_DECK.filter(c => c.target === 'driver').slice(0, STAMP_SLOTS.driver).map(c => c.id);
    const full = withCarry(facts, { drivers: { [drivers[0]]: driverStamps }, car: [], titles: {} });
    const incoming = parcelFor(full, 0, you)!;
    if (incoming.kind === 'smudged') return;
    const c = incoming.cards.find(x => x.target === 'driver');
    if (!c) return;
    const on = (replaces?: string): ParcelFact => ({ ...fact(full, you, c.id, { kind: 'driver', id: drivers[0] }, replaces), dealt: incoming.cards.map(x => x.id), tier: incoming.tier, gift: incoming.kind === 'gift' || undefined });
    expect(() => openParcel(full, on())).toThrow(/full; name the stamp/);
    expect(() => openParcel(full, on('rd-nope'))).toThrow(/not on that card/);
    const scraped = openParcel(full, on(driverStamps[1]));
    expect(teamStamps(scraped, you).drivers[drivers[0]].map(x => x.id)).toEqual([driverStamps[0], driverStamps[2], driverStamps[3], c.id]);
    expect(() => openParcel(facts, { ...fact(facts, you, p.cards[0].id, p.cards[0].target === 'driver' ? { kind: 'driver', id: drivers[0] } : { kind: 'car' }, 'rd-x') })).toThrow(/nothing to scrape/);
  });

  it('a smudged Parcel still deals three; its curse lands for one race whatever you keep, even the box left shut', () => {
    for (let seed = 10; seed < 400; seed++) {
      const { facts, you } = paddock(seed);
      const p = parcelFor(facts, 0, you)!;
      if (p.kind !== 'smudged') continue;
      const shut = openParcel(facts, fact(facts, you, null));
      expect(activeEffects(shut, you, 0).map(e => [e.id, e.left])).toEqual([[p.smudge!.id, 1]]);
      expect(activeEffects(shut, you, 1)).toEqual([]);
      expect(pendingParcel(shut)).toBeNull();
      expect(teamStamps(shut, you)).toEqual(teamStamps(facts, you));
      return;
    }
    throw new Error('no smudged seed');
  });

  it('ink fades after GEAR_LIFE races and frees its slot; a permanent stamp stays; a scraped stamp never returns', () => {
    const { facts, you, drivers } = paddock(8);
    const ink = RUN_DECK.filter(c => c.target === 'driver' && c.kind === 'equipment').slice(0, STAMP_SLOTS.driver).map(c => c.id);
    const trait = RUN_DECK.find(c => c.target === 'driver' && c.kind === 'trait')!.id;
    // Four ink stamps dealt in round 0 (gearDealt 0): live through round 2, gone in round 3.
    const inked = withCarry(facts, { drivers: { [drivers[0]]: ink }, car: [], titles: {}, gearDealt: Object.fromEntries(ink.map(id => [id, 0])) });
    expect(teamStamps(inked, you, 2).drivers[drivers[0]].map(c => c.id)).toEqual(ink);
    expect(teamStamps(inked, you, 2).mileage[ink[0]]).toBe(1);
    expect(teamStamps(inked, you, 3).drivers[drivers[0]]).toEqual([]);
    expect(inkLeft(0, GEAR_LIFE)).toBe(0);
    // A permanent stamp carried with no deal round never fades; the card is full, so a new stamp scrapes one off, and that one is gone for good.
    const mixed = withCarry(facts, { drivers: { [drivers[0]]: [trait, ...ink.slice(0, 3)] }, car: [], titles: {}, gearDealt: Object.fromEntries(ink.slice(0, 3).map(id => [id, -1])) });
    expect(teamStamps(mixed, you, 9).drivers[drivers[0]].map(c => c.id)).toEqual([trait]);
    const incoming = parcelFor(mixed, 0, you)!;
    const c = incoming.cards.find(x => x.target === 'driver');
    if (!c) return;
    const on = (replaces?: string): ParcelFact => ({ ...fact(mixed, you, c.id, { kind: 'driver', id: drivers[0] }, replaces), dealt: incoming.cards.map(x => x.id), tier: incoming.tier, gift: incoming.kind === 'gift' || undefined });
    expect(() => openParcel(mixed, on())).toThrow(/full; name the stamp/);
    const scraped = openParcel(mixed, on(trait));
    const held = teamStamps(scraped, you).drivers[drivers[0]].map(x => x.id);
    expect(held).not.toContain(trait);
    expect(held).toContain(c.id);
    expect(teamStamps(scraped, you, 9).drivers[drivers[0]].map(x => x.id)).toEqual(isInk(c) ? [] : [c.id]);
  });

  it('a title stamp is +6 levels on its stat, outside the slots, and reads in the race build', () => {
    const { facts, you, drivers } = paddock(6);
    const t = titleStamp('locals', 'aggression');
    expect(t.stats).toEqual([{ stat: 'aggression', pct: TITLE_STAMP_LEVELS * POINTS_PER_LEVEL }]);
    expect(stampById(t.id)).toEqual(t);
    const driverStamps = RUN_DECK.filter(c => c.target === 'driver').slice(0, STAMP_SLOTS.driver).map(c => c.id);
    const titled = withCarry(facts, { drivers: { [drivers[0]]: driverStamps }, car: [], titles: { [drivers[0]]: [t.id] } });
    const carry = titled.setup.carry!;
    const s = teamStamps(titled, you);
    expect(s.drivers[drivers[0]]).toHaveLength(STAMP_SLOTS.driver);
    expect(s.titles[drivers[0]].map(c => c.id)).toEqual([t.id]);
    expect(carriedStamps(s).titles).toEqual({ [drivers[0]]: [t.id], [drivers[1]]: [] });
    const d = poolFor(titled).drivers.find(x => x.id === drivers[0])!;
    const built = leagueForRound(titled, 0).roster.find(r => r.id === drivers[0])!;
    const plain = leagueForRound({ ...titled, setup: { ...titled.setup, carry: { ...carry, cards: { ...carry.cards, titles: {} } } } }, 0).roster.find(r => r.id === drivers[0])!;
    expect(built.stats.aggression).toBeCloseTo(applyCards({ driver: plain.stats, car: built.carStats!, team: built.teamStats! }, [t]).driver!.aggression, 6);
    expect(built.stats.aggression).toBeGreaterThan(d.stats.aggression);
  });

  it('the quick path plays a season through its Parcels', () => {
    const { facts, drivers, you } = paddock(7);
    let f = facts;
    while (seasonState(f).phase === 'paddock') f = openParcelQuick(setLineup(f, { round: seasonState(f).round, teamId: you, driverIds: [drivers[0], drivers[1]] }));
    expect(seasonState(f).phase).toBe('ready-for-go');
    expect(f.cardFacts).toHaveLength(1);
  });
});
