// Procedural league names (#185): "The [Adjective] [Noun]".
// Deterministic from the league seed via the shared mulberry32/deriveSeed
// streams, so the same seed always names its universe the same way. Word
// lists are curated for tone — evocative and a little dramatic, racing-
// adjacent without being literal — and sized so repeats are rare across a
// play session (ADJECTIVES × NOUNS ≈ thousands of combinations).
import { Rng, pick, mulberry32, deriveSeed } from '../engine/rng';

// Evocative, slightly dramatic. Not "Fast" / "Red" — more weather, metal,
// myth, and mood. Each should sound good in front of any noun below.
export const LEAGUE_ADJECTIVES = [
  'Molten', 'Hollow', 'Furious', 'Gilded', 'Fractured', 'Relentless', 'Gleaming',
  'Radiant', 'Boundless', 'Endless', 'Eternal', 'Restless', 'Reckless', 'Ruthless',
  'Velvet', 'Iron', 'Obsidian', 'Crimson', 'Cobalt', 'Amber', 'Pale', 'Vivid',
  'Savage', 'Solemn', 'Sovereign', 'Imperial', 'Outer', 'Inner', 'Lower', 'Upper',
  'Distant', 'Forgotten', 'Hidden', 'Veiled', 'Shrouded', 'Phantom', 'Spectral',
  'Glacial', 'Volcanic', 'Tidal', 'Solar', 'Lunar', 'Stellar', 'Cosmic', 'Astral',
  'Thunderous', 'Roaring', 'Howling', 'Screaming', 'Whispering', 'Silent', 'Quiet',
  'Brazen', 'Bronze', 'Leaden', 'Quicksilver', 'Diamond', 'Granite', 'Marble',
  'Wayward', 'Crooked', 'Twisted', 'Tangled', 'Unbroken', 'Unbound', 'Unruly',
  'Feral', 'Untamed', 'Wild', 'Gentle', 'Cruel', 'Noble', 'Humble', 'Vain',
  'Drowned', 'Burning', 'Frozen', 'Shattered', 'Splintered', 'Buried', 'Risen',
  'Last', 'First', 'Final', 'Lost', 'Found', 'Holy', 'Cursed', 'Blessed', 'Doomed',
];

// League-flavored organizing nouns. Should read like a real championship body —
// circuits, orders, assemblies — not random objects.
export const LEAGUE_NOUNS = [
  'Circuit', 'Grand Prix', 'Compact', 'Order', 'Assembly', 'Commission', 'Collective',
  'Championship', 'Series', 'Cup', 'Trophy', 'League', 'Division', 'Conference',
  'Syndicate', 'Coalition', 'Alliance', 'Federation', 'Confederacy', 'Union', 'Guild',
  'Sprint', 'Gauntlet', 'Crucible', 'Trial', 'Reckoning', 'Procession', 'Parade',
  'Carousel', 'Spiral', 'Circuit Royale', 'Open', 'Invitational', 'Classic', 'Derby',
  'Concord', 'Accord', 'Pact', 'Charter', 'Mandate', 'Decree', 'Dominion', 'Reign',
  'Crown', 'Throne', 'Court', 'Council', 'Senate', 'Tribunal', 'Society', 'Circle',
  'Run', 'Rush', 'Dash', 'Charge', 'Drift', 'Slipstream', 'Apex', 'Chicane',
  'Expanse', 'Frontier', 'Theatre', 'Spectacle', 'Exhibition', 'Tour', 'Odyssey',
];

/** Generate a league name from an rng: "The Molten Circuit". */
export function generateLeagueName(rng: Rng = Math.random): string {
  const adjective = pick(LEAGUE_ADJECTIVES, rng);
  const noun = pick(LEAGUE_NOUNS, rng);
  return `The ${adjective} ${noun}`;
}

/** Deterministic league name straight from a league seed — used as the default
 * when a league is founded without an explicit name. A dedicated derived
 * stream ('genesis','name') so it never disturbs roster/car generation. */
export function leagueNameForSeed(leagueSeed: number): string {
  return generateLeagueName(mulberry32(deriveSeed(leagueSeed, 'genesis', 'name')));
}
