// === RACE FEED COMMENTARY ENGINE ===
// Pure functions that turn race notifications into persona-voiced feed
// lines. No React, no engine imports — testable.
//
// The caller is a role, picked by the race's step (#749, docs/story/voice.md,
// Pax Oct 14): The PA at Locals, {State} Radio at State, The Network at
// Nationals. Quick Race and the lab speak as The Network. They replace The
// Booth and The Track. Mister Marbles' bet lines stay below (betting is
// retired; the NPC crowd may want them).

import type { RaceNotification } from '../WatchMode';
import type { Step } from '../look/step';

export type Caller = 'pa' | 'radio' | 'network';
export type FeedPersona = Caller | 'marbles';

export interface FeedItem {
  id: number;
  lap: number;
  persona: FeedPersona;
  personaName: string;
  /** An icon meaning ('voice.pa'). */
  personaEmoji: string;
  text: string;
  emphasis: 'normal' | 'big';
  color?: string;
  drivers?: Array<{ id: number; name: string; emoji: string }>;
}

/** What the callers know about the people in the race (built from the run's facts). */
export interface FeedVoice {
  /** Your town (Locals' {town}; Nationals' {town}). */
  town?: string;
  /** Your garage's name ({garage}). */
  garage?: string;
  /** Per driver id: the car's identifier ({no}), their home town (State) and home state (Nationals). */
  cars?: Record<number, { no?: string | number; town?: string; state?: string }>;
}

export interface FeedContext {
  lap: number;
  totalLaps: number;
  trackName: string;
  trackEmoji?: string;
  /** The race's step; absent = The Network (Quick Race, the lab). */
  step?: Step;
  /** The state raced for at State (the caller's name, {state}). */
  stateName?: string;
  voice?: FeedVoice;
}

// Deterministic template pick: stable per event, varied across events
function pick<T>(pool: readonly T[], seed: number): T {
  return pool[Math.abs(seed) % pool.length];
}

function hashSeed(n: RaceNotification): number {
  let h = n.tick;
  for (const ch of n.type) h = (h * 31 + ch.charCodeAt(0)) | 0;
  h = (h * 31 + (n.drivers?.[0]?.id ?? 0)) | 0;
  return h;
}

// ---------------------------------------------------------------------------
// THE CALLERS — Radio's pools, verbatim (docs/story/voice.md)
// ---------------------------------------------------------------------------

export type Moment =
  | 'lightsOut' | 'overtake' | 'leadChange' | 'quickPit' | 'slowPit' | 'fastestLap' | 'halfway'
  | 'crash' | 'pileup' | 'blowout' | 'mechanical' | 'rain' | 'finalLap' | 'finish' | 'title';

type Pools = Record<Moment, readonly string[]>;

const PA: Pools = {
  lightsOut: ['And they\'re off! Folks along the fence, mind your elbows.', 'There goes the flag. Somebody tell Gus he can stop waving it now.', 'Away they go! Hot dogs are a nickel at the stand by the gate.'],
  overtake: ['{driver} goes by {driver2}. Nice and tidy.', 'Ooh, {driver} sneaks past {driver2} on the inside!', 'Number {no} is through. {driver2} didn\'t care for that.'],
  leadChange: ['{driver} leads now, folks! Leads!', 'New leader: {driver}. Write that on your program.', '{driver} out front! Didn\'t see that coming, and I\'ve got the best seat in the house.'],
  quickPit: ['Quick stop for {driver}. Those boys have been practising behind the barn.', '{driver} in and out, faster than the ticket line.'],
  slowPit: ['Slow one for {driver}. Somebody\'s dropped the wheel nut in the hay.', '{driver} still sitting in the pits. Take your time, fellas. We\'re not going anywhere.'],
  fastestLap: ['Quickest lap of the day to {driver}. Somebody check that stopwatch.', '{driver} with the fastest one yet. Stopwatch says so, and the stopwatch don\'t lie.'],
  halfway: ['Halfway, folks. Lap {lap} of {laps}. Pie judging right after.', 'Uh, number {no} is still going, folks. Hot dogs are a nickel.', 'That\'s halfway. If you\'re parked by the cattle barn, you\'re fine.'],
  crash: ['{driver}\'s into the hay bales. They\'re waving. They\'re fine.', 'Uh oh, {driver} is off into the fence. Nobody hurt but the fence.'],
  pileup: ['Oh, that\'s a pile of \'em. Everybody\'s up and out. Tow truck to turn two, please.', 'Three cars in a heap at the far turn. All fine, all embarrassed.'],
  blowout: ['{driver} has lost a tire. If it rolled into your picnic, please bring it back.', 'Tire\'s gone on number {no}. That\'s {driver}\'s afternoon.'],
  mechanical: ['{driver} is coasting. Something under that hood just quit for the day.', 'Smoke from {driver}\'s car. That\'s a long walk back, friend.'],
  rain: ['Bit of rain, folks. Racing goes on. Cover your pie.', 'Here comes the rain. Drivers, ease up. Everybody else, the cattle barn is dry.'],
  finalLap: ['Last lap! Everybody up off the hay bales!', 'White flag! One more time around.'],
  finish: ['{driver} wins it! Ribbons at the grandstand, folks.', 'And that\'s {driver}! Somebody find the fella with the trophy.'],
  title: ['That\'s the season! Congratulations, {garage}. You are now Ace {town}.', 'Folks, {garage} wins it all. Say hello to Ace {town}! Somebody find them a sash.'],
};

const RADIO: Pools = {
  lightsOut: ['Green flag at {track}! Good afternoon, {state}, and they\'re away.', 'And the field is off! A fine day for it here at {track}.', 'They\'re away, and what a sight from up here in the booth.'],
  overtake: ['{driver} goes past {driver2}, and the {town} car moves up!', 'Lovely move by {driver}. {driver2} never saw it coming.', 'Through goes {driver}! They\'ll be talking about that pass in {town}.'],
  leadChange: ['{driver} takes the lead! The {town} car is giving the capital something to think about!', 'A new leader: {driver}! You\'ll want to turn the set up for this.', '{driver} to the front, and the whole state is leaning toward the radio.'],
  quickPit: ['A smart stop by {driver}\'s crew. That\'s championship work.', 'In and out for {driver}. Somebody give that crew a medal.'],
  slowPit: ['Trouble in the pits for {driver}. Precious seconds, listeners.', 'A long stop for {driver}. The crew will hear about that one on the drive home.'],
  fastestLap: ['Fastest lap to {driver}! The timekeepers are reaching for a fresh pencil.', '{driver} sets the best lap of the day. The {town} car is flying.'],
  halfway: ['Halfway at {track}, lap {lap} of {laps}. Stay with us, {state}.', 'Halfway home. This broadcast comes to you courtesy of your local garage.'],
  crash: ['{driver} is off and into the barrier! A hand is up. They\'re all right.', 'Contact, and {driver} is out! Hard luck for {town}.'],
  pileup: ['Several cars tangled at the hairpin! Everyone is climbing out, thank goodness.', 'A tangle at the first turn! The marshals are waving them all clear.'],
  blowout: ['A tire gone on {driver}\'s car! That\'s a hard way to end a day.', 'Blowout for {driver}! The {town} car limps for the pits.'],
  mechanical: ['{driver} slows, smoke from the engine. A sad sight for {town}.', 'The engine has let go for {driver}. They\'ll push it home tonight.'],
  rain: ['Rain over {track}! Careful now, gentlemen. Careful.', 'The rain has arrived, and the order may be about to change.'],
  finalLap: ['Final lap at {track}! Turn it up, {state}!', 'White flag! One lap for the points.'],
  finish: ['{driver} wins at {track}! What a day for {town}!', 'Checkered flag, and it\'s {driver}! {town} will be ringing the bells tonight.'],
  title: ['From {town}, ladies and gentlemen: the new Ace {state}! Congratulations, {garage}.', 'That\'s the title! {garage} of {town} is Ace {state}, and they\'re going to Nationals.'],
};

const NETWORK: Pools = {
  lightsOut: ['Good afternoon, America, and anyone listening further out! They\'re away!', 'From coast to coast: the green flag flies at {track}!', 'Fifty-two states, one field, and they\'re off!'],
  overtake: ['{driver} through on {driver2}! {state} is on the move.', 'There\'s a move, old sport! {driver} by {driver2}!', '{driver} goes past {driver2}. A lovely bit of driving.'],
  leadChange: ['{driver} leads Nationals! Somewhere in {state}, a whole town just stood up.', 'The lead changes hands! {driver}, for {state}!', '{driver} to the front! Hold on to your hats, America.'],
  quickPit: ['A splendid stop by {driver}\'s crew. Seconds, ladies and gentlemen. Seconds.', 'In and out for {driver}. {state} builds them quick.'],
  slowPit: ['Oh, a costly stop for {driver}. The whole nation felt that one.', 'A slow stop for {driver}. Somewhere in {state}, a radio has been switched off in disgust.'],
  fastestLap: ['Fastest lap of Nationals to {driver}! They\'ll be talking about that one in {state}.', '{driver} with the lap of the day. Simply splendid.'],
  halfway: ['Halfway at Nationals, lap {lap} of {laps}. Fifty-two states holding their breath.', 'Halfway at {track}. If you\'re just tuning in, America: it\'s wonderful.'],
  crash: ['{driver} is into the wall! They\'re out and waving to the grandstand. Splendid.', 'Contact! {driver} is out, and {state}\'s hopes with them.'],
  pileup: ['A tangle at the first turn, several cars! Everyone is all right. The grandstand applauds them out.', 'Three cars together at the far end! All out, all walking, all furious.'],
  blowout: ['A tire has burst on {driver}\'s car! A cruel end for {state}.', 'Blowout! {driver} wrestles it home on three good wheels.'],
  mechanical: ['{driver} slows to a stop. The engine has given all it had, old sport.', 'Smoke from {driver}\'s car. {state} will have to wait another year.'],
  rain: ['Rain at {track}! Now we shall see who can really drive.', 'The heavens open over {track}, and America leans closer to the set.'],
  finalLap: ['Final lap of Nationals! America, this is the one.', 'The white flag! One lap for Ace America.'],
  finish: ['{driver} wins for {state}!', 'Checkered flag! {driver} wins at {track}, and {state} goes wild!'],
  title: ['Ladies and gentlemen, the new Ace America! Congratulations, {garage}.', 'From {town}, {state}, to the top of the country. {garage}: you are Ace America.'],
};

export const CALLER_POOLS: Record<Caller, Pools> = { pa: PA, radio: RADIO, network: NETWORK };

/** The caller for a step: Locals → The PA, State → {State} Radio, Nationals and anything later (or none) → The Network. */
export function callerFor(step?: Step): Caller {
  return step === 'locals' ? 'pa' : step === 'state' ? 'radio' : 'network';
}

/** The caller as the feed names it, with its icon meaning. */
export function callerMeta(caller: Caller, stateName?: string): { name: string; emoji: string } {
  if (caller === 'pa') return { name: 'The PA', emoji: 'voice.pa' };
  if (caller === 'radio') return { name: `${stateName ?? 'State'} Radio`, emoji: 'voice.radio' };
  return { name: 'The Network', emoji: 'voice.network' };
}

/** The placeholders a moment can fill, per step (docs/story/voice.md → Placeholders). */
function slots(caller: Caller, ctx: FeedContext, ids: number[], names: string[]): Record<string, string | undefined> {
  const car = (i: number) => (ids[i] !== undefined ? ctx.voice?.cars?.[ids[i]] : undefined);
  const no = car(0)?.no;
  return {
    driver: names[0],
    driver2: names[1],
    no: no === undefined ? undefined : String(no),
    town: caller === 'radio' ? car(0)?.town ?? ctx.voice?.town : ctx.voice?.town,
    state: caller === 'radio' ? ctx.stateName : car(0)?.state,
    track: ctx.trackName || undefined,
    lap: String(ctx.lap),
    laps: String(ctx.totalLaps),
    garage: ctx.voice?.garage,
  };
}

/** Fill a line; null when a placeholder it needs is unknown. */
function fill(line: string, vars: Record<string, string | undefined>): string | null {
  let ok = true;
  const out = line.replace(/\{(\w+)\}/g, (_, k: string) => { const v = vars[k]; if (!v) ok = false; return v ?? ''; });
  return ok ? out : null;
}

/** One line for a moment in the caller's voice: lines whose placeholders can all be filled, picked by seed. */
export function callLine(moment: Moment, ctx: FeedContext, seed: number, ids: number[] = [], names: string[] = []): string {
  const caller = callerFor(ctx.step);
  const vars = slots(caller, ctx, ids, names);
  const pool = CALLER_POOLS[caller][moment];
  const filled = pool.map(l => fill(l, vars)).filter((l): l is string => l !== null);
  if (filled.length) return pick(filled, seed);
  // Nothing fills cleanly: take the pick and drop the unknown tokens' words gracefully.
  return pick(pool, seed).replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? (k === 'driver2' ? 'the car ahead' : k === 'no' ? 'that one' : ''));
}

/** The moment a notification is, or null to pass it through as written. */
function momentOf(n: RaceNotification): Moment | null {
  const t = n.title.toUpperCase();
  switch (n.type) {
    case 'crash': return t.includes('PILEUP') ? 'pileup' : t.includes('BLOWOUT') ? 'blowout' : t.includes('MECHANICAL') ? 'mechanical' : 'crash';
    case 'lead_change': return 'leadChange';
    case 'overtake': return 'overtake';
    case 'quick_pit_stop': return 'quickPit';
    case 'slow_pit_stop': return 'slowPit';
    case 'fastest_lap': return 'fastestLap';
    case 'milestone': return t.includes('FINAL LAP') ? 'finalLap' : t.includes('HALFWAY') ? 'halfway' : null;
    case 'weather': return /RAIN|WET/.test(t) || /rain|wet/i.test(n.message) ? 'rain' : null;
    case 'finish': return 'finish';
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// MISTER MARBLES — bet-aware reactions
// ---------------------------------------------------------------------------

export type BetSwing =
  | 'now_winning'    // losing -> winning
  | 'now_losing'     // winning -> losing
  | 'bet_dead'       // driver DNF'd, bet (non-dnf) impossible
  | 'dnf_bet_hit';   // dnf bet: driver actually DNF'd

export interface BetSwingInfo {
  swing: BetSwing;
  driverName: string;
  betLabel: string;     // "WIN" | "PODIUM" | ...
  amount: number;
  potential: number;    // floor(amount * odds)
  position?: number;    // current position, when known
}

export function reactToBetSwing(info: BetSwingInfo, seed: number): string {
  const { driverName, betLabel, amount, potential, position } = info;
  const pos = position ? `P${position}` : 'position';
  switch (info.swing) {
    case 'now_winning':
      return pick([
        `${driverName} moves into the money. Your ${betLabel} bet is alive. For now.`,
        `Look at that — ${driverName} is ${pos} and your ${potential}ṁ is within reach. Try not to celebrate early. It's unbecoming.`,
        `Your ${betLabel} pick ${driverName} is currently delivering. I take no position on whether it lasts.`,
      ], seed);
    case 'now_losing':
      return pick([
        `${driverName} slips to ${pos}. Your ${betLabel} bet is sweating. So am I. (I'm not.)`,
        `Your ${amount}ṁ on ${driverName} just left the winning zone. I'm sure it's all part of the plan.`,
        `${driverName}, ${pos}. That ${betLabel} ticket of yours is starting to look decorative.`,
      ], seed);
    case 'bet_dead':
      return pick([
        `${driverName} is out of the race. Your ${amount}ṁ rides with them into the void. The marbles remember.`,
        `That's a DNF for ${driverName} — and a quiet funeral for your ${betLabel} bet.`,
        `${driverName} retires. Your ${amount}ṁ does too. You should have bet differently.`,
      ], seed);
    case 'dnf_bet_hit':
      return pick([
        `Ka-ching. You bet ${amount}ṁ on ${driverName} to DNF — and they delivered. I'd say I'm proud, but let's not examine this.`,
        `${driverName} is out, exactly as you predicted. +${potential}ṁ. Cold. I respect it.`,
        `Your DNF bet on ${driverName} just hit. Profiting from misfortune — you're learning.`,
      ], seed);
  }
}

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

const MARBLES_META = { name: 'Mister Marbles', emoji: 'voice.marbles' };

const BIG: ReadonlySet<Moment> = new Set<Moment>(['crash', 'pileup', 'blowout', 'mechanical', 'leadChange', 'finalLap', 'finish', 'title']);

/**
 * Voice a race notification as a feed item (without id — caller assigns).
 * Returns null for notification types the feed should skip.
 */
export function voiceNotification(
  n: RaceNotification,
  ctx: FeedContext
): Omit<FeedItem, 'id'> | null {
  const seed = hashSeed(n);
  const caller = callerFor(ctx.step);
  const moment = momentOf(n);
  const ids = (n.drivers ?? []).map(d => d.id);
  const names = (n.drivers ?? []).map(d => d.name);
  let text: string | null;
  if (moment) text = callLine(moment, ctx, seed, ids, names);
  else if (n.type === 'track_event') text = `${n.title}. ${n.message || 'Conditions have changed.'}`;
  // The toast's title leads with an emoji; the feed names the driver plainly (#763).
  else if (n.type === 'effect_applied') text = `${names[0] ?? n.title.replace(/^\P{L}+/u, '')}: ${n.message || 'something just landed.'}`;
  else text = [n.title, n.message].filter(Boolean).join(': '); // unknown/new type: pass through factually
  if (!text) return null;
  const meta = callerMeta(caller, ctx.stateName);
  return {
    lap: ctx.lap,
    persona: caller,
    personaName: meta.name,
    personaEmoji: meta.emoji,
    text,
    emphasis: moment && BIG.has(moment) ? 'big' : 'normal',
    color: n.color,
    drivers: n.drivers,
  };
}

/** The title-won line (#749): the race that wins the step's title. Big, in the caller's voice. */
export function voiceTitle(ctx: FeedContext, seed: number): Omit<FeedItem, 'id'> {
  const caller = callerFor(ctx.step);
  const meta = callerMeta(caller, ctx.stateName);
  return { lap: ctx.lap, persona: caller, personaName: meta.name, personaEmoji: meta.emoji, text: callLine('title', ctx, seed), emphasis: 'big' };
}

/** The lights-out line for the countdown, in the step's caller voice. */
export function lightsOutLine(ctx: Pick<FeedContext, 'step' | 'stateName' | 'trackName' | 'voice'>, seed: number): string {
  return callLine('lightsOut', { lap: 1, totalLaps: 1, ...ctx }, seed);
}

/** Build a Mister Marbles feed item from a bet swing. */
export function voiceBetSwing(
  info: BetSwingInfo,
  ctx: FeedContext,
  seed: number,
  color?: string
): Omit<FeedItem, 'id'> {
  return {
    lap: ctx.lap,
    persona: 'marbles',
    personaName: MARBLES_META.name,
    personaEmoji: MARBLES_META.emoji,
    text: reactToBetSwing(info, seed),
    emphasis: info.swing === 'bet_dead' || info.swing === 'dnf_bet_hit' ? 'big' : 'normal',
    color,
  };
}
