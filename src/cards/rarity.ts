// Rarity is a metal (Pax, Oct 8; docs/ICONS.md → The look), least to most rare.
// Moved out of the tag system when tags retired (#334): cards are the only
// thing with a rarity now.
import type { Rng } from '../engine/rng';

export type Rarity = 'bronze' | 'silver' | 'gold' | 'iridium';
export const RARITIES: Rarity[] = ['bronze', 'silver', 'gold', 'iridium'];
/** Odds of each bucket once a slot hits. Default 60 / 30 / 9 / 1. */
export type RarityOdds = Record<Rarity, number>;

export const DEFAULT_RARITY_ODDS: RarityOdds = { bronze: 60, silver: 30, gold: 9, iridium: 1 };

/** Pre-metal names (before #385). Old saves, Lab presets and the ledger still
 * carry them; everything that reads a rarity goes through toRarity(). */
const LEGACY_RARITY: Record<string, Rarity> = { common: 'bronze', uncommon: 'silver', rare: 'gold', legendary: 'iridium' };

export function toRarity(r: string): Rarity {
  return LEGACY_RARITY[r] ?? (r as Rarity);
}

/** Odds keyed by metal, from metal or legacy keys (old saves). */
export function upgradeRarityOdds(o: Partial<Record<string, number>> | undefined): RarityOdds {
  const out = { ...DEFAULT_RARITY_ODDS };
  if (!o) return out;
  for (const [k, v] of Object.entries(o)) if (typeof v === 'number') out[toRarity(k)] = v;
  return out;
}

/** Roll a metal from the odds. Exactly one rng() draw. */
export function rollRarity(given: RarityOdds, rng: Rng): Rarity {
  const odds = upgradeRarityOdds(given);
  const total = RARITIES.reduce((s, r) => s + Math.max(0, odds[r]), 0);
  let x = rng() * total;
  for (const r of RARITIES) { x -= Math.max(0, odds[r]); if (x < 0) return r; }
  return 'bronze';
}
