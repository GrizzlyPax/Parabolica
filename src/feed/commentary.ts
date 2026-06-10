// === RACE FEED COMMENTARY ENGINE ===
// Pure functions that turn race notifications and bet swings into
// persona-voiced feed lines. No React, no engine imports — testable.
//
// Personas:
//   booth   — The Booth: play-by-play announcer. Punchy, present tense, dry.
//   marbles — Mister Marbles: the bookie. Smug, omniscient, talks to YOU.
//   track   — The Track itself: PA announcer for track events & the void.

import type { NotificationType, RaceNotification } from '../WatchMode';

export type FeedPersona = 'booth' | 'marbles' | 'track';

export interface FeedItem {
  id: number;
  lap: number;
  persona: FeedPersona;
  personaName: string;
  personaEmoji: string;
  text: string;
  emphasis: 'normal' | 'big';
  color?: string;
  drivers?: Array<{ id: number; name: string; emoji: string }>;
}

export interface FeedContext {
  lap: number;
  totalLaps: number;
  trackName: string;
  trackEmoji: string;
}

// Deterministic template pick: stable per event, varied across events
function pick<T>(pool: T[], seed: number): T {
  return pool[Math.abs(seed) % pool.length];
}

function hashSeed(n: RaceNotification): number {
  let h = n.tick;
  for (const ch of n.type) h = (h * 31 + ch.charCodeAt(0)) | 0;
  h = (h * 31 + (n.drivers?.[0]?.id ?? 0)) | 0;
  return h;
}

// Short display name: "Comfort Phillips" -> "Phillips" feels too dry for
// these names; the full generated names ARE the joke, so keep them whole.
const name = (n: RaceNotification, idx = 0) => n.drivers?.[idx]?.name ?? 'somebody';

// ---------------------------------------------------------------------------
// THE BOOTH — play-by-play
// ---------------------------------------------------------------------------

type TemplateFn = (n: RaceNotification, ctx: FeedContext, seed: number) => string;

const BOOTH: Partial<Record<NotificationType, TemplateFn>> = {
  crash: (n, _ctx, seed) => {
    // Covers crashes, pileups, blowouts, mechanicals (all use type 'crash')
    if (n.title.includes('PILEUP')) {
      return pick([
        `Pileup! ${n.message || 'Multiple cars involved.'} Cleanup on every aisle.`,
        `It's a pileup. ${n.message || ''} Somewhere, an insurance adjuster wakes up screaming.`,
        `PILEUP. ${n.message || ''} This is why we can't have nice races.`,
      ], seed);
    }
    if (n.title.includes('BLOWOUT')) {
      return pick([
        `Tire blowout for ${name(n)}! That compound owed them nothing and delivered exactly that.`,
        `${name(n)}'s tire has voted to leave the car. Race over for them.`,
        `Blowout! ${name(n)} finds the limit of rubber-based optimism.`,
      ], seed);
    }
    if (n.title.includes('MECHANICAL')) {
      return pick([
        `Mechanical failure for ${name(n)}. The car has simply chosen rest.`,
        `${name(n)} pulls off — something expensive just became decorative.`,
        `The machinery betrays ${name(n)}. It happens to the best. It happened to them.`,
      ], seed);
    }
    return pick([
      `Contact! ${n.message || `${name(n)} is in the wall.`}`,
      `Big hit! ${n.message || `${name(n)} won't continue.`} The marbles fall silent.`,
      `${n.message || `${name(n)} crashes out.`} Racing is a contact sport after all.`,
    ], seed);
  },

  lead_change: (n, _ctx, seed) => pick([
    `${name(n)} takes the lead!`,
    `New leader: ${name(n)}. The front of this race is a rumor.`,
    `${name(n)} hits the front. Act accordingly.`,
    `P1 changes hands — ${name(n)} leads now.`,
  ], seed),

  slow_pit_stop: (n, _ctx, seed) => pick([
    `Slow stop for ${name(n)}! The pit crew is having a moment.`,
    `${name(n)} is parked in the pits. That wheel gun has opinions.`,
    `Agonizing stop for ${name(n)}. Someone's getting an email about this.`,
  ], seed),

  quick_pit_stop: (n, _ctx, seed) => pick([
    `Lightning stop for ${name(n)}! The crew was simply showing off.`,
    `${name(n)} in and out before the kettle boiled. Beautiful work.`,
    `Blink and you missed ${name(n)}'s stop. The pit crew demands a raise.`,
  ], seed),

  fastest_lap: (n, _ctx, seed) => pick([
    `Fastest lap: ${name(n)}. Setting the pace out there.`,
    `${name(n)} just set the benchmark. Purple sector energy.`,
    `New fastest lap from ${name(n)}. Someone's feeling brave.`,
  ], seed),

  milestone: (n, ctx, seed) => {
    if (n.title.includes('FINAL LAP')) {
      return pick([
        `FINAL LAP. Whatever you believe in, now's the time.`,
        `White flag! One lap to settle everything.`,
        `Final lap. Hold something. Anything.`,
      ], seed);
    }
    if (n.title.includes('HALFWAY')) {
      return pick([
        `Halfway. Lap ${ctx.lap} of ${ctx.totalLaps}. So far, so plausible.`,
        `Halfway there. The second half is historically where it goes wrong.`,
      ], seed);
    }
    return n.message || n.title;
  },

  finish: (n, _ctx, seed) => pick([
    `CHECKERED FLAG! ${name(n)} wins it!`,
    `${name(n)} takes the win! Somewhere, marbles change hands.`,
    `It's done — ${name(n)} wins. History will remember. We might not.`,
  ], seed),

  tag_activation: (n) =>
    // Title already carries "{emoji} {driver}", message carries the tag text
    `${n.title} — ${n.message || 'something just activated.'}`,

  overtake: (n, _ctx, seed) => pick([
    `${n.message || `${name(n)} makes a move.`}`,
    `${name(n)} goes through! Clean as you like.`,
  ], seed),
};

// ---------------------------------------------------------------------------
// THE TRACK — track events and the void speak for themselves
// ---------------------------------------------------------------------------

const TRACK_VOICE: Partial<Record<NotificationType, TemplateFn>> = {
  track_event: (n, _ctx, seed) => {
    if (n.title.includes('VOID')) {
      return n.title.includes('OPENS')
        ? pick([
            `The Unsafety Car has been deployed. Please do not make eye contact.`,
            `The void opens. Field neutralized. Hold the racing line and your breath.`,
          ], seed)
        : pick([
            `The Unsafety Car returns to the void. Racing resumes. Pretend nothing happened.`,
            `The void closes. You may resume your regularly scheduled chaos.`,
          ], seed);
    }
    // Named track event — title is the event name, message the effect
    return `${n.title}. ${n.message || 'Conditions have changed.'}`;
  },
};

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

const PERSONA_META: Record<FeedPersona, { name: string; emoji: string }> = {
  booth: { name: 'The Booth', emoji: '🎙️' },
  marbles: { name: 'Mister Marbles', emoji: '🎩' },
  track: { name: 'The Track', emoji: '🏟️' },
};

const BIG_MOMENTS: Set<string> = new Set(['crash', 'lead_change', 'finish']);

/**
 * Voice a race notification as a feed item (without id — caller assigns).
 * Returns null for notification types the feed should skip.
 */
export function voiceNotification(
  n: RaceNotification,
  ctx: FeedContext
): Omit<FeedItem, 'id'> | null {
  const seed = hashSeed(n);

  let persona: FeedPersona = 'booth';
  let text: string | null = null;

  if (TRACK_VOICE[n.type]) {
    persona = 'track';
    text = TRACK_VOICE[n.type]!(n, ctx, seed);
  } else if (BOOTH[n.type]) {
    text = BOOTH[n.type]!(n, ctx, seed);
  } else {
    // Unknown/new notification type: pass through factually rather than drop
    text = [n.title, n.message].filter(Boolean).join(' — ');
  }

  if (!text) return null;

  const meta = persona === 'track'
    ? { name: ctx.trackName || PERSONA_META.track.name, emoji: ctx.trackEmoji || PERSONA_META.track.emoji }
    : PERSONA_META[persona];

  const isBig =
    BIG_MOMENTS.has(n.type) ||
    (n.type === 'milestone' && n.title.includes('FINAL LAP'));

  return {
    lap: ctx.lap,
    persona,
    personaName: meta.name,
    personaEmoji: meta.emoji,
    text,
    emphasis: isBig ? 'big' : 'normal',
    color: n.color,
    drivers: n.drivers,
  };
}

/** Build a Mister Marbles feed item from a bet swing. */
export function voiceBetSwing(
  info: BetSwingInfo,
  ctx: FeedContext,
  seed: number,
  accentColor?: string
): Omit<FeedItem, 'id'> {
  return {
    lap: ctx.lap,
    persona: 'marbles',
    personaName: PERSONA_META.marbles.name,
    personaEmoji: PERSONA_META.marbles.emoji,
    text: reactToBetSwing(info, seed),
    emphasis: info.swing === 'bet_dead' || info.swing === 'dnf_bet_hit' ? 'big' : 'normal',
    color: accentColor,
  };
}
