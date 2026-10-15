// Who's who for the race feed's callers (#749, docs/story/voice.md →
// Placeholders): your town and garage, and per driver their car's identifier
// ({no}), home town (State: each garage is its town's Ace) and home state
// (Nationals: the state code on the car, #725). Display only.
import type { FeedVoice } from '../feed/commentary';
import { placeById } from '../data/states';
import { raceBadges } from './badges';
import { draftState } from './draft';
import { poolFor, type SeasonFacts } from './season';

export function feedVoiceFor(facts: SeasonFacts): FeedVoice {
  const pool = poolFor(facts);
  const rosters = draftState(pool, facts.draftPicks).rosters;
  const locale = facts.setup.league?.locale;
  const you = facts.setup.humans[0];
  const badges = raceBadges(facts);
  const cars: NonNullable<FeedVoice['cars']> = {};
  for (const t of pool.teams) {
    const town = t.id === you?.teamId ? locale?.town : t.town;
    for (const id of rosters[t.id]?.driverIds ?? []) {
      const code = badges[id];
      const state = /^[A-Z]{2}$/.test(code ?? '') ? placeById(code)?.name : undefined;
      cars[id] = { no: code, town, state };
    }
  }
  return { town: locale?.town, garage: you?.name, cars };
}
