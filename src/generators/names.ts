// Driver name generation (#191): tiered, international, deterministic.
//
// The pool is built in tiers so the funny names land — "Nugget Marshall" is a
// gift precisely because it sits in a grid of believable international names.
//   T1  international common names — the dominant base
//   T2  absurdist names — the memorable minority (Blaseball-inspired)
//   T3  mononyms — one-name legends ("Indigo", "Blaze")
//   T4  corrupted names — a glitch in the universe, genuinely rare
// Every draw runs off the shared seeded rng (engine/rng.ts), so a league seed
// always produces the same grid.
import { Rng, pick } from '../engine/rng';

// === TIER 1 — international common names (the believable base) ===
// Drawn from common given/family names across many name traditions. Flat,
// independent draws — a slightly-mixed global grid is the goal, not
// region-locked pairing. Sized so repeats are rare across a 22-driver grid.
export const INTL_FIRST_NAMES = [
  // English / Anglophone
  'James', 'Mary', 'William', 'Sarah', 'Thomas', 'Emily', 'George', 'Grace',
  'Henry', 'Alice', 'Edward', 'Charlotte', 'Oliver', 'Amelia', 'Arthur', 'Florence',
  // Spanish / Latin American
  'Mateo', 'Sofía', 'Santiago', 'Valentina', 'Diego', 'Camila', 'Alejandro', 'Lucía',
  'Javier', 'Isabella', 'Carlos', 'Daniela', 'Andrés', 'Gabriela', 'Rafael', 'Mariana',
  // Portuguese / Brazilian
  'João', 'Beatriz', 'Pedro', 'Larissa', 'Gustavo', 'Letícia', 'Rodrigo', 'Fernanda',
  'Thiago', 'Juliana', 'Bruno', 'Caio', 'Renata',
  // Arabic
  'Omar', 'Layla', 'Yusuf', 'Fatima', 'Khalid', 'Aisha', 'Tariq', 'Noor',
  'Hassan', 'Mariam', 'Karim', 'Zara', 'Samir', 'Amina', 'Bilal', 'Salma',
  // Chinese (romanized)
  'Wei', 'Mei', 'Jun', 'Ling', 'Hao', 'Xia', 'Feng', 'Yan',
  'Chen', 'Jing', 'Bo', 'Hui', 'Lei', 'Fang',
  // Indian / South Asian
  'Arjun', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Diya', 'Aditya', 'Isha',
  'Kabir', 'Meera', 'Rahul', 'Saanvi', 'Dev', 'Nisha', 'Aryan', 'Kavya',
  // Nigerian / West African
  'Chidi', 'Amara', 'Emeka', 'Ngozi', 'Tunde', 'Folake', 'Obi', 'Zainab',
  'Adaeze', 'Kunle', 'Ifeoma', 'Bayo', 'Temi',
  // Japanese (romanized)
  'Haruki', 'Yuki', 'Sora', 'Aoi', 'Ren', 'Hana', 'Kaito', 'Rin',
  'Daiki', 'Mio', 'Takumi', 'Saki', 'Riku', 'Nao',
  // French
  'Lucas', 'Léa', 'Hugo', 'Manon', 'Théo', 'Chloé', 'Antoine', 'Inès',
  'Mathis', 'Jade', 'Gabriel', 'Louise', 'Maxime', 'Camille',
  // German
  'Lukas', 'Hannah', 'Felix', 'Lena', 'Jonas', 'Mia', 'Finn', 'Emma',
  'Paul', 'Lara', 'Niklas', 'Greta', 'Matthias', 'Frieda',
  // Eastern European (Polish / Russian / Czech / Balkan)
  'Piotr', 'Zofia', 'Dmitri', 'Katarzyna', 'Ivan', 'Milena', 'Marek', 'Vesna',
  'Andrei', 'Ola', 'Tomas', 'Nadia', 'Luka', 'Petra', 'Nikola', 'Ana',
  // Korean / SE Asian additions
  'Minjun', 'Seoyeon', 'Jihoon', 'Linh', 'Anh', 'Ravi', 'Indah',
];

export const INTL_LAST_NAMES = [
  // English / Anglophone
  'Smith', 'Walker', 'Hughes', 'Foster', 'Bennett', 'Coleman', 'Hayes', 'Wells',
  'Barnes', 'Brooks', 'Reed', 'Shaw', 'Webb', 'Holt', 'Ford', 'Lane',
  // Spanish / Latin American
  'García', 'Martínez', 'Rodríguez', 'López', 'González', 'Hernández', 'Ramírez', 'Torres',
  'Flores', 'Ramos', 'Castillo', 'Vargas', 'Ortega', 'Mendoza', 'Guerrero', 'Delgado',
  // Portuguese / Brazilian
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Almeida', 'Ferreira',
  'Ribeiro', 'Carvalho', 'Gomes', 'Barbosa', 'Rocha', 'Cardoso',
  // Arabic
  'Hassan', 'Ali', 'Ahmed', 'Khan', 'Rahman', 'Saleh', 'Mansour', 'Haddad',
  'Nasser', 'Aziz', 'Karim', 'Farah', 'Said', 'Habib',
  // Chinese (romanized)
  'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao',
  'Wu', 'Zhou', 'Xu', 'Sun', 'Lin', 'Guo',
  // Indian / South Asian
  'Patel', 'Sharma', 'Singh', 'Kumar', 'Gupta', 'Reddy', 'Nair', 'Mehta',
  'Iyer', 'Bose', 'Rao', 'Chowdhury', 'Joshi', 'Kapoor',
  // Nigerian / West African
  'Okafor', 'Adeyemi', 'Okonkwo', 'Eze', 'Balogun', 'Abubakar', 'Nwosu', 'Adebayo',
  'Okeke', 'Afolabi', 'Chukwu', 'Olawale', 'Danjuma', 'Mensah',
  // Japanese (romanized)
  'Tanaka', 'Suzuki', 'Sato', 'Takahashi', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura',
  'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Matsumoto',
  // French
  'Dubois', 'Lefèvre', 'Moreau', 'Laurent', 'Girard', 'Bonnet', 'Rousseau', 'Mercier',
  'Fontaine', 'Chevalier', 'Renaud', 'Marchand', 'Lemaire', 'Garnier',
  // German
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Wagner', 'Becker', 'Hoffmann',
  'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf',
  // Eastern European
  'Kowalski', 'Nowak', 'Volkov', 'Sokolov', 'Novák', 'Horák', 'Petrov', 'Jovanović',
  'Wójcik', 'Kaczmarek', 'Ivanov', 'Marković', 'Kovač', 'Popescu',
  // Korean / SE Asian additions
  'Kim', 'Park', 'Choi', 'Nguyen', 'Tran', 'Pham', 'Wijaya', 'Putra',
];

// === TIER 2 — absurdist names (the memorable minority) ===
// The old pool, kept but demoted to a minority tier so it stays a treat.
export const ABSURD_FIRST_NAMES = [
  'Brisket', 'Sandwich', 'Crouton', 'Noodle', 'Pretzel', 'Waffle', 'Dumpling',
  'Peanut', 'Pickle', 'Biscuit', 'Muffin', 'Gravy', 'Custard', 'Trifle',
  'Mercy', 'Justice', 'Patience', 'Courage', 'Notion', 'Paradox', 'Hubris',
  'Whimsy', 'Folly', 'Candor', 'Valor', 'Caveat', 'Reverie', 'Quandary',
  'Beep', 'Click', 'Buzz', 'Static', 'Echo', 'Crackle', 'Rumble', 'Sizzle',
  'Yesterday', 'Tomorrow', 'Midnight', 'Dusk', 'Dawn', 'Someday', 'Eleven',
  'Foggy', 'Drizzle', 'Frost', 'Thunder', 'Blizzard', 'Tropical', 'Hazy',
  'Sixto', 'Cricket', 'Tuesday', 'Decimal', 'Toggle', 'Provisional', 'Quasi',
  'Loading', 'Buffering', 'Offline', 'Cached', 'Corrupted', 'Pixelated', 'Stale',
];

export const ABSURD_LAST_NAMES = [
  'Marshall', 'Lamppost', 'Sidewalk', 'Elevator', 'Hallway', 'Cubicle', 'Vestibule',
  'Mezzanine', 'Threshold', 'Turnstile', 'Stairwell', 'Mailroom', 'Pantry',
  'Incorporated', 'Holdings', 'Solutions', 'Dynamics', 'Logistics', 'Syndicate',
  'Collective', 'Conglomerate', 'Ventures', 'Foundry', 'Nexus', 'Vertex',
  'Void', 'Null', 'Hollow', 'Faded', 'Forgotten', 'Vanished', 'Severed',
  'Shattered', 'Splintered', 'Forbidden', 'Doomed', 'Veiled', 'Shrouded',
  'Mechanic', 'Consultant', 'Auditor', 'Liaison', 'Foreman', 'Custodian',
  'Archivist', 'Steward', 'Warden', 'Underwriter', 'Appraiser', 'Surveyor',
  'Placeholder', 'Undefined', 'Redacted', 'Classified', 'Anonymous', 'Miscellaneous',
];

// === TIER 3 — mononyms (one-name legends) ===
export const MONONYMS = [
  'Indigo', 'Blaze', 'Nugget', 'Vesper', 'Echo', 'Onyx', 'Sol', 'Wren',
  'Cinder', 'Marlow', 'Zephyr', 'Atlas', 'Juno', 'Cypher', 'Kestrel', 'Nova',
  'Quill', 'Rook', 'Sable', 'Tempest', 'Vex', 'Bishop', 'Cleo', 'Dash',
  'Ember', 'Fable', 'Ghost', 'Halo', 'Jinx', 'Lux', 'Maverick', 'Phoenix',
  'Rebel', 'Slate', 'Tigris', 'Vault', 'Wilder', 'Zenith', 'Banjo', 'Comet',
];

// Tier weights (approximate — see tests). T1 must dominate.
export const NAME_TIER_WEIGHTS = {
  international: 0.72,
  absurd: 0.17,
  mononym: 0.09,
  corrupted: 0.02,
} as const;

export type NameTier = keyof typeof NAME_TIER_WEIGHTS;

export interface DriverName {
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  shortName: string;
  tier: NameTier;
  isCorrupted: boolean;
}

/** Pick a tier by weight from a single rng draw. */
function rollTier(rng: Rng): NameTier {
  const r = rng();
  let acc = 0;
  for (const tier of Object.keys(NAME_TIER_WEIGHTS) as NameTier[]) {
    acc += NAME_TIER_WEIGHTS[tier];
    if (r < acc) return tier;
  }
  return 'international';
}

// === Tier 4 — corruption ===
// Three layout-safe techniques (no tall zalgo stacks that break rows):
//   flip    — upside-down Latin (U+0250 block), reversed: "Robert" → "ʇɹǝqoɹ"
//   swap    — 1–2 Cyrillic/Greek lookalike substitutions (subtle data-error)
//   glitch  — a few combining marks (capped) for a light flicker
const UPSIDE_DOWN: Record<string, string> = {
  a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ',
  j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ',
  s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
};
const LOOKALIKES: Record<string, string> = {
  a: 'а', e: 'е', o: 'о', c: 'с', p: 'р', x: 'х', y: 'у', i: 'і', s: 'ѕ', n: 'ո',
};
const COMBINING = ['́', '̴', '̶', '͓', '҉'];

function flipName(s: string): string {
  return [...s.toLowerCase()]
    .map(ch => UPSIDE_DOWN[ch] ?? ch)
    .reverse()
    .join('');
}
function swapLookalikes(s: string, rng: Rng): string {
  const chars = [...s];
  const swappable = chars
    .map((ch, i) => ({ i, low: ch.toLowerCase() }))
    .filter(({ low }) => LOOKALIKES[low]);
  if (swappable.length === 0) return s;
  const count = Math.min(swappable.length, 1 + Math.floor(rng() * 2)); // 1–2
  for (let k = 0; k < count; k++) {
    const target = swappable[Math.floor(rng() * swappable.length)];
    chars[target.i] = LOOKALIKES[target.low];
  }
  return chars.join('');
}
function glitchName(s: string, rng: Rng): string {
  // Cap total marks so the row height never blows out.
  const budget = 2 + Math.floor(rng() * 2); // 2–3 marks total
  const chars = [...s];
  let placed = 0;
  for (let i = 0; i < chars.length && placed < budget; i++) {
    if (chars[i] !== ' ' && rng() < 0.4) {
      chars[i] += COMBINING[Math.floor(rng() * COMBINING.length)];
      placed++;
    }
  }
  return chars.join('');
}

function corrupt(name: string, rng: Rng): string {
  const technique = rng();
  let out: string;
  if (technique < 0.4) out = flipName(name);
  else if (technique < 0.75) out = swapLookalikes(name, rng);
  else out = glitchName(name, rng);
  // swap/glitch can no-op on names lacking swappable letters — never let a
  // "corrupted" name come out clean; flip always alters.
  return out === name ? flipName(name) : out;
}

/** Short name for the timing tower etc.: "First L." normally, just the first
 * name for mononyms or anything too long / corrupted to abbreviate cleanly. */
function makeShortName(firstName: string, lastName: string, corrupted: boolean): string {
  if (!lastName || corrupted) {
    return firstName.length > 10 ? firstName.slice(0, 10) : firstName;
  }
  return firstName.length > 8 ? firstName.slice(0, 8) : `${firstName} ${lastName[0]}.`;
}

/** Generate a driver name. Same call shape as before (rng in, name out) so
 * the generator pipeline is unchanged; now tiered + international. */
export function generateDriverName(rng: Rng = Math.random): DriverName {
  const tier = rollTier(rng);

  if (tier === 'mononym') {
    const firstName = pick(MONONYMS, rng);
    return {
      firstName, middleName: '', lastName: '', fullName: firstName,
      shortName: makeShortName(firstName, '', false), tier, isCorrupted: false,
    };
  }

  if (tier === 'corrupted') {
    // Corrupt an otherwise-normal international name — a glitch in a real grid.
    const baseFirst = pick(INTL_FIRST_NAMES, rng);
    const baseLast = pick(INTL_LAST_NAMES, rng);
    const firstName = corrupt(baseFirst, rng);
    const lastName = corrupt(baseLast, rng);
    const fullName = `${firstName} ${lastName}`;
    return {
      firstName, middleName: '', lastName, fullName,
      shortName: makeShortName(firstName, lastName, true), tier, isCorrupted: true,
    };
  }

  const [firsts, lasts] = tier === 'absurd'
    ? [ABSURD_FIRST_NAMES, ABSURD_LAST_NAMES]
    : [INTL_FIRST_NAMES, INTL_LAST_NAMES];
  const firstName = pick(firsts, rng);
  const lastName = pick(lasts, rng);
  return {
    firstName, middleName: '', lastName, fullName: `${firstName} ${lastName}`,
    shortName: makeShortName(firstName, lastName, false), tier, isCorrupted: false,
  };
}
