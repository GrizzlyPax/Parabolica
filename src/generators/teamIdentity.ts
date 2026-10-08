// Procedural team identity (#183): a seeded emoji + primary/secondary color
// per team, so every league looks distinct — "the purple 🦆 cars" vs "the
// green 🔥 cars". Deterministic from the league seed. Generated as a BATCH for
// the whole grid so hues can be spaced evenly around the wheel — 11 teams stay
// visually distinguishable across a 22-car field (the hard requirement).
//
// Wiring is opt-in: the hand-crafted CURRENT_TEAMS identities are still the
// default. Call applyProceduralIdentities() (or pass the flag through league
// setup) to flip a league onto procedural looks. Team *names* are untouched —
// this is icon + colors only.
import { Rng, mulberry32, deriveSeed, shuffle } from '../engine/rng';
import { inkFor } from '../icons/ink';

export interface TeamIdentity {
  emoji: string;
  color: string;        // primary, hex
  ink: string;          // white or near-black, picked for the colour
}

// Chaotic-but-curated emoji pool (animals, objects, symbols). Leaning fun over
// literal racing iconography — the absurdist tone the game already wears.
export const IDENTITY_EMOJI = [
  '🦆', '🔥', '🦂', '🐙', '🦅', '🐊', '🦊', '🐺', '🦉', '🦇', '🐝', '🦋',
  '🦈', '🐉', '🦖', '🦣', '🦬', '🐲', '🦚', '🦩', '🦜', '🐍', '🦎', '🐢',
  '⚡', '💎', '🌶️', '🍄', '🌵', '🪐', '☄️', '🌪️', '🔮', '🎲', '🧨', '⚙️',
  '🗿', '🛸', '👑', '🦴', '🧲', '🎯', '🥏', '🪃', '🧪', '🦷', '🪓', '⚓',
];

// HSL → hex. h in [0,360), s/l in [0,1].
function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Generate `count` distinguishable identities from an rng. Hues are spread
 * evenly around the wheel (even spacing + a seeded rotation + small jitter) so
 * no two teams read as the same color on a broadcast. */
export function generateTeamIdentities(rng: Rng, count: number): TeamIdentity[] {
  const emojis = shuffle(IDENTITY_EMOJI, rng).slice(0, count);
  const hueOffset = rng() * 360;
  const step = 360 / count;

  const out: TeamIdentity[] = [];
  for (let i = 0; i < count; i++) {
    // Even slot + sub-slot jitter (< half a step) keeps the spacing but avoids
    // a mechanical rainbow.
    const jitter = (rng() - 0.5) * step * 0.6;
    const hue = (hueOffset + i * step + jitter) % 360;
    // Vivid, readable on a dark broadcast — saturation/lightness kept in band.
    const sat = 0.62 + rng() * 0.28;   // 0.62–0.90
    const light = 0.48 + rng() * 0.12; // 0.48–0.60
    const color = hslToHex(hue, sat, light);
    out.push({ emoji: emojis[i] ?? '🏁', color, ink: inkFor(color) });
  }
  return out;
}

/** Deterministic identities for a league seed — one per team, in team order. */
export function teamIdentitiesForSeed(leagueSeed: number, count: number): TeamIdentity[] {
  return generateTeamIdentities(mulberry32(deriveSeed(leagueSeed, 'genesis', 'identity')), count);
}
