// Dev-only browser console for the league engine (PRs 1–4 have no UI yet —
// this is how you poke them before the PR 6 screens exist). Loaded from
// main.tsx behind import.meta.env.DEV, so it never ships in a build.
//
// Open the browser console and type `league.help()`.

import { createLeague, rosterStateAt } from './league';
import { settleLeague, nextRaceAt, isSeasonOver } from './settle';
import { LeagueState } from './types';
import {
  saveLeagueState,
  loadLeagueState,
  clearLeagueState,
} from '../storage/persistence';
import { getSeasonStandings } from '../types/season';
import { TEAMS } from '../data/teams';
import { CURRENT_TRACKS, getTrackById } from '../generators/tracks';
import { DRIVER_TAGS } from '../data/tags';
import { randomSeed } from '../engine/rng';

const MINUTE = 60_000;

let current: LeagueState | null = loadLeagueState();

function save(league: LeagueState) {
  current = league;
  saveLeagueState(league);
}

function need(): LeagueState {
  if (!current) throw new Error('No league. Run league.found() first.');
  return current;
}

function driverName(league: LeagueState, id: number): string {
  return league.roster.find(d => d.id === id)?.fullName ?? `#${id}`;
}

function printDigest(league: LeagueState, index: number) {
  const d = league.digests.find(x => x.index === index);
  if (!d) {
    console.log(`Race ${index + 1} hasn't run yet.`);
    return;
  }
  const podium = d.finishOrder.slice(0, 3).map((id, i) =>
    `${['🥇', '🥈', '🥉'][i]} ${driverName(league, id)}`
  ).join('  ');
  console.log(`\n${d.trackEmoji} Race ${d.index + 1} — ${d.trackName}`);
  console.log(podium);
  if (d.dnfDriverIds.length > 0) {
    console.log(`💀 DNF: ${d.dnfDriverIds.map(id => driverName(league, id)).join(', ')}`);
  }
  for (const ev of d.highlights) {
    console.log(`  ${ev.emoji} ${ev.description}`);
  }
}

function settleAndReport(league: LeagueState, now: number) {
  const { league: after, newlySettled } = settleLeague(league, { now });
  if (newlySettled.length === 0) {
    const next = nextRaceAt(after);
    if (next === null) {
      console.log('🏁 Season complete. league.standings() for the final table.');
    } else {
      const mins = Math.ceil((next - Date.now()) / MINUTE);
      console.log(`Nothing due. Next race in ~${mins} min — or league.timeTravel(${Math.max(1, mins)}) to skip ahead.`);
    }
    return;
  }
  save(after);
  console.log(`⏱ Settled ${newlySettled.length} race(s) while you were away:`);
  for (const d of newlySettled) printDigest(after, d.index);
  if (isSeasonOver(after)) {
    console.log('\n🏁 That was the finale. league.standings() for the final table.');
  }
}

export const leagueConsole = {
  help() {
    console.log(`
🏛 Commissioner Mode dev console — the league engine, pre-UI

  league.found({ seed?, races?, everyMinutes? })
      Found a league. One seed births drivers, cars, and calendar.
      Defaults: random seed, 8 races, one every 2 minutes (real time!).
  league.checkIn()
      Settle everything due right now. Found a league, go make coffee,
      come back and check in — that's the ant farm.
  league.timeTravel(minutes)
      Impatient? Pretend that much wall-clock time has passed.
  league.standings()      Championship table.
  league.schedule()       The calendar: what runs when.
  league.digest(n)        Replay race n's highlights (1-based).
  league.roster()         The grid this universe birthed.
  league.curse(driverId, tagId?)
      Intervene: attach a tag to a driver from the next race onward.
      Past races provably cannot change. Omit tagId to list options.
  league.reset()          Burn it down.

State persists in localStorage — reload the page and check in again.`);
  },

  found(opts: { seed?: number; races?: number; everyMinutes?: number } = {}) {
    const seed = opts.seed ?? randomSeed();
    const races = Math.min(opts.races ?? 8, CURRENT_TRACKS.length);
    const league = createLeague(seed, {
      name: `Dev League ${seed}`,
      godId: 'the-scrap-heap',
      teamIds: TEAMS.map(t => t.id),
      trackIds: CURRENT_TRACKS.slice(0, races).map(t => t.id),
      raceIntervalMs: (opts.everyMinutes ?? 2) * MINUTE,
      createdAt: Date.now(),
    });
    save(league);
    console.log(`🏛 League founded. Seed ${seed} — same seed, same universe, always.`);
    console.log(`${league.roster.length} drivers, ${races} races, one every ${opts.everyMinutes ?? 2} min.`);
    this.schedule();
    console.log('\nFirst race hasn\'t run yet. Wait for it, or league.timeTravel() ahead.');
  },

  checkIn() {
    settleAndReport(need(), Date.now());
  },

  timeTravel(minutes: number) {
    settleAndReport(need(), Date.now() + minutes * MINUTE);
  },

  standings() {
    const league = need();
    console.table(getSeasonStandings(league.season).map((s, i) => ({
      P: i + 1,
      Driver: driverName(league, s.driverId),
      Pts: s.points,
      Wins: s.wins,
      Podiums: s.podiums,
      DNFs: s.dnfs,
    })));
  },

  schedule() {
    const league = need();
    console.table(league.schedule.map(r => ({
      Race: r.index + 1,
      Track: getTrackById(r.trackId)?.name ?? r.trackId,
      When: new Date(r.scheduledAt).toLocaleTimeString(),
      Status: r.index <= league.settledThrough ? '✅ settled' : '⏳ scheduled',
    })));
  },

  digest(raceNumber: number) {
    printDigest(need(), raceNumber - 1);
  },

  roster() {
    const league = need();
    console.table(league.roster.map(d => ({
      Id: d.id,
      Driver: d.fullName,
      Team: d.kingdomId,
      Car: d.carName,
      Tag: d.driverTag?.name ?? '—',
    })));
  },

  curse(driverId: number, tagId?: string) {
    const league = need();
    if (!tagId) {
      console.log('Pick a tag:');
      console.table(DRIVER_TAGS.map(t => ({ id: t.id, name: t.name, description: t.description })));
      return;
    }
    const nextRace = league.settledThrough + 1;
    if (nextRace >= league.schedule.length) {
      console.log('Season is over — nothing left to curse.');
      return;
    }
    save({
      ...league,
      interventionLog: [...league.interventionLog, {
        type: 'attach-tag',
        atRaceIndex: nextRace,
        targetDriverId: driverId,
        tagId,
        committedAt: Date.now(),
      }],
    });
    const name = driverName(league, driverId);
    console.log(`⚡ ${name} carries '${tagId}' from race ${nextRace + 1} onward. History is untouched — and untouchable.`);
    console.log(`Proof: rosterStateAt applies only interventions at/before each race index.`);
    console.table(rosterStateAt(current!, nextRace)
      .filter(d => d.id === driverId)
      .map(d => ({ Driver: d.fullName, Tag: d.driverTag?.name ?? '—' })));
  },

  reset() {
    clearLeagueState();
    current = null;
    console.log('League consumed by a shifting universe.');
  },
};

declare global {
  interface Window {
    league: typeof leagueConsole;
  }
}

export function installLeagueConsole() {
  window.league = leagueConsole;
  if (current) {
    console.log(`🏛 Saved league found (seed ${current.leagueSeed}, settled through race ${current.settledThrough + 1}/${current.schedule.length}). Try league.checkIn() — races may have run while you were gone.`);
  } else {
    console.log('🏛 Commissioner Mode dev console loaded. Type league.help()');
  }
}
