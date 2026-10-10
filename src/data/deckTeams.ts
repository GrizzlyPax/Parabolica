// The base-deck teams (28): world factions of Parabolica, seven of each kind.
// Radio + Pax, Oct 8. Source of truth: docs/story/team-identity.md (not canon
// until it moves into the story bible). One colour + an ink for the logo icon
// (docs/ICONS.md); no secondary colour.
//
// Data only for now (#356 split, Pax Oct 8): the World Deck shows these, but
// the live grid (Quick Race, leagues) still draws from CURRENT_TEAMS in
// ./teams.ts until Apex swaps it with the fingerprint bump (#356 + #337).

import { inkFor } from '../icons/ink';

export type TeamKind = 'works' | 'privateer' | 'dynasty' | 'regional';

export const TEAM_KINDS: { kind: TeamKind; title: string; hint: string }[] = [
  { kind: 'works', title: 'Works manufacturers', hint: 'The big marques: factory money, factory habits.' },
  { kind: 'privateer', title: 'Privateer garages', hint: 'Small shops that race anyway.' },
  { kind: 'dynasty', title: 'Family dynasties', hint: 'One family, generations deep.' },
  { kind: 'regional', title: 'Regional / city teams', hint: 'A place that races as itself.' },
];

export interface DeckTeam {
  id: string;
  name: string;
  kind: TeamKind;
  /** Fallback while screens migrate (docs/ICONS.md); the logo is iconId. */
  emoji: string;
  /** game-icons id, vendored in src/assets/icons (src/icons/registry.ts). */
  iconId: string;
  /** The team's one colour. */
  color: string;
  /** The logo icon's colour on `color`: white or near-black, from inkFor (Radio's table, #639). */
  ink: string;
  /** One line. Folk custom, not ghost story. */
  description: string;
}

export const BASE_DECK_TEAMS: DeckTeam[] = ([
  { id: 'vantor-motorwerke', name: 'Vantor Motorwerke', kind: 'works', emoji: '🐂', iconId: 'charging-bull', color: '#E8242F', description: 'Industrial giant. Every car is built on the same night of the year.' },
  { id: 'halcyon', name: 'Halcyon', kind: 'works', emoji: '🦅', iconId: 'eagle-emblem', color: '#006EBE', description: 'Grand tourers. No Halcyon has ever been sold; they are only raced.' },
  { id: 'orsa', name: 'Orsa', kind: 'works', emoji: '🐻', iconId: 'bear-head', color: '#087C77', description: 'Northern marque. The factory clocks run eleven minutes slow, by policy.' },
  { id: 'corvane', name: 'Corvane', kind: 'works', emoji: '🐦', iconId: 'raven', color: '#9B8AFE', description: 'Luxury house. The badge was redrawn after the founder dreamed it.' },
  { id: 'calloway', name: 'Calloway', kind: 'works', emoji: '🛞', iconId: 'steering-wheel', color: '#F4EEDE', description: 'Every Calloway is road-tested on the same nine miles of road, at dawn.' },
  { id: 'brisa', name: 'Brisa', kind: 'works', emoji: '🛵', iconId: 'scooter', color: '#0BAEE0', description: 'Scooter maker gone racing. Every car leaves the factory with a full tank and a bell.' },
  { id: 'arden', name: 'Arden', kind: 'works', emoji: '⏱️', iconId: 'pocket-watch', color: '#FFB000', description: 'Clocks and engines in the same building. Both are wound by hand on Mondays.' },
  { id: 'seven-bolt-racing', name: 'Seven Bolt Racing', kind: 'privateer', emoji: '🔩', iconId: 'hexagonal-nut', color: '#C31851', description: 'Every wheel has seven bolts. Nobody remembers why.' },
  { id: 'low-tide-racing', name: 'Low Tide Racing', kind: 'privateer', emoji: '⚓', iconId: 'anchor', color: '#1BB4B8', description: 'The garage sits below the tideline. They work between tides.' },
  { id: 'kiln-lane-motorsport', name: 'Kiln Lane Motorsport', kind: 'privateer', emoji: '⚒️', iconId: 'anvil', color: '#945F0E', description: 'Brick sheds and a forge. The engine is started with a match.' },
  { id: 'tinplate', name: 'Tinplate', kind: 'privateer', emoji: '🏎️', iconId: 'race-car', color: '#B6BBC1', description: 'A car that looks like a toy and is faster than it should be.' },
  { id: 'ostler-finch', name: 'Ostler & Finch', kind: 'privateer', emoji: '🐴', iconId: 'horse-head', color: '#B47B46', description: 'Was a coaching inn. The stable doors still get locked at night.' },
  { id: 'cinder-row', name: 'Cinder Row', kind: 'privateer', emoji: '🃏', iconId: 'poker-hand', color: '#718295', description: 'Six garages on one street share one car. Who drives is settled by a card game.' },
  { id: 'glasshouse', name: 'Glasshouse', kind: 'privateer', emoji: '🌱', iconId: 'sprout', color: '#8DCC6E', description: 'The garage is an old greenhouse. Every car has a plant in the cockpit.' },
  { id: 'hargreave', name: 'Hargreave', kind: 'dynasty', emoji: '🦌', iconId: 'stag-head', color: '#507B07', description: 'The founder\'s chair stays in the garage, empty, facing the track.' },
  { id: 'moreau-tallis', name: 'Moreau-Tallis', kind: 'dynasty', emoji: '🦂', iconId: 'scorpion', color: '#8F3DC0', description: 'A marriage of two rival teams. The garage still has a line down the middle.' },
  { id: 'kanzaki', name: 'Kanzaki', kind: 'dynasty', emoji: '💠', iconId: 'checkered-diamond', color: '#E63281', description: 'The family crest changes slightly every ten years.' },
  { id: 'achterberg', name: 'Achterberg', kind: 'dynasty', emoji: '🎗️', iconId: 'ribbon', color: '#C0502A', description: 'Run by a widow and her four sons. The whole crew wears a black armband, always.' },
  { id: 'valcourt', name: 'Valcourt', kind: 'dynasty', emoji: '🍾', iconId: 'champagne-cork', color: '#D95FFC', description: 'Old wine family. They pour one glass on the grid before every start.' },
  { id: 'ishida', name: 'Ishida', kind: 'dynasty', emoji: '🌲', iconId: 'pine-tree', color: '#FF4DB8', description: 'Every new driver plants a tree at the family track. The oldest ones are very tall.' },
  { id: 'pell-pell', name: 'Pell & Pell', kind: 'dynasty', emoji: '✉️', iconId: 'envelope', color: '#5454EA', description: 'Brothers who haven\'t spoken in twenty years. They run the team by letter.' },
  { id: 'corriva', name: 'Corriva', kind: 'regional', emoji: '☀️', iconId: 'sun', color: '#F8767A', description: 'Coast city that keeps siesta. They never test before 4pm.' },
  { id: 'lumen', name: 'Lumen', kind: 'regional', emoji: '💡', iconId: 'light-bulb', color: '#DED903', description: 'A city whose lights have never gone off.' },
  { id: 'fennick-downs', name: 'Fennick Downs', kind: 'regional', emoji: '🐇', iconId: 'rabbit', color: '#4EBB05', description: 'Farm country. The whole crew are related, and nobody admits how.' },
  { id: 'ambergate', name: 'Ambergate', kind: 'regional', emoji: '🏰', iconId: 'castle', color: '#C2A02A', description: 'A walled town. The gates close at dusk, and the team must be back inside.' },
  { id: 'saint-orrin', name: 'Saint Orrin', kind: 'regional', emoji: '🗼', iconId: 'lighthouse', color: '#5E9EFD', description: 'Island city. The ferry waits for the team, never the other way round.' },
  { id: 'caldera', name: 'Caldera', kind: 'regional', emoji: '🌋', iconId: 'volcano', color: '#F87103', description: 'A city built inside an old crater. Race day starts with the bells.' },
  { id: 'tessaly', name: 'Tessaly', kind: 'regional', emoji: '💧', iconId: 'water-drop', color: '#0DB98E', description: 'Spa town. Drivers take the waters before every race and won\'t say why.' },
] as Omit<DeckTeam, 'ink'>[]).map(t => ({ ...t, ink: inkFor(t.color) }));

export function getDeckTeamById(id: string): DeckTeam | undefined {
  return BASE_DECK_TEAMS.find(t => t.id === id);
}
