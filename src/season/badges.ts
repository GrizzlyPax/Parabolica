// Tier identifiers (#725): what a car wears on its nose, by step. Labels
// only, never a race input (the engine's number is display only).
// - Locals: plain entry numbers 1..N, one per car, in grid order.
// - State: a three-letter town code per garage (both cars share it): the
//   town's first three letters; on a clash, the first letter and the next two
//   consonants, then the next free letters. Toledo → TOL.
// - Nationals: the state's postal code plus the car's slot, OH1 / OH2 (#694:
//   100 cars break the 2–99 racing numbers). Every garage is a state's Ace
//   (`locale.rivals` seats them), yours is your state.
// - Quick Race (which wears the Nationals look): the state's two-letter code,
//   shared by both cars; its teams have no state, so each is dealt a distinct
//   one on the race seed.
import { US_PLACES, placeById } from '../data/states';
import { deriveSeed, mulberry32, shuffle } from '../engine/rng';
import { draftState } from './draft';
import { poolFor, type SeasonFacts } from './season';

const letters = (town: string) => town.toUpperCase().replace(/[^A-Z]/g, '');
const CONSONANT = /[BCDFGHJKLMNPQRSTVWXZ]/;

/** Candidate codes for a town, best first. */
function codeCandidates(town: string): string[] {
  const l = letters(town).padEnd(3, 'X');
  const out = [l.slice(0, 3)];
  const cons = [...l.slice(1)].filter(c => CONSONANT.test(c));
  if (cons.length >= 2) out.push(l[0] + cons[0] + cons[1]);
  for (let i = 1; i < l.length; i++) for (let j = i + 1; j < l.length; j++) out.push(l[0] + l[i] + l[j]);
  return out;
}

/** Three-letter codes for towns, unique within the list, in the list's order. */
export function townCodes(towns: readonly string[]): string[] {
  const taken = new Set<string>();
  return towns.map(t => {
    const code = codeCandidates(t).find(c => !taken.has(c)) ?? codeCandidates(t)[0];
    taken.add(code);
    return code;
  });
}

/** Every drafted driver's identifier in a league, by driver id. */
export function raceBadges(facts: SeasonFacts): Record<number, string> {
  const pool = poolFor(facts);
  const rosters = draftState(pool, facts.draftPicks).rosters;
  const league = facts.setup.league;
  const you = facts.setup.humans[0]?.teamId;
  const teams = pool.teams.filter(t => rosters[t.id]?.driverIds.length);
  const out: Record<number, string> = {};
  const each = (teamId: string, f: (driverId: number, i: number) => string) => rosters[teamId].driverIds.forEach((id, i) => { out[id] = f(id, i); });

  if (league?.step === 'locals') {
    let n = 0;
    for (const t of teams) each(t.id, () => String(++n));
    return out;
  }
  if (league?.step === 'state' && league.locale) {
    const towns = teams.map(t => (t.id === you ? league.locale!.town : t.town ?? t.name));
    const codes = townCodes(towns);
    teams.forEach((t, i) => each(t.id, () => codes[i]));
    return out;
  }
  // Nationals (#694): each garage is a state's Ace; its cars wear the state code plus 1 / 2.
  const mine = league?.locale ? placeById(league.locale.stateId)?.abbr : undefined;
  if (league?.step === 'nationals' && league.locale?.rivals) {
    const seats = league.locale.rivals;
    let k = 0;
    for (const t of teams) {
      const code = t.id === you ? mine : placeById(seats[k++]?.stateId ?? '')?.abbr;
      each(t.id, (_, i) => `${code ?? '??'}${i + 1}`);
    }
    return out;
  }
  // Anything without a step (Quick Race): state codes. Yours is your state; the rest are dealt.
  const dealt = shuffle(US_PLACES.map(p => p.abbr).filter(a => a !== mine), mulberry32(deriveSeed(facts.setup.seed, 'badges', 'states')));
  let k = 0;
  for (const t of teams) {
    const code = t.id === you && mine ? mine : dealt[k++ % dealt.length];
    each(t.id, () => code);
  }
  return out;
}
