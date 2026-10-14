// One theme per step (#705; the locked look, Pax Oct 10). A run climbs steps
// (Locals → State → Nationals, later Globals and Galacticals) and each step
// has its own look: Locals are black and white, State takes that state's
// colours as accents only (the ground stays dark), Nationals are Americana.
// Menus wear Americana too (a navy ground, cream panels).
//
// How a screen wears a theme: wrap it in <StepTheme step state?> (Look.tsx),
// which sets `data-step` and, for a state, the state's colours as CSS vars;
// look/tokens.css maps those onto the --ace-* tokens every component reads.
// The state looks live in src/data/states.ts (#695); `stateLook` is the one
// reader. State ink is never guessed: `inkFor` picks it from the colour.
import type { CSSProperties } from 'react';
import { inkFor } from '../icons/ink';
import { DEFAULT_LOOK, placeById, US_PLACES, type StateLook as PlaceLook } from '../data/states';

export type Step = 'locals' | 'state' | 'nationals' | 'globals' | 'galacticals';
export const STEPS: readonly { id: Step; name: string; look: string }[] = [
  { id: 'locals', name: 'Locals', look: 'black and white' },
  { id: 'state', name: 'State', look: "the state's colours as accents; the ground stays dark" },
  { id: 'nationals', name: 'Nationals', look: 'Americana' },
  { id: 'globals', name: 'Globals', look: 'Americana until its own look lands' },
  { id: 'galacticals', name: 'Galacticals', look: 'Americana until its own look lands' },
];
export const STEP_IDS: readonly Step[] = STEPS.map(s => s.id);
export const stepName = (id: Step): string => STEPS.find(s => s.id === id)?.name ?? id;

/** A state's look as the theme reads it: the place's colours plus its code and name. */
export interface StateLook extends PlaceLook {
  /** Postal code: 'OH'. */
  code: string;
  name: string;
}

/** Every place's code, for pickers. */
export const STATE_CODES: readonly string[] = US_PLACES.map(p => p.abbr);

/** A place's look (DEFAULT_LOOK until #708 fills it), ink from inkFor; any field may be overridden. */
export function stateLook(code: string, over: Partial<Omit<StateLook, 'code' | 'name' | 'flag'>> = {}): StateLook {
  const place = placeById(code);
  if (!place) throw new Error(`look: no state ${code}`);
  const base = place.look ?? DEFAULT_LOOK;
  const merged = { ...base, ...over };
  return { ...merged, code: place.abbr, name: place.name, ink: over.ink ?? (over.primary ? inkFor(over.primary) : base.ink) };
}

/** The inline vars a themed wrapper sets: a state's colours (the tokens map them). */
export function stepThemeVars(step: Step, state?: StateLook): CSSProperties {
  if (step !== 'state' || !state) return {};
  const vars: Record<string, string> = {
    '--ace-state-primary': state.primary,
    '--ace-state-secondary': state.secondary,
    '--ace-state-accent': state.accent,
    '--ace-state-ink': state.ink,
  };
  if (state.ground) vars['--ace-state-ground'] = state.ground;
  return vars as CSSProperties;
}

/** The ribbon under a driver takes one of three looks; later steps wear Nationals' until theirs lands. */
export type RibbonStep = 'locals' | 'state' | 'nationals';
export function ribbonStep(step: Step): RibbonStep {
  return step === 'locals' || step === 'state' ? step : 'nationals';
}

/** The Official Program number on a cover: one per run seed, 1–99. */
export function programNumber(seed: number): number {
  return (Math.abs(Math.floor(seed)) % 99) + 1;
}
