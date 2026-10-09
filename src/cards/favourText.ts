// Plain words for a favour list: "+10 Speed · +10 Power" (grade points).
import { STAT_LABELS } from './deck';
import type { CardStat } from './types';

export function favourText(favours: readonly CardStat[]): string {
  return favours.map(f => `+${Math.round(f.pct)} ${STAT_LABELS[f.stat]}`).join(' · ');
}
