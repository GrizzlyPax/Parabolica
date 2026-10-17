// The Interval (#751; Radio's lines in docs/story/voice.md, Steward's odds on
// the issue): a rare Watcher broadcast after a big moment. One roll per race
// at lights out, on its own stream (never the race's); if it hits, it fires
// once, right after the first listed moment in the race's second half (the
// Hundred's moment is lights out itself). Never at Locals. The caller never
// mentions it. Presentation only: the digests are the same with or without it.
import { deriveSeed, mulberry32 } from '../engine/rng';
import type { Step } from '../look/step';
import type { FeedItem } from './commentary';

/** The odds per race (Steward, Oct 15): a normal race · the step's last race · the Hundred. */
export const INTERVAL_ODDS = {
  locals: { race: 0, last: 0 },
  state: { race: 0.08, last: 0.25 },
  nationals: { race: 0.25, last: 0.5, hundred: 0.4 },
} as const;

export type IntervalMoment = 'title' | 'fastestLap' | 'lastLapLead' | 'rain' | 'lightsOutNationals' | 'pileup' | 'quickStop' | 'lastRace';

/** Radio's ten, verbatim; `follows` says which moment each can come after (no. 3 follows any). */
export const INTERVAL_LINES: readonly { no: number; line: string; follows: readonly IntervalMoment[] | 'any' }[] = [
  { no: 1, line: 'We are enjoying the season very much. Congratulations, {state}. Carry on.', follows: ['title'] },
  { no: 2, line: 'Good afternoon. That was a very good lap. Thank you. That is all.', follows: ['fastestLap'] },
  { no: 3, line: 'We have been listening since 1908. Lap {lap} is our favourite so far.', follows: 'any' },
  { no: 4, line: 'A short message for {driver}: well driven. You need not reply.', follows: ['lastLapLead'] },
  { no: 5, line: 'It is raining at {track}. We did not do that. We do like it, though.', follows: ['rain'] },
  { no: 6, line: 'They tell us the cars are no faster this year. Good. We like them as they are.', follows: ['lightsOutNationals'] },
  { no: 7, line: 'Everyone is all right. We checked. Please continue.', follows: ['pileup'] },
  { no: 8, line: 'Hello again, America. The grandstands look very full. Good.', follows: ['lightsOutNationals'] },
  { no: 9, line: 'To the crew of {driver}: that was very quick. We counted. Thank you.', follows: ['quickStop'] },
  { no: 10, line: 'Every quarrel this week was settled fairly, on a circuit. We are proud of you all. Carry on.', follows: ['lastRace'] },
];

export const INTERVAL_BEFORE = 'The coverage stops. A short tune.';
export const INTERVAL_AFTER = 'The tune again. The coverage resumes.';

export interface IntervalRace {
  step?: Step;
  /** The step's last race (the title race). */
  last: boolean;
  /** The Hundred (lap cuts): its moment is lights out. */
  hundred: boolean;
}

/** The roll at lights out: does this race get an Interval? Its own stream off the race seed. */
export function intervalArmed(raceSeed: number, race: IntervalRace): boolean {
  const odds = race.step === 'state' ? (race.last ? INTERVAL_ODDS.state.last : INTERVAL_ODDS.state.race)
    : race.step === 'nationals' ? (race.hundred ? INTERVAL_ODDS.nationals.hundred : race.last ? INTERVAL_ODDS.nationals.last : INTERVAL_ODDS.nationals.race)
    : 0;
  if (odds <= 0) return false;
  return mulberry32(deriveSeed(raceSeed, 'interval'))() < odds;
}

export interface IntervalVars { lap: number; state?: string; driver?: string; track?: string }

/** The line for a moment: those that can follow it (no. 3 always can) whose placeholders are known, picked on the race's own stream. */
export function intervalLine(raceSeed: number, moment: IntervalMoment, vars: IntervalVars): string {
  const can = INTERVAL_LINES.filter(l => (l.follows === 'any' || l.follows.includes(moment)));
  const filled = can.map(l => fill(l.line, vars)).filter((s): s is string => s !== null);
  const i = Math.floor(mulberry32(deriveSeed(raceSeed, 'interval', 'line'))() * filled.length);
  return filled[i] ?? fill(INTERVAL_LINES[2].line, vars) ?? INTERVAL_LINES[2].line;
}

function fill(line: string, vars: IntervalVars): string | null {
  let ok = true;
  const out = line.replace(/\{(\w+)\}/g, (_, k: string) => { const v = vars[k as keyof IntervalVars]; if (v === undefined || v === '') ok = false; return String(v ?? ''); });
  return ok ? out : null;
}

/** The feed item: its own persona, framed by the tune. */
export function intervalItem(raceSeed: number, moment: IntervalMoment, vars: IntervalVars): Omit<FeedItem, 'id'> {
  return {
    lap: vars.lap, persona: 'interval', personaName: 'The Interval', personaEmoji: 'voice.interval',
    text: intervalLine(raceSeed, moment, vars), emphasis: 'normal', frame: { before: INTERVAL_BEFORE, after: INTERVAL_AFTER },
  };
}

/** The race's Interval as a little machine: armed at lights out, fired at most once, only in the second half (the Hundred: from lights out). */
export interface IntervalState { armed: boolean; fired: boolean; hundred: boolean }

export function intervalStart(raceSeed: number, race: IntervalRace): IntervalState {
  return { armed: intervalArmed(raceSeed, race), fired: false, hundred: race.hundred };
}

/** A moment happened on `lap` of `totalLaps`: the item to show, if this is the one. */
export function intervalNext(state: IntervalState, raceSeed: number, moment: IntervalMoment, vars: IntervalVars & { totalLaps: number }): { state: IntervalState; item?: Omit<FeedItem, 'id'> } {
  if (!state.armed || state.fired) return { state };
  const halfway = vars.lap >= Math.ceil(vars.totalLaps / 2);
  if (!(state.hundred && moment === 'lightsOutNationals') && !halfway) return { state };
  return { state: { ...state, fired: true }, item: intervalItem(raceSeed, moment, vars) };
}
