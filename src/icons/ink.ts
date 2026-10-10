// Ink: the text/icon colour drawn on a team's primary (docs/ICONS.md → colour
// system). Pure, so data modules (src/data/teams.ts) can pick an ink without
// pulling in React. One rule (#639): the 28 deck colours take Radio's table
// ink; any other colour gets whichever of white / near-black contrasts more.
import { DECK_COLOURS } from '../data/teamColours';

const TABLE_INK = new Map(DECK_COLOURS.map(c => [c.hex.toLowerCase(), c.ink]));

export interface InkTeamLike {
  color: string;
  ink?: string;
}

/** The neutral ink: near-black, matching --pw-ground. */
export const INK_DARK = '#0b0b0c';
export const INK_LIGHT = '#ffffff';

function luminance(hex: string): number | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The ink for `color`: Radio's table for a deck colour, else white or
 * near-black, whichever contrasts more (WCAG ratio). */
export function inkFor(color: string): string {
  const table = TABLE_INK.get(color.trim().toLowerCase());
  if (table) return table;
  const l = luminance(color);
  if (l === null) return INK_LIGHT;
  const vsWhite = 1.05 / (l + 0.05);
  const vsDark = (l + 0.05) / ((luminance(INK_DARK) ?? 0) + 0.05);
  return vsDark > vsWhite ? INK_DARK : INK_LIGHT;
}

export function teamInk(team: InkTeamLike): string {
  return team.ink ?? inkFor(team.color);
}

