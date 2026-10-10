// One theme per step (#705; the locked look, Pax Oct 10). A run climbs steps
// (Locals → State → Nationals, later Globals and Galacticals) and each step
// has its own look: Locals are black and white, State takes that state's
// colours as accents only (the ground stays dark), Nationals are Americana.
// Menus wear Americana too (a navy ground, cream panels).
//
// How a screen wears a theme: wrap it in <StepTheme step state?> (Look.tsx),
// which sets `data-step` and, for a state, the state's colours as CSS vars;
// look/tokens.css maps those onto the --ace-* tokens every component reads.
// State ink is never guessed: `inkFor` (icons/ink.ts) picks it from the colour.
import type { CSSProperties } from 'react';
import { inkFor } from '../icons/ink';

export type Step = 'locals' | 'state' | 'nationals' | 'globals' | 'galacticals';
export const STEPS: readonly { id: Step; name: string; look: string }[] = [
  { id: 'locals', name: 'Locals', look: 'black and white' },
  { id: 'state', name: 'State', look: "the state's colours as accents; the ground stays dark" },
  { id: 'nationals', name: 'Nationals', look: 'Americana' },
  { id: 'globals', name: 'Globals', look: 'Americana until its own look lands' },
  { id: 'galacticals', name: 'Galacticals', look: 'Americana until its own look lands' },
];
export const STEP_IDS: readonly Step[] = STEPS.map(s => s.id);

/** A state's look (#695 carries these on the state data; #708 fills all 52). */
export interface StateLook {
  /** Postal code: 'OH'. */
  code: string;
  name: string;
  /** The bar, the buttons, the sash edge. */
  primary: string;
  /** The sash's ink, the second colour of the flag. */
  secondary: string;
  /** The flag's highlight (the wheel-flag reads it; the sash's wheels stay gold). */
  accent: string;
  /** Text on `primary`: from inkFor, never a guess. */
  ink: string;
  /** An optional dark ground tint; absent = the navy. */
  ground?: string;
}

type LookSeed = Omit<StateLook, 'ink'> & { ink?: string };
const look = (s: LookSeed): StateLook => ({ ...s, ink: s.ink ?? inkFor(s.primary) });

/** Three states from the mock-ups (plus Texas), a STUB until #695 / #708 land the data. */
export const STATE_LOOKS: Record<string, StateLook> = {
  OH: look({ code: 'OH', name: 'Ohio', primary: '#b8312f', secondary: '#1d2b4f', accent: '#efe6d2', ground: '#0f1730' }),
  AZ: look({ code: 'AZ', name: 'Arizona', primary: '#ce5c17', secondary: '#002868', accent: '#fed700', ground: '#1c1410' }),
  VT: look({ code: 'VT', name: 'Vermont', primary: '#1b4d3e', secondary: '#1b4d3e', accent: '#c99a3a', ground: '#0f241c' }),
  TX: look({ code: 'TX', name: 'Texas', primary: '#bf0a30', secondary: '#002868', accent: '#efe6d2', ground: '#0d1630' }),
};
export const STATE_CODES = Object.keys(STATE_LOOKS);

/** A state's look with the ink read from its primary (any field may be overridden). */
export function stateLook(code: string, over: Partial<LookSeed> = {}): StateLook {
  const base = STATE_LOOKS[code];
  if (!base) throw new Error(`look: no state ${code}`);
  const merged = { ...base, ...over };
  return { ...merged, ink: over.ink ?? (over.primary ? inkFor(over.primary) : base.ink) };
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

/**
 * v0.7's four-league run onto the three steps, for the Ladder's proof: the
 * first league is Locals, the last Nationals, the ones between State. #696
 * (the Ace America run core) replaces this with the real steps.
 */
export function stepForLeague(index: number, leagues: number): Step {
  if (index <= 0) return 'locals';
  if (index >= leagues - 1) return 'nationals';
  return 'state';
}

/** The Official Program number on a cover: one per run seed, 1–99. */
export function programNumber(seed: number): number {
  return (Math.abs(Math.floor(seed)) % 99) + 1;
}
