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
import { ALL_TAGS, Tag, MAX_TAGS_PER_DRIVER, isGenesisTag, RarityOdds, DEFAULT_RARITY_ODDS, RARITIES } from '../data/tags';
import { WEATHER_TYPES } from '../data/weather';

export const RULESET_VERSION = 1 as const;

/** The resolved rules a run plays under. Everything here is explicit. */
export interface Ruleset {
  v: typeof RULESET_VERSION;
  /** Card ids in hand order. The rest of this object is derived from them
   * (plus the defaults) — kept so the UI can show the hand and re-resolve. */
  cards: string[];
  tags: {
    /** Tag ids genesis may draw from (and the intervention pool, later). */
    pool: string[];
    /** Chance each slot (driver / car / team) is born with a tag. */
    genesisChance: number;
    /** Once a slot hits, the odds of each rarity bucket. */
    rarityOdds: RarityOdds;
    /** Max tags per driver, all sources. */
    slotCap: number;
  };
  weather: {
    /** Draw weight per weather id. 0 = never. */
    weights: Record<string, number>;
    /** Quick Race rolls weather too (leagues always do). */
    quickRace: boolean;
  };
  /** Physics, fully resolved (CANON with card patches applied). */
  simVars: SimVariables;
  /** A Race Control preset applied on top: edited tag definitions and knob
   * values. Genesis draws the edited tags; simVars already carry the knobs. */
  lab?: { name: string; tagEdits: Record<string, Tag>; knobEdits: Record<string, number> };
}

/** A card's patch: the small vocabulary cards speak. All optional. */
export interface RuleCardPatch {
  tags?: {
    /** Restrict the pool to these ids (applied before add/remove). */
    only?: string[];
    add?: string[];
    remove?: string[];
    genesisChance?: number;
    /** Override some or all bucket odds. */
    rarityOdds?: Partial<RarityOdds>;
    slotCap?: number;
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
    tags: {
      pool: ALL_TAGS.filter(isGenesisTag).map(t => t.id),
      genesisChance: 1 / 6,
      rarityOdds: { ...DEFAULT_RARITY_ODDS },
      slotCap: MAX_TAGS_PER_DRIVER,
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
  if (p.tags) {
    let pool = next.tags.pool;
    if (p.tags.only) pool = pool.filter(id => p.tags!.only!.includes(id));
    if (p.tags.remove) pool = pool.filter(id => !p.tags!.remove!.includes(id));
    if (p.tags.add) for (const id of p.tags.add) if (!pool.includes(id)) pool.push(id);
    next.tags.pool = pool;
    if (p.tags.genesisChance !== undefined) next.tags.genesisChance = p.tags.genesisChance;
    if (p.tags.rarityOdds) next.tags.rarityOdds = { ...next.tags.rarityOdds, ...p.tags.rarityOdds };
    if (p.tags.slotCap !== undefined) next.tags.slotCap = p.tags.slotCap;
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

/** The tag pool as Tag objects, for generators. */
export function poolTags(rs: Ruleset): Tag[] {
  const set = new Set(rs.tags.pool);
  return ALL_TAGS.filter(t => set.has(t.id)).map(t => rs.lab?.tagEdits[t.id] ?? t);
}

/** Apply a Race Control preset: knob edits into simVars, tag edits for genesis. */
export function applyLabPreset(rs: Ruleset, preset: { name: string; tagEdits: Record<string, Tag>; knobEdits: Record<string, number> } | null): Ruleset {
  if (!preset || (Object.keys(preset.tagEdits).length === 0 && Object.keys(preset.knobEdits).length === 0)) return rs;
  const simVars = structuredClone(rs.simVars);
  for (const [path, value] of Object.entries(preset.knobEdits)) {
    const parts = path.split('.');
    let cur: Record<string, unknown> = simVars as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]] as Record<string, unknown>;
    if (typeof cur[parts[parts.length - 1]] === 'number') cur[parts[parts.length - 1]] = value;
  }
  return { ...rs, simVars, lab: { name: preset.name, tagEdits: preset.tagEdits, knobEdits: preset.knobEdits } };
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
    if (!Array.isArray(o.cards) || !o.tags || !o.weather || !o.simVars) return null;
    if (!Array.isArray(o.tags.pool) || typeof o.tags.genesisChance !== 'number' || typeof o.tags.slotCap !== 'number') return null;
    if (!o.tags.rarityOdds) o.tags.rarityOdds = { ...DEFAULT_RARITY_ODDS }; // pre-rarity saves
    if (typeof o.weather.weights !== 'object' || typeof o.weather.quickRace !== 'boolean') return null;
    // simVars: deep-merge over CANON so a partial or stale file still resolves
    return { ...o, simVars: deepMerge(structuredClone(CANON_VARIABLES), o.simVars) };
  } catch {
    return null;
  }
}

/** "1 in 6" for 0.1667, "25%" otherwise. */
export function describeChance(c: number): string {
  if (c <= 0) return 'never';
  if (c >= 1) return 'always';
  const n = 1 / c;
  return Math.abs(n - Math.round(n)) < 0.01 ? `1 in ${Math.round(n)}` : `${Math.round(c * 100)}%`;
}

/** "60% common · 30% uncommon · 9% rare · 1% legendary" */
export function describeOdds(o: RarityOdds): string {
  const total = RARITIES.reduce((s, r) => s + Math.max(0, o[r]), 0) || 1;
  return RARITIES.filter(r => o[r] > 0).map(r => `${Math.round(o[r] / total * 100)}% ${r}`).join(' · ');
}

/** The differences from default, in plain words — the "layer underneath". */
export function describeRuleset(rs: Ruleset): string[] {
  const d = defaultRuleset();
  const lines: string[] = [];
  if (rs.lab) lines.push(`Lab preset "${rs.lab.name}": ${Object.keys(rs.lab.tagEdits).length} tag edit(s), ${Object.keys(rs.lab.knobEdits).length} knob edit(s)`);
  if (rs.tags.pool.length !== d.tags.pool.length) lines.push(`Tag pool: ${rs.tags.pool.length} of ${d.tags.pool.length} tags`);
  if (rs.tags.genesisChance !== d.tags.genesisChance) lines.push(`Born with a tag: ${describeChance(rs.tags.genesisChance)} per slot (default ${describeChance(d.tags.genesisChance)})`);
  if (RARITIES.some(r => rs.tags.rarityOdds[r] !== d.tags.rarityOdds[r])) lines.push(`Rarity odds: ${describeOdds(rs.tags.rarityOdds)}`);
  if (rs.tags.slotCap !== d.tags.slotCap) lines.push(`Tags per driver: up to ${rs.tags.slotCap} (default ${d.tags.slotCap})`);
  const wChanged = Object.keys(rs.weather.weights).filter(id => rs.weather.weights[id] !== d.weather.weights[id]);
  if (wChanged.length) {
    const total = Object.values(rs.weather.weights).reduce((a, b) => a + b, 0);
    lines.push('Weather: ' + WEATHER_TYPES.filter(w => rs.weather.weights[w.id] > 0)
      .map(w => `${w.emoji} ${Math.round((rs.weather.weights[w.id] / total) * 100)}%`).join(' · '));
  }
  if (rs.simVars.pits.minStops !== d.simVars.pits.minStops || rs.simVars.pits.requireAllCompounds !== d.simVars.pits.requireAllCompounds) {
    lines.push(rs.simVars.pits.minStops === 0 && !rs.simVars.pits.requireAllCompounds ? 'Pit rule: none — anything goes' : `Pit rule: ${rs.simVars.pits.minStops} stops${rs.simVars.pits.requireAllCompounds ? ', all 3 compounds' : ''}`);
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
