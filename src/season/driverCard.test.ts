// #476: the driver card's data. Yours: levels (the Paddock's sums), cards,
// story. Rivals: who they are; levels sealed.
import { raceBadges } from './badges';
import { describe, it, expect } from 'vitest';
import { newSeason, poolFor } from './season';
import { quickDraft, draftState } from './draft';
import { defaultSetup } from './setup';
import { driverCardOf, DRIVER_CARD_STATS, titlesOf } from './driverCard';
import { titleStamp } from './stamps';
import { currentLeague } from '../run/run';
import { testRun } from '../run/testHelpers';
import { readStat } from './grades';

describe('driver card (#476)', () => {
  const facts = (() => { const f = newSeason(defaultSetup(4242)); return { ...f, draftPicks: quickDraft(poolFor(f)) }; })();
  const pool = poolFor(facts);
  const rosters = draftState(pool, facts.draftPicks).rosters;
  const you = facts.setup.humans[0].teamId;
  const mine = rosters[you].driverIds[0];
  const rivalTeam = Object.keys(rosters).find(t => t !== you)!;
  const rival = rosters[rivalTeam].driverIds[0];

  it('your driver: name, number, face, levels, cards, backstory and quirk', () => {
    const c = driverCardOf(facts, mine)!;
    const d = pool.drivers.find(x => x.id === mine)!;
    expect(c).toMatchObject({ name: d.fullName, number: raceBadges(facts)[d.id], sealed: false, backstory: d.backstory, quirk: d.quirk });
    expect(c.portrait).toBeTruthy();
    expect(c.readings!.map(r => r.stat)).toEqual(DRIVER_CARD_STATS);
    // Same sum as the Paddock: the roll plus every card held.
    const s = c.readings![0];
    expect(s.total).toBeCloseTo(readStat(s.stat, d.stats[s.stat as keyof typeof d.stats], c.cards).total);
  });

  it('a rival: who they are, levels sealed', () => {
    const c = driverCardOf(facts, rival)!;
    expect(c.sealed).toBe(true);
    expect(c.readings).toBeUndefined();
    expect(c.backstory).toBeTruthy();
    expect(driverCardOf(facts, -1)).toBeNull();
  });
});

describe('title ribbons on the driver card (#699)', () => {
  it('one ribbon per step won, oldest first, named for the place, with the Postmark struck on it', () => {
    const facts = currentLeague(testRun(5, 'oh'));
    const town = facts.setup.league!.locale!.town;
    const t = titlesOf(facts, [titleStamp('state', 'aggression'), titleStamp('locals', 'baseSpeed'), titleStamp('state', 'acceleration')]);
    expect(t.map(x => x.step)).toEqual(['locals', 'state']);
    expect(t[0]).toMatchObject({ name: `Ace ${town}`, postmark: `${town} Postmark · +6 Speed` });
    expect(t[1]).toMatchObject({ name: 'Ace Ohio', stateId: 'oh' });
    expect(t[1].postmark).toMatch(/^Ohio Postmark · \+6 Aggression, \+6 Acc/);
    expect(titlesOf(facts, [])).toEqual([]);
  });
});
