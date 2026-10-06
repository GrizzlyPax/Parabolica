// Action hooks (#233): after a race settles, every tag a driver carried into
// it gets a turn to DO something — spread to a teammate, pass a grudge to a
// rival, upgrade itself, burn out. Same shape as the acquisition engine:
// pure, seeded, and the output is log entries (never a mutation), so history
// stays replayable from inputs.

import { mulberry32, deriveSeed } from '../engine/rng';
import { getTagById, ActionTarget, Tag, TagDuration } from '../data/tags';
import { Intervention, LeagueState, RaceDigest, TagChange } from './types';
import { canAttachTag } from './league';
import { defaultRuleset } from '../rules/ruleset';
import { RosterDriver } from '../RaceEngine';
import { AcquisitionResult } from './acquisition';

function expiryIndex(earnedAt: number, duration: TagDuration | undefined): number | null {
  if (!duration || duration === 'permanent' || duration === 'season') return null;
  return earnedAt + 1 + duration.races;
}

/** Who `to` points at for driver `d` in this race, or null if nobody. */
function resolveTarget(to: ActionTarget, d: RosterDriver, roster: RosterDriver[], digest: RaceDigest, rng: () => number): RosterDriver | null {
  switch (to) {
    case 'self': return d;
    case 'teammate': {
      const key = d.kingdomId ?? d.teamName;
      return roster.find(x => x.id !== d.id && (x.kingdomId ?? x.teamName) === key) ?? null;
    }
    case 'rival': {
      const pair = (digest.crashPairs ?? []).find(p => p.includes(d.id));
      if (!pair) return null;
      const other = pair[0] === d.id ? pair[1] : pair[0];
      return roster.find(x => x.id === other) ?? null;
    }
    case 'random': {
      const others = roster.filter(x => x.id !== d.id);
      return others.length ? others[Math.floor(rng() * others.length)] : null;
    }
    default: return null;
  }
}

function fill(text: string, d: RosterDriver, target: RosterDriver | null, tag: Tag | undefined): string {
  return text
    .replace('{driver}', d.fullName)
    .replace('{target}', target?.fullName ?? '')
    .replace('{tag}', tag ? `${tag.emoji} ${tag.name}` : '');
}

/**
 * Run every tag's afterRace actions for race `digest.index`. `roster` is the
 * stack each driver carried INTO the race. Runs after acquisitions, and sees
 * their entries via `pending` so the slot cap counts them. Each action draws
 * from deriveSeed(leagueSeed, 'actions', raceIndex, driverId, tagId, i).
 */
export function evaluateActions(
  league: LeagueState,
  digest: RaceDigest,
  roster: RosterDriver[],
  pending: Intervention[] = []
): AcquisitionResult {
  const cap = (league.setup.ruleset ?? defaultRuleset()).tags.slotCap;
  const nextRace = digest.index + 1;
  const entries: Intervention[] = [];
  const changes: TagChange[] = [];

  // Working stacks as the NEXT race will see them: carried-in tags, minus
  // what's scheduled to expire, plus what this settle already handed out.
  const stacks = new Map<number, Tag[]>();
  const log = [...league.interventionLog, ...pending];
  for (const d of roster) {
    let tags = d.tags;
    for (const e of log) {
      if (e.targetDriverId !== d.id || e.atRaceIndex > nextRace) continue;
      const tag = getTagById(e.tagId);
      if (!tag) continue;
      if (e.type === 'expire-tag') tags = tags.filter(t => t.id !== tag.id);
      else if (e.type === 'acquire-tag' && e.atRaceIndex === nextRace && canAttachTag(tags, tag, cap)) tags = [...tags, tag];
    }
    stacks.set(d.id, tags);
  }

  const attach = (target: RosterDriver, tag: Tag, headline: string, ruleId: string): boolean => {
    const stack = stacks.get(target.id) ?? target.tags;
    if (!canAttachTag(stack, tag, cap)) return false;
    stacks.set(target.id, [...stack, tag]);
    entries.push({ type: 'acquire-tag', atRaceIndex: nextRace, targetDriverId: target.id, tagId: tag.id, ruleId, reason: headline, earnedAtRaceIndex: digest.index });
    const ends = expiryIndex(digest.index, tag.duration);
    if (ends !== null) entries.push({ type: 'expire-tag', atRaceIndex: ends, targetDriverId: target.id, tagId: tag.id });
    changes.push({ kind: 'acquire', driverId: target.id, tagId: tag.id, headline });
    return true;
  };
  const expire = (target: RosterDriver, tag: Tag, headline: string): boolean => {
    const stack = stacks.get(target.id) ?? target.tags;
    if (!stack.some(t => t.id === tag.id)) return false;
    stacks.set(target.id, stack.filter(t => t.id !== tag.id));
    entries.push({ type: 'expire-tag', atRaceIndex: nextRace, targetDriverId: target.id, tagId: tag.id });
    changes.push({ kind: 'expire', driverId: target.id, tagId: tag.id, headline });
    return true;
  };

  for (const d of roster) {
    for (const tag of d.tags) {
      (tag.afterRace ?? []).forEach((action, i) => {
        const rng = mulberry32(deriveSeed(league.leagueSeed, 'actions', digest.index, d.id, tag.id, i));
        const roll = rng(); // always draw, so streams stay stable
        if (roll >= action.chance) return;
        const ruleId = `${tag.id}:${action.do}:${i}`;
        switch (action.do) {
          case 'attach-tag': {
            const give = getTagById(action.tagId);
            const target = resolveTarget(action.to, d, roster, digest, rng);
            if (!give || !target) return;
            attach(target, give, fill(action.headline, d, target, give), ruleId);
            return;
          }
          case 'expire-self':
            expire(d, tag, fill(action.headline, d, null, tag));
            return;
          case 'remove-tag': {
            const take = getTagById(action.tagId);
            if (!take) return;
            expire(d, take, fill(action.headline, d, null, take));
            return;
          }
        }
      });
    }
  }
  return { entries, changes };
}
