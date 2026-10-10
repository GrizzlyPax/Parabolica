// Plain words for a favour list, in levels (#666): "+2 Speed · +2 Power"
// (10 grade points = 2 levels, the same math as the cards, #623). Stats that
// appear twice (track + weather) are summed.
import { STAT_LABELS } from './deck';
import type { CardStat } from './types';
import { levelDelta } from '../season/grades';

export function favourParts(favours: readonly CardStat[]): string[] {
  const sum = new Map<CardStat['stat'], number>();
  for (const f of favours) sum.set(f.stat, (sum.get(f.stat) ?? 0) + f.pct);
  return [...sum].map(([stat, pct]) => `${levelDelta(pct)} ${STAT_LABELS[stat]}`);
}

export function favourText(favours: readonly CardStat[]): string {
  return favourParts(favours).join(' · ');
}
