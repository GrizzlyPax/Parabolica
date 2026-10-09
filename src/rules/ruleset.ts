// Rules of the run (#241). Before a run you pick RULE CARDS; they compose a
// RULESET — the savable, inspectable object the whole universe reads. The
// ruleset is stamped into a league's setup (and a quick race) at founding, so
// determinism holds: same seed + different ruleset = a different story, and
// re-settling from inputs reproduces it exactly.
//
// Rule cards are data. A rule card is a named rule that bundles content, physics and
// flavour, one level above the dials (GDD pillar 5). Its `patch` is the only
// thing that touches the ruleset, applied in hand order. Adding a card is a
// toss-in: an object in data/ruleCards.ts, no engine edits.

import { SimVariables, CANON_VARIABLES } from '../simlab/types';
import { RarityOdds, DEFAULT_RARITY_ODDS, RARITIES, upgradeRarityOdds } from '../cards/rarity';
import { WEATHER_TYPES } from '../data/weather';

export const RULESET_VERSION = 1 as const;

/** The resolved rules a run plays under. Everything here is explicit. */
export interface Ruleset {
  v: typeof RULESET_VERSION;
  /** Card ids in hand order. The rest of this object is derived from them
   * (plus the defaults) — kept so the UI can show the hand and re-resolve. */
  cards: string[];
  traits: {
    /** Chance each slot (driver / car / team) is born with a trait card. */
    genesisChance: number;
    /** Once a slot hits, the odds of each metal. */
    rarityOdds: RarityOdds;
  };
  weather: {
    /** Draw weight per weather id. 0 = never. */
    weights: Record<string, number>;
    /** Quick Race rolls weather too (leagues always do). */
    quickRace: boolean;
  };
  /** Physics, fully resolved (CANON with card patches applied). */
  simVars: SimVariables;
  /** A Race Control preset applied on top: knob values. simVars already
   * carry them; this is the label. */
  lab?: { name: string; knobEdits: Record<string, number> };
}

/** A card's patch: the small vocabulary cards speak. All optional. */
export interface RuleCardPatch {
  traits?: {
    genesisChance?: number;
    /** Override some or all metal odds. */
    rarityOdds?: Partial<RarityOdds>;
  };
  /** Weight overrides per weather id; ids not named keep their weight. */
  weather?: Partial<Record<string, number>>;
  quickRaceWeather?: boolean;
  /** Deep-partial physics overrides. */
  simVars?: DeepPartial<SimVariables>;
  /** Multiply a numeric path by a factor (e.g. crashes.baseCrashChance × 2). */
  scale?: Array<[path: string, factor: number]>;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export type RuleCardScope = 'race' | 'season' | 'both';

export interface RuleCard {
  id: string;
  name: string;
  emoji: string;
  /** game-icon id or meaning (src/icons/registry.ts); falls back to emoji. */
  iconId?: string;
  /** Where the card is offered: a one-off race ("Rain"), a whole season
   * ("Always Raining"), or either. Same patch machinery underneath. */
  scope: RuleCardScope;
  /** How hard it bends the universe — shown as a badge. */
  weight: 'mild' | 'wild' | 'cursed';
  /** The fiction, one or two lines. */
  blurb: string;
  /** The plain-words effect, one line. The layer underneath, in a sentence. */
  readout: string;
  patch: RuleCardPatch;
}

// ---------------------------------------------------------------------------
// Defaults = exactly today's behaviour. resolveRuleset([]) must equal this,
// and the golden master must not move when a run is founded with no cards.
// ---------------------------------------------------------------------------

export function defaultRuleset(): Ruleset {
  return {
    v: RULESET_VERSION,
    cards: [],
    traits: {
      genesisChance: 1 / 6,
      rarityOdds: { ...DEFAULT_RARITY_ODDS },
    },
    weather: {
      weights: Object.fromEntries(WEATHER_TYPES.map(w => [w.id, w.weight])),
      quickRace: false,
    },
    simVars: structuredClone(CANON_VARIABLES),
  };
}

function deepMerge<T>(base: T, patch: DeepPartial<T> | undefined): T {
  if (!patch) return base;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const k of Object.keys(patch) as (keyof T)[]) {
    const pv = (patch as any)[k];
    const bv = (base as any)[k];
    out[k] = pv !== null && typeof pv === 'object' && bv !== null && typeof bv === 'object' ? deepMerge(bv, pv) : pv;
  }
  return out;
}

function scalePath(obj: any, path: string, factor: number): void {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur?.[parts[i]];
    if (cur === undefined) return;
  }
  const last = parts[parts.length - 1];
  if (typeof cur?.[last] === 'number') cur[last] = cur[last] * factor;
}

/** Apply one card's patch to a ruleset. Pure. */
export function applyRuleCard(rs: Ruleset, card: RuleCard): Ruleset {
  const p = card.patch;
  const next: Ruleset = structuredClone(rs);
  next.cards = [...rs.cards, card.id];
  if (p.traits) {
    if (p.traits.genesisChance !== undefined) next.traits.genesisChance = p.traits.genesisChance;
    if (p.traits.rarityOdds) next.traits.rarityOdds = { ...next.traits.rarityOdds, ...upgradeRarityOdds(p.traits.rarityOdds) };
  }
  if (p.weather) {
    for (const [id, w] of Object.entries(p.weather)) if (w !== undefined) next.weather.weights[id] = w;
  }
  if (p.quickRaceWeather !== undefined) next.weather.quickRace = p.quickRaceWeather;
  if (p.simVars) next.simVars = deepMerge(next.simVars, p.simVars);
  if (p.scale) for (const [path, factor] of p.scale) scalePath(next.simVars, path, factor);
  return next;
}

/** Compose a hand of cards into a ruleset. Unknown ids are ignored. */
export function resolveRuleset(cardIds: string[], cardsById: Map<string, RuleCard>): Ruleset {
  let rs = defaultRuleset();
  for (const id of cardIds) {
    const card = cardsById.get(id);
    if (card) rs = applyRuleCard(rs, card);
  }
  return rs;
}

/** Apply a Race Control preset: knob edits into simVars. */
export function applyLabPreset(rs: Ruleset, preset: { name: string; knobEdits: Record<string, number> } | null): Ruleset {
  if (!preset || Object.keys(preset.knobEdits).length === 0) return rs;
  const simVars = structuredClone(rs.simVars);
  for (const [path, value] of Object.entries(preset.knobEdits)) {
    const parts = path.split('.');
    let cur: Record<string, unknown> = simVars as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]] as Record<string, unknown>;
    if (typeof cur[parts[parts.length - 1]] === 'number') cur[parts[parts.length - 1]] = value;
  }
  return { ...rs, simVars, lab: { name: preset.name, knobEdits: preset.knobEdits } };
}

/** Is this ruleset byte-for-byte the default (no cards, nothing tweaked)? */
export function isDefaultRuleset(rs: Ruleset): boolean {
  return JSON.stringify(rs) === JSON.stringify(defaultRuleset());
}

// ---------------------------------------------------------------------------
// Save / load. A ruleset is plain JSON; this is also what the run ledger
// records (#245) and what the Run Setup screen exports.
// ---------------------------------------------------------------------------

export function serializeRuleset(rs: Ruleset): string {
  return JSON.stringify(rs);
}

export function parseRuleset(json: string): Ruleset | null {
  try {
    const o = JSON.parse(json);
    if (!o || o.v !== RULESET_VERSION) return null;
    if (!Array.isArray(o.cards) || !(o.traits || o.tags) || !o.weather || !o.simVars) return null;
    upgradeRulesetInPlace(o);
    if (typeof o.traits.genesisChance !== 'number') return null;
    if (typeof o.weather.weights !== 'object' || typeof o.weather.quickRace !== 'boolean') return null;
    // simVars: deep-merge over CANON so a partial or stale file still resolves
    return { ...o, simVars: deepMerge(structuredClone(CANON_VARIABLES), o.simVars) };
  } catch {
    return null;
  }
}

/** Old saves: pre-#334 rulesets keep the genesis odds under `tags` (with a
 * pool and a slot cap that no longer exist); pre-#385 ones name rarities
 * common…legendary. Move both to today's shape. Missing odds become the
 * defaults. A lab preset's tag edits are dropped. */
function upgradeRulesetInPlace(o: {
  traits?: { genesisChance?: number; rarityOdds?: Partial<Record<string, number>> };
  tags?: { genesisChance?: number; rarityOdds?: Partial<Record<string, number>> };
  lab?: { name: string; knobEdits: Record<string, number>; tagEdits?: unknown };
}): void {
  const d = defaultRuleset().traits;
  const src = o.traits ?? o.tags ?? {};
  o.traits = {
    genesisChance: typeof src.genesisChance === 'number' ? src.genesisChance : d.genesisChance,
    rarityOdds: upgradeRarityOdds(src.rarityOdds),
  };
  delete o.tags;
  if (o.lab) delete o.lab.tagEdits;
}

/** A ruleset from any era, on today's rarity names. Returns a copy. */
export function upgradeRuleset(rs: Ruleset): Ruleset {
  const o = structuredClone(rs);
  upgradeRulesetInPlace(o as never);
  return o;
}

/** "1 in 6" for 0.1667, "25%" otherwise. */
export function describeChance(c: number): string {
  if (c <= 0) return 'never';
  if (c >= 1) return 'always';
  const n = 1 / c;
  return Math.abs(n - Math.round(n)) < 0.01 ? `1 in ${Math.round(n)}` : `${Math.round(c * 100)}%`;
}

/** "60% bronze · 30% silver · 9% gold · 1% iridium" */
export function describeOdds(given: RarityOdds): string {
  const o = upgradeRarityOdds(given);
  const total = RARITIES.reduce((s, r) => s + Math.max(0, o[r]), 0) || 1;
  return RARITIES.filter(r => o[r] > 0).map(r => `${Math.round(o[r] / total * 100)}% ${r}`).join(' · ');
}

/** The differences from default, in plain words — the "layer underneath". */
export function describeRuleset(rs: Ruleset): string[] {
  const d = defaultRuleset();
  const lines: string[] = [];
  if (rs.lab) lines.push(`Lab preset "${rs.lab.name}": ${Object.keys(rs.lab.knobEdits).length} knob edit(s)`);
  if (rs.traits.genesisChance !== d.traits.genesisChance) lines.push(`Born with a trait: ${describeChance(rs.traits.genesisChance)} per slot (default ${describeChance(d.traits.genesisChance)})`);
  if (RARITIES.some(r => rs.traits.rarityOdds[r] !== d.traits.rarityOdds[r])) lines.push(`Metal odds: ${describeOdds(rs.traits.rarityOdds)}`);
  const wChanged = Object.keys(rs.weather.weights).filter(id => rs.weather.weights[id] !== d.weather.weights[id]);
  if (wChanged.length) {
    const total = Object.values(rs.weather.weights).reduce((a, b) => a + b, 0);
    lines.push('Weather: ' + WEATHER_TYPES.filter(w => rs.weather.weights[w.id] > 0)
      .map(w => `${w.emoji} ${Math.round((rs.weather.weights[w.id] / total) * 100)}%`).join(' · '));
  }
  const p = rs.simVars.pits, dp = d.simVars.pits;
  if (p.minStops !== dp.minStops || p.requireCompoundChange !== dp.requireCompoundChange || p.requireAllCompounds !== dp.requireAllCompounds) {
    lines.push(p.minStops === 0 && !p.requireCompoundChange && !p.requireAllCompounds ? 'Pit rule: none — anything goes'
      : `Pit rule: ${p.minStops} stop${p.minStops === 1 ? '' : 's'}${p.requireCompoundChange ? ', change compound' : ''}${p.requireAllCompounds ? ', all 3 compounds' : ''}`);
  }
  if (rs.weather.quickRace !== d.weather.quickRace) lines.push(`Quick Race weather: ${rs.weather.quickRace ? 'on' : 'off'}`);
  for (const [path, a, b] of diffNumbers(rs.simVars, d.simVars)) {
    const ratio = b === 0 ? null : a / b;
    lines.push(`${path}: ${fmt(a)}${ratio !== null && Math.abs(ratio - 1) > 0.001 ? ` (×${ratio.toFixed(2)})` : ''}`);
  }
  return lines;
}

function fmt(n: number): string { return Number.isInteger(n) ? String(n) : n.toPrecision(3); }

function diffNumbers(a: any, b: any, prefix = ''): Array<[string, number, number]> {
  const out: Array<[string, number, number]> = [];
  for (const k of Object.keys(a)) {
    const av = a[k], bv = b?.[k];
    if (typeof av === 'number') { if (av !== bv) out.push([prefix + k, av, bv]); }
    else if (av && typeof av === 'object') out.push(...diffNumbers(av, bv ?? {}, prefix + k + '.'));
  }
  return out;
}
