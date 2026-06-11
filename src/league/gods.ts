// The appetite gods. Each hungers for a different shape of season — never a
// direct dial, always a statistical appetite the Commissionary must feed.
//
// MVP placeholder: identity and voice only. Appetite evaluators, demands, and
// smiting are PR 5 (COMMISSIONER_MODE_TECH.md) — they will be pure functions
// over the stat lines already accumulating in race digests.

export interface God {
  id: string;
  name: string;
  emoji: string;
  /** Liturgical subtitle shown under the name. */
  epithet: string;
  /** What it hungers for, in its own voice — shown at founding. */
  hunger: string;
  /** Plain-language hint for the Commissionary picking a patron. */
  appetite: string;
}

export const GODS: God[] = [
  {
    id: 'the-scrap-heap',
    name: 'The Scrap Heap',
    emoji: '🔥',
    epithet: 'That Which Collects',
    hunger: 'Bring me the bent chassis and the blown engine. A clean race is a wasted race.',
    appetite: 'Hungers for carnage — crashes, blowouts, DNFs. Safe seasons starve it.',
  },
  {
    id: 'the-stewards',
    name: 'The Stewards',
    emoji: '⚖️',
    epithet: 'The Ones Who Watch',
    hunger: 'Order. Procession. The strong shall finish ahead of the weak, as is written.',
    appetite: 'Hungers for order — favorites winning, clean finishes. Chaos offends it.',
  },
  {
    id: 'the-photo-finish',
    name: 'The Photo Finish',
    emoji: '📸',
    epithet: 'Witness of the Margin',
    hunger: 'Let no one pull away. I want ten winners in sixteen races and a title decided by a lap.',
    appetite: 'Hungers for parity — different winners, tight championships. Dynasties bore it.',
  },
];

export function getGodById(id: string): God {
  return GODS.find(g => g.id === id) ?? GODS[0];
}
