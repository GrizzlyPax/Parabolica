// The icon registry (#350, docs/ICONS.md). game-icons.net replaces every emoji.
//
// Two layers:
//   ICONS     — every vendored SVG (src/assets/icons/<id>.svg) with its author,
//               which is all the Credits page needs (CC BY 3.0).
//   MEANINGS  — what code asks for: a meaning ('weather.rain', 'ui.close'),
//               never a file. Swapping art is a data change here.
//
// SVGs are single-colour: the background square is stripped and the fill is
// `currentColor`, so an icon takes the colour of wherever it sits.
//
// PLACEHOLDERS: the meaning map below is a starter set so the plumbing can be
// tested. The real map is the icon-map issue (#349); a meaning that isn't
// here falls back to the emoji the screen passes in (see <GameIcon>).

/** game-icons.net contributors we vendor from (folder name → credit). */
export const ICON_AUTHORS = {
  lorc: { name: 'Lorc', url: 'http://lorcblog.blogspot.com' },
  delapouite: { name: 'Delapouite', url: 'http://delapouite.com' },
  sbed: { name: 'Sbed', url: 'http://opengameart.org/content/95-game-icons' },
  skoll: { name: 'Skoll' },
} as const satisfies Record<string, { name: string; url?: string }>;

export type IconAuthorId = keyof typeof ICON_AUTHORS;

export interface IconEntry {
  /** The game-icons.net name; also the vendored file's basename. */
  id: string;
  file: string;
  author: IconAuthorId;
}

/** Every vendored icon. Add one: drop `<id>.svg` (currentColor, no
 * background) into src/assets/icons/ and list it here — a test checks both. */
export const ICONS = [
  { id: 'raining', file: 'raining.svg', author: 'lorc' },
  { id: 'fog', file: 'fog.svg', author: 'delapouite' },
  { id: 'sun', file: 'sun.svg', author: 'lorc' },
  { id: 'checkered-flag', file: 'checkered-flag.svg', author: 'delapouite' },
  { id: 'speedometer', file: 'speedometer.svg', author: 'delapouite' },
  { id: 'cancel', file: 'cancel.svg', author: 'sbed' },
  { id: 'race-car', file: 'race-car.svg', author: 'skoll' },
  { id: 'trophy-cup', file: 'trophy-cup.svg', author: 'delapouite' },
] as const satisfies readonly IconEntry[];

export type IconId = (typeof ICONS)[number]['id'];

/** Meaning → icon. Placeholder starter set; the real one is #349. */
export const MEANINGS: Record<string, IconId> = {
  'weather.rain': 'raining',
  'weather.fog': 'fog',
  'weather.clear': 'sun',
  'race.finish': 'checkered-flag',
  'race.car': 'race-car',
  'stat.speed': 'speedometer',
  'season.champion': 'trophy-cup',
  'ui.close': 'cancel',
};

/** The vendored SVG sources, keyed by path (Vite inlines them as strings). */
const RAW = import.meta.glob('../assets/icons/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const BY_ID: Map<string, IconEntry> = new Map(ICONS.map(i => [i.id, i]));

/** Every vendored file's basename, for the no-orphans test. */
export function vendoredIconFiles(): string[] {
  return Object.keys(RAW).map(p => p.slice(p.lastIndexOf('/') + 1));
}

/** Resolve a meaning ('weather.rain') or a raw icon id ('raining') — data
 * fields like `team.iconId` may hold either. Unknown → undefined. */
export function resolveIcon(name: string | undefined): IconEntry | undefined {
  if (!name) return undefined;
  return BY_ID.get(MEANINGS[name] ?? name);
}

/** The inner markup of an icon's SVG (paths only), for inline rendering. */
export function iconBody(entry: IconEntry): string | undefined {
  const raw = RAW[`../assets/icons/${entry.file}`];
  if (!raw) return undefined;
  const open = raw.indexOf('>');
  const close = raw.lastIndexOf('</svg>');
  return open < 0 || close < 0 ? undefined : raw.slice(open + 1, close);
}

/** Credits, grouped by author (World Deck → Credits). */
export function iconCredits(): { author: IconAuthorId; name: string; url?: string; icons: string[] }[] {
  return (Object.keys(ICON_AUTHORS) as IconAuthorId[])
    .map(author => ({ author, ...ICON_AUTHORS[author], icons: ICONS.filter(i => i.author === author).map(i => i.id as string) }))
    .filter(c => c.icons.length > 0);
}

export const ICON_LICENSE = {
  name: 'CC BY 3.0',
  url: 'https://creativecommons.org/licenses/by/3.0/',
  source: 'https://game-icons.net',
};
