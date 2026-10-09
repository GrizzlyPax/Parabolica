// The icon registry (#350, #351, docs/ICONS.md). game-icons.net replaces every emoji.
//
// Two layers:
//   ICONS     — every vendored SVG (src/assets/icons/<id>.svg) with its author,
//               which is all the Credits page needs (CC BY 3.0).
//   MEANINGS  — what code asks for: a meaning ('race.crash', 'ui.close'),
//               never a file. Swapping art is a data change here.
//
// SVGs are single-colour: the background square is stripped and every fill
// and stroke is `currentColor`, so an icon takes the colour of wherever it
// sits. Each file keeps its own viewBox (most are 0 0 512 512). The Badges set
// is drawn as a disc + ring + glyph; we keep the glyph only (no badge shapes,
// docs/ICONS.md) and crop its viewBox to 48 48 160 160 so it fills like the rest.
//
// The meaning map mirrors the approved table in docs/ICONS.md ("Appendix: icon
// map (UI)"); team icons mirror docs/story/team-identity.md. A test parses
// both docs and fails if code and docs drift apart. Anything not in the map
// (tracks, weather, tags, gods: replaced before they'd need icons) falls back
// to the emoji the screen passes in (see <GameIcon>).

/** game-icons.net contributors we vendor from (repo folder -> credit). */
export const ICON_AUTHORS = {
  lorc: { name: 'Lorc', url: 'http://lorcblog.blogspot.com' },
  delapouite: { name: 'Delapouite', url: 'http://delapouite.com' },
  sbed: { name: 'Sbed', url: 'http://opengameart.org/content/95-game-icons' },
  skoll: { name: 'Skoll' },
  faithtoken: { name: 'Faithtoken', url: 'http://fungustoken.deviantart.com' },
  quoting: { name: 'Quoting' },
  guard13007: { name: 'Guard13007', url: 'https://guard13007.com' },
  'caro-asercion': { name: 'Caro Asercion' },
  // The repo's `badges` folder isn't in its contributor list; game-icons.net
  // files it as its own set, so that's how it's credited.
  badges: { name: 'Badges (game-icons.net)', url: 'https://game-icons.net' },
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
  // UI (docs/ICONS.md appendix)
  { id: 'checkered-flag', file: 'checkered-flag.svg', author: 'delapouite' },
  { id: 'crown', file: 'crown.svg', author: 'badges' },
  { id: 'ringing-bell', file: 'ringing-bell.svg', author: 'lorc' },
  { id: 'flying-flag', file: 'flying-flag.svg', author: 'lorc' },
  { id: 'stopwatch', file: 'stopwatch.svg', author: 'lorc' },
  { id: 'siren', file: 'siren.svg', author: 'skoll' },
  { id: 'spiky-explosion', file: 'spiky-explosion.svg', author: 'lorc' },
  { id: 'cross-mark', file: 'cross-mark.svg', author: 'lorc' },
  { id: 'flat-tire', file: 'flat-tire.svg', author: 'delapouite' },
  { id: 'cogsplosion', file: 'cogsplosion.svg', author: 'lorc' },
  { id: 'spiral-arrow', file: 'spiral-arrow.svg', author: 'lorc' },
  { id: 'skid-mark', file: 'skid-mark.svg', author: 'lorc' },
  { id: 'return-arrow', file: 'return-arrow.svg', author: 'lorc' },
  { id: 'tire-tracks', file: 'tire-tracks.svg', author: 'delapouite' },
  { id: 'spanner', file: 'spanner.svg', author: 'lorc' },
  { id: 'crossed-swords', file: 'crossed-swords.svg', author: 'lorc' },
  { id: 'card-play', file: 'card-play.svg', author: 'quoting' },
  { id: 'microphone', file: 'microphone.svg', author: 'delapouite' },
  { id: 'top-hat', file: 'top-hat.svg', author: 'lorc' },
  { id: 'arena', file: 'arena.svg', author: 'sbed' },
  { id: 'path-distance', file: 'path-distance.svg', author: 'delapouite' },
  { id: 'histogram', file: 'histogram.svg', author: 'delapouite' },
  { id: 'chart', file: 'chart.svg', author: 'delapouite' },
  { id: 'satellite-communication', file: 'satellite-communication.svg', author: 'delapouite' },
  { id: 'hamburger-menu', file: 'hamburger-menu.svg', author: 'delapouite' },
  { id: 'cancel', file: 'cancel.svg', author: 'sbed' },
  { id: 'check-mark', file: 'check-mark.svg', author: 'delapouite' },
  { id: 'house', file: 'house.svg', author: 'delapouite' },
  { id: 'pause-button', file: 'pause-button.svg', author: 'guard13007' },
  { id: 'play-button', file: 'play-button.svg', author: 'guard13007' },
  { id: 'anticlockwise-rotation', file: 'anticlockwise-rotation.svg', author: 'delapouite' },
  { id: 'papers', file: 'papers.svg', author: 'lorc' },
  { id: 'brainstorm', file: 'brainstorm.svg', author: 'lorc' },
  { id: 'sound-waves', file: 'sound-waves.svg', author: 'skoll' },
  { id: 'speedometer', file: 'speedometer.svg', author: 'delapouite' },
  { id: 'metronome', file: 'metronome.svg', author: 'delapouite' },
  { id: 'shamrock', file: 'shamrock.svg', author: 'delapouite' },
  { id: 'afterburn', file: 'afterburn.svg', author: 'lorc' },
  { id: 'heart-beats', file: 'heart-beats.svg', author: 'delapouite' },
  { id: 'fist', file: 'fist.svg', author: 'lorc' },
  { id: 'turbine', file: 'turbine.svg', author: 'delapouite' },
  { id: 'tyre', file: 'tyre.svg', author: 'lorc' },
  { id: 'checked-shield', file: 'checked-shield.svg', author: 'lorc' },
  { id: 'car-wheel', file: 'car-wheel.svg', author: 'delapouite' },
  { id: 'toolbox', file: 'toolbox.svg', author: 'delapouite' },
  { id: 'gloves', file: 'gloves.svg', author: 'delapouite' },
  { id: 'gear-hammer', file: 'gear-hammer.svg', author: 'lorc' },
  { id: 'mechanic-garage', file: 'mechanic-garage.svg', author: 'delapouite' },
  { id: 'dna1', file: 'dna1.svg', author: 'lorc' },
  { id: 'hourglass', file: 'hourglass.svg', author: 'lorc' },
  { id: 'scroll-unfurled', file: 'scroll-unfurled.svg', author: 'lorc' },
  { id: 'full-motorcycle-helmet', file: 'full-motorcycle-helmet.svg', author: 'delapouite' },
  { id: 'cog', file: 'cog.svg', author: 'lorc' },
  { id: 'card-random', file: 'card-random.svg', author: 'faithtoken' },
  { id: 'card-pick', file: 'card-pick.svg', author: 'faithtoken' },
  { id: 'lockers', file: 'lockers.svg', author: 'delapouite' },
  { id: 'card-draw', file: 'card-draw.svg', author: 'faithtoken' },
  { id: 'park-bench', file: 'park-bench.svg', author: 'delapouite' },
  { id: 'vintage-robot', file: 'vintage-robot.svg', author: 'lorc' },
  { id: 'back-forth', file: 'back-forth.svg', author: 'lorc' },
  { id: 'laurels-trophy', file: 'laurels-trophy.svg', author: 'delapouite' },
  // Car vehicles + driver portraits (docs/story/vehicles-portraits.md, #489)
  { id: 'f1-car', file: 'f1-car.svg', author: 'skoll' },
  { id: 'city-car', file: 'city-car.svg', author: 'delapouite' },
  { id: 'jeep', file: 'jeep.svg', author: 'delapouite' },
  { id: 'truck', file: 'truck.svg', author: 'delapouite' },
  { id: 'tow-truck', file: 'tow-truck.svg', author: 'delapouite' },
  { id: 'farm-tractor', file: 'farm-tractor.svg', author: 'delapouite' },
  { id: 'food-truck', file: 'food-truck.svg', author: 'delapouite' },
  { id: 'surfer-van', file: 'surfer-van.svg', author: 'delapouite' },
  { id: 'bus', file: 'bus.svg', author: 'delapouite' },
  { id: 'steamroller', file: 'steamroller.svg', author: 'caro-asercion' },
  { id: 'caravan', file: 'caravan.svg', author: 'delapouite' },
  { id: 'forklift', file: 'forklift.svg', author: 'delapouite' },
  { id: 'kick-scooter', file: 'kick-scooter.svg', author: 'delapouite' },
  { id: 'dutch-bike', file: 'dutch-bike.svg', author: 'delapouite' },
  { id: 'aero-bike', file: 'aero-bike.svg', author: 'delapouite' },
  { id: 'unicycle', file: 'unicycle.svg', author: 'delapouite' },
  { id: 'shopping-cart', file: 'shopping-cart.svg', author: 'delapouite' },
  { id: 'mine-truck', file: 'mine-truck.svg', author: 'delapouite' },
  { id: 'bulldozer', file: 'bulldozer.svg', author: 'delapouite' },
  // (full-motorcycle-helmet, the usual portrait, is above as entity.driver)
  { id: 'billed-cap', file: 'billed-cap.svg', author: 'delapouite' },
  { id: 'plane-pilot', file: 'plane-pilot.svg', author: 'delapouite' },
  { id: 'mustache', file: 'mustache.svg', author: 'delapouite' },
  { id: 'sunglasses', file: 'sunglasses.svg', author: 'delapouite' },
  { id: 'beard', file: 'beard.svg', author: 'lorc' },
  { id: 'western-hat', file: 'western-hat.svg', author: 'delapouite' },
  { id: 'steampunk-goggles', file: 'steampunk-goggles.svg', author: 'delapouite' },
  { id: 'outback-hat', file: 'outback-hat.svg', author: 'delapouite' },
  { id: 'winter-hat', file: 'winter-hat.svg', author: 'delapouite' },
  { id: 'skimmer-hat', file: 'skimmer-hat.svg', author: 'delapouite' },
  { id: 'captain-hat-profile', file: 'captain-hat-profile.svg', author: 'delapouite' },
  { id: 'baby-face', file: 'baby-face.svg', author: 'delapouite' },
  { id: 'astronaut-helmet', file: 'astronaut-helmet.svg', author: 'delapouite' },
  { id: 'diving-helmet', file: 'diving-helmet.svg', author: 'delapouite' },
  { id: 'mining-helmet', file: 'mining-helmet.svg', author: 'delapouite' },
  { id: 'flower-hat', file: 'flower-hat.svg', author: 'delapouite' },
  { id: 'party-hat', file: 'party-hat.svg', author: 'delapouite' },
  // Teams (docs/story/team-identity.md)
  { id: 'charging-bull', file: 'charging-bull.svg', author: 'delapouite' },
  { id: 'eagle-emblem', file: 'eagle-emblem.svg', author: 'lorc' },
  { id: 'bear-head', file: 'bear-head.svg', author: 'delapouite' },
  { id: 'raven', file: 'raven.svg', author: 'lorc' },
  { id: 'steering-wheel', file: 'steering-wheel.svg', author: 'delapouite' },
  { id: 'scooter', file: 'scooter.svg', author: 'delapouite' },
  { id: 'pocket-watch', file: 'pocket-watch.svg', author: 'skoll' },
  { id: 'hexagonal-nut', file: 'hexagonal-nut.svg', author: 'delapouite' },
  { id: 'anchor', file: 'anchor.svg', author: 'lorc' },
  { id: 'anvil', file: 'anvil.svg', author: 'badges' },
  { id: 'race-car', file: 'race-car.svg', author: 'skoll' },
  { id: 'horse-head', file: 'horse-head.svg', author: 'delapouite' },
  { id: 'poker-hand', file: 'poker-hand.svg', author: 'lorc' },
  { id: 'sprout', file: 'sprout.svg', author: 'lorc' },
  { id: 'stag-head', file: 'stag-head.svg', author: 'lorc' },
  { id: 'scorpion', file: 'scorpion.svg', author: 'lorc' },
  { id: 'checkered-diamond', file: 'checkered-diamond.svg', author: 'lorc' },
  { id: 'ribbon', file: 'ribbon.svg', author: 'lorc' },
  { id: 'champagne-cork', file: 'champagne-cork.svg', author: 'delapouite' },
  { id: 'pine-tree', file: 'pine-tree.svg', author: 'lorc' },
  { id: 'envelope', file: 'envelope.svg', author: 'lorc' },
  { id: 'sun', file: 'sun.svg', author: 'badges' },
  { id: 'light-bulb', file: 'light-bulb.svg', author: 'lorc' },
  { id: 'rabbit', file: 'rabbit.svg', author: 'delapouite' },
  { id: 'castle', file: 'castle.svg', author: 'delapouite' },
  { id: 'lighthouse', file: 'lighthouse.svg', author: 'delapouite' },
  { id: 'volcano', file: 'volcano.svg', author: 'lorc' },
  { id: 'water-drop', file: 'water-drop.svg', author: 'sbed' },
] as const satisfies readonly IconEntry[];

export type IconId = (typeof ICONS)[number]['id'];

/** Meaning -> icon. Mirrors docs/ICONS.md "Appendix: icon map (UI)". */
export const MEANINGS = {
  'race.finish': 'checkered-flag',
  'race.lead_change': 'crown',
  'race.halfway': 'ringing-bell',
  'race.final_lap': 'flying-flag',
  'race.fastest_lap': 'stopwatch',
  'race.safety_car': 'siren',
  'race.crash': 'spiky-explosion',
  'race.dnf': 'cross-mark',
  'race.tire_failure': 'flat-tire',
  'race.mechanical': 'cogsplosion',
  'race.spin': 'spiral-arrow',
  'race.lockup': 'skid-mark',
  'race.wide': 'return-arrow',
  'race.flatspot': 'tire-tracks',
  'race.pit_stop': 'spanner',
  'race.battle': 'crossed-swords',
  'race.card_trigger': 'card-play',
  'voice.booth': 'microphone',
  'voice.marbles': 'top-hat',
  'voice.track': 'arena',
  'view.track': 'path-distance',
  'view.detail': 'histogram',
  'view.lapchart': 'chart',
  'ui.feed': 'satellite-communication',
  'ui.menu': 'hamburger-menu',
  'ui.close': 'cancel',
  'ui.done': 'check-mark',
  'ui.home': 'house',
  'ui.pause': 'pause-button',
  'ui.play': 'play-button',
  'ui.restart': 'anticlockwise-rotation',
  'ui.copy': 'papers',
  'ui.idea': 'brainstorm',
  'ui.dictate': 'sound-waves',
  'stat.speed': 'speedometer',
  'stat.consistency': 'metronome',
  'stat.luck': 'shamrock',
  'stat.acceleration': 'afterburn',
  'stat.endurance': 'heart-beats',
  'stat.aggression': 'fist',
  'stat.power': 'turbine',
  'stat.grip': 'tyre',
  'stat.reliability': 'checked-shield',
  'stat.tyre_management': 'car-wheel',
  'stat.pit_crew': 'toolbox',
  'card.gear': 'cog',
  'card.equipment': 'gloves',
  'card.upgrade': 'gear-hammer',
  'card.facility': 'mechanic-garage',
  'card.trait': 'dna1',
  'card.effect': 'hourglass',
  'card.rule': 'scroll-unfurled',
  'entity.driver': 'full-motorcycle-helmet',
  'season.pack': 'card-random',
  'season.pack_open': 'card-pick',
  'season.locker': 'lockers',
  'season.draft': 'card-draw',
  'season.bench': 'park-bench',
  'season.cpu': 'vintage-robot',
  'season.handoff': 'back-forth',
  'season.champion': 'laurels-trophy',
} as const satisfies Record<string, IconId>;

export type Meaning = keyof typeof MEANINGS;

/** Card stat -> icon meaning (Cards revamp, docs/CARDS.md). Keys are the
 * engine's stat names, so the generated deck can look an icon up directly. */
export const STAT_ICONS = {
  baseSpeed: 'stat.speed',
  consistency: 'stat.consistency',
  luck: 'stat.luck',
  acceleration: 'stat.acceleration',
  endurance: 'stat.endurance',
  aggression: 'stat.aggression',
  power: 'stat.power',
  grip: 'stat.grip',
  reliability: 'stat.reliability',
  tireManagement: 'stat.tyre_management',
  pitCrew: 'stat.pit_crew',
} as const satisfies Record<string, Meaning>;

/** Card kind -> icon meaning (the card frame's type mark). */
export const CARD_KIND_ICONS = {
  equipment: 'card.equipment',
  upgrade: 'card.upgrade',
  facility: 'card.facility',
  trait: 'card.trait',
  effect: 'card.effect',
  rule: 'card.rule',
} as const satisfies Record<string, Meaning>;

/** The vendored SVG sources, keyed by path (Vite inlines them as strings). */
const RAW = import.meta.glob('../assets/icons/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const BY_ID: Map<string, IconEntry> = new Map(ICONS.map(i => [i.id, i]));

/** Every vendored file's basename, for the no-orphans test. */
export function vendoredIconFiles(): string[] {
  return Object.keys(RAW).map(p => p.slice(p.lastIndexOf('/') + 1));
}

/** Resolve a meaning ('race.crash') or a raw icon id ('spiky-explosion') —
 * data fields like `team.iconId` may hold either. Unknown -> undefined. */
export function resolveIcon(name: string | undefined): IconEntry | undefined {
  if (!name) return undefined;
  return BY_ID.get((MEANINGS as Record<string, string>)[name] ?? name);
}

const rawOf = (entry: IconEntry) => RAW[`../assets/icons/${entry.file}`];

/** The inner markup of an icon's SVG (paths only), for inline rendering. */
export function iconBody(entry: IconEntry): string | undefined {
  const raw = rawOf(entry);
  if (!raw) return undefined;
  const open = raw.indexOf('>');
  const close = raw.lastIndexOf('</svg>');
  return open < 0 || close < 0 ? undefined : raw.slice(open + 1, close);
}

/** The icon's own viewBox (most are '0 0 512 512'; the Badges set is 256). */
export function iconViewBox(entry: IconEntry): string {
  return /viewBox="([^"]+)"/.exec(rawOf(entry) ?? '')?.[1] ?? '0 0 512 512';
}

/** Credits, grouped by author (World Deck -> Credits). */
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
