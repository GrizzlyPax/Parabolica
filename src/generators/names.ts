// Driver name generation (#191): tiered, mostly American (#615), deterministic.
//
// The pool is built in tiers so the funny names land — "Nugget Marshall" is a
// gift precisely because it sits in a grid of believable international names.
//   T1  real names — the dominant base, each half 80% American / 20% international
//   T2  absurdist names — the memorable minority (Blaseball-inspired)
//   hybrid  one absurd half on a real name ("Hollyhock Abenov", "Aditya Undefined")
//   T4  corrupted names — a glitch in the universe, genuinely rare
// Plus the one-word rule: ~1% of names show as one word ("Ottoman"). The old
// mononym list retired in #467. Names draw on their own stream (drivers.ts),
// so these pools can grow without moving a single stat.
import { Rng, pick } from '../engine/rng';

// === TIER 1 — real names (the believable base) ===
// Mostly American (Pax, Oct 10, #615; docs/story/name-pools.md → Update,
// Oct 10): each half of a real name picks its own source, the US pool 80% of
// the time, else the international pool. So mostly "Tyler Brooks", sometimes
// America's own mix ("Diego Parker"), now and then fully international.
export const US_SHARE = 0.8;

export const US_FIRST_NAMES = [
  'Tyler', 'Megan', 'Brandon', 'Ashley', 'Jake', 'Kayla', 'Cody', 'Dustin', 'Chase', 'Hunter',
  'Brittany', 'Kevin', 'Jessica', 'Ryan', 'Amanda', 'Derek', 'Travis', 'Kyle', 'Shane', 'Bobby',
  'Ricky', 'Dale', 'Darrell', 'Tony', 'Danny', 'Mike', 'Chris', 'Matt', 'Josh', 'Justin',
  'Brad', 'Lauren', 'Taylor', 'Madison', 'Morgan', 'Casey', 'Jordan', 'Riley', 'Avery', 'Logan',
  'Mason', 'Caleb', 'Wyatt', 'Colton', 'Brooke', 'Hailey', 'Savannah', 'Jenna', 'Kelsey', 'Rachel',
  'Molly', 'Katie', 'Erin', 'Marcus', 'Darius', 'Andre', 'Terrence', 'Jamal', 'Keisha', 'Tasha',
  'Luis', 'Miguel', 'Rosa', 'Nick', 'Joey', 'Becky', 'Tammy', 'Wade', 'Clint', 'Rusty',
  'Buck', 'Earl', 'Jimmy', 'Dwayne', 'Stacy', 'Crystal', 'Amber', 'Heather', 'Nicole', 'Brian',
  'Scott', 'Jeff', 'Greg', 'Todd', 'Lisa', 'Kim', 'Tina', 'Donna',
  // the English names that used to sit in the international pool
  'James', 'Mary', 'William', 'Sarah', 'Thomas', 'Emily', 'George', 'Grace',
  'Henry', 'Alice', 'Edward', 'Charlotte', 'Oliver', 'Amelia', 'Arthur', 'Florence',
];

export const US_LAST_NAMES = [
  'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
  'Moore', 'Jackson', 'Martin', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Hill', 'Green', 'Adams', 'Baker', 'Nelson', 'Carter',
  'Mitchell', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart',
  'Morris', 'Murphy', 'Cook', 'Rogers', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Kelly', 'Howard',
  'Cox', 'Ward', 'Richardson', 'Watson', 'Wood', 'Gray', 'James', 'Sullivan', 'McCoy', 'O\'Brien',
  'Dawson', 'Hayes', 'Brooks', 'Walker', 'Coleman', 'Foster', 'Bennett', 'Barnes', 'Reed', 'Ford',
  'Lane', 'Holt', 'Webb', 'Shaw', 'Wells', 'Hughes', 'Smith', 'Price', 'Russell', 'Griffin',
  'Wallace', 'Fisher', 'Henderson', 'Simmons', 'Jenkins', 'Perry', 'Powell', 'Long', 'Patterson',
];

// The international pool: common given/family names across many traditions.
export const INTL_FIRST_NAMES = [
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
  // Italian
  'Luca', 'Giulia', 'Marco', 'Chiara', 'Lorenzo', 'Francesca', 'Matteo', 'Elena',
  // Nordic + Finnish
  'Erik', 'Astrid', 'Lars', 'Ingrid', 'Magnus', 'Sigrid', 'Anders', 'Freya',
  // Irish + Scottish
  'Ciarán', 'Niamh', 'Declan', 'Aoife', 'Callum', 'Isla', 'Fergus', 'Siobhan',
  // Dutch + Flemish
  'Daan', 'Sanne', 'Bram', 'Fleur', 'Joris', 'Anouk',
  // Greek
  'Nikos', 'Eleni', 'Yannis', 'Dimitra', 'Kostas', 'Katerina',
  // Turkish
  'Emre', 'Elif', 'Burak', 'Zeynep', 'Mert', 'Ayşe',
  // Persian
  'Dariush', 'Shirin', 'Kian', 'Parisa', 'Arash', 'Leila',
  // Hebrew
  'Noa', 'Eitan', 'Tamar', 'Ari', 'Yael', 'Itai',
  // East African
  'Wanjiru', 'Kiprono', 'Abebe', 'Selam', 'Baraka', 'Amani', 'Tesfaye', 'Neema',
  // Southern African
  'Thabo', 'Lerato', 'Sipho', 'Nandi', 'Themba', 'Zanele',
  // Filipino
  'Paolo', 'Bea', 'Jericho', 'Angelica', 'Marlon', 'Kristine',
  // Thai
  'Somchai', 'Malee', 'Anan', 'Ploy', 'Kittisak', 'Nok',
  // Pacific (Māori, Samoan, Tongan, Hawaiian)
  'Tama', 'Aroha', 'Wiremu', 'Moana', 'Sione', 'Leilani',
  // Andean (Quechua / Aymara)
  'Inti', 'Killa', 'Wayra', 'Ccori', 'Amaru', 'Sisa',
  // Hungarian
  'Bence', 'Réka', 'Levente', 'Zsófia', 'Gergő', 'Dóra',
  // Central Asian
  'Aibek', 'Aigerim', 'Timur', 'Dana', 'Ruslan', 'Madina',
];

export const INTL_LAST_NAMES = [
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
  // Italian
  'Rossi', 'Russo', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Greco',
  // Nordic + Finnish
  'Johansson', 'Andersen', 'Nilsson', 'Berg', 'Halvorsen', 'Lund', 'Dahl', 'Virtanen',
  // Irish + Scottish
  'Murphy', 'Byrne', 'O\'Neill', 'Gallagher', 'MacLeod', 'Fraser', 'Doyle', 'Quinn',
  // Dutch + Flemish
  'de Vries', 'Janssen', 'Bakker', 'Visser', 'van Dijk', 'Peeters',
  // Greek
  'Papadopoulos', 'Georgiou', 'Nikolaidis', 'Karras', 'Vlachos', 'Antonopoulos',
  // Turkish
  'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Aydın',
  // Persian
  'Hosseini', 'Tehrani', 'Karimi', 'Moradi', 'Jafari', 'Rostami',
  // Hebrew
  'Cohen', 'Levi', 'Mizrahi', 'Friedman', 'Shapiro', 'Peretz',
  // East African
  'Otieno', 'Kamau', 'Mwangi', 'Haile', 'Tadesse', 'Wanyama', 'Njoroge', 'Mutua',
  // Southern African
  'Dlamini', 'Nkosi', 'Mokoena', 'Ndlovu', 'Khumalo', 'Mahlangu',
  // Filipino
  'Reyes', 'dela Cruz', 'Bautista', 'Villanueva', 'Aquino', 'Dizon',
  // Thai
  'Srisuk', 'Chaiyaporn', 'Wongsakul', 'Boonmee', 'Rattanakorn', 'Saelim',
  // Pacific (Māori, Samoan, Tongan, Hawaiian)
  'Ngata', 'Parata', 'Tuilagi', 'Faleolo', 'Tupou', 'Kealoha',
  // Andean (Quechua / Aymara)
  'Mamani', 'Quispe', 'Condori', 'Huamán', 'Choque', 'Apaza',
  // Hungarian
  'Nagy', 'Tóth', 'Szabó', 'Horváth', 'Varga', 'Kiss',
  // Central Asian
  'Abenov', 'Seitkali', 'Nurlanov', 'Tokayev', 'Iskakov', 'Bekova',
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
  // almanac + farm
  'Harvest', 'Solstice', 'Equinox', 'Bramble', 'Thistle', 'Barley', 'Turnip',
  'Sleet', 'Gale', 'Hollyhock',
  // household
  'Doily', 'Teaspoon', 'Lampshade', 'Ottoman', 'Thimble', 'Colander', 'Kettle',
  'Duvet', 'Spatula', 'Doorstop',
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
  // almanac + farm
  'Furrow', 'Hedgerow', 'Haybale', 'Millpond', 'Weathervane', 'Scarecrow', 'Almanac',
  'Plowshare', 'Turnipseed', 'Stubble',
  // household
  'Sideboard', 'Doormat', 'Breadbin', 'Coathook', 'Mantelpiece', 'Footstool', 'Hatstand',
  'Tablecloth',
];

// Tier weights (approximate — see tests). T1 must dominate.
// Radio's mix (docs/story/name-pools.md, #467): grounded, with a twist.
// Oct 10 (#615): fewer silly-plus-silly; the hybrid's real half follows 80/20.
export const NAME_TIER_WEIGHTS = {
  international: 0.80,
  hybrid: 0.16,
  absurd: 0.02,
  corrupted: 0.02,
} as const;

/** Any non-corrupted name has this chance of showing as one word (#467):
 * the first half 3 in 4, else the last. Replaces the old mononym list. */
export const ONE_WORD_CHANCE = 0.01;
export const ONE_WORD_FIRST_SHARE = 0.75;

export type NameTier = keyof typeof NAME_TIER_WEIGHTS;

export interface DriverName {
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  shortName: string;
  tier: NameTier;
  isCorrupted: boolean;
  /** Shown as one word ("Ottoman", "Okonkwo"): the ~1% rule. */
  oneWord?: boolean;
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

/** A real first or last name: one draw picks the source (US 80% / international
 * 20%), one draw picks the name. Always two draws, whichever pool wins, so the
 * odds never shift the stream (the #467 rule). */
function realHalf(us: readonly string[], intl: readonly string[], rng: Rng): string {
  const fromUs = rng() < US_SHARE;
  return pick(fromUs ? us : intl, rng);
}

/** Generate a driver name. Same call shape as before (rng in, name out) so
 * the generator pipeline is unchanged; now tiered + international. */
export function generateDriverName(rng: Rng = Math.random): DriverName {
  const tier = rollTier(rng);

  if (tier === 'corrupted') {
    // Corrupt an otherwise-normal international name — a glitch in a real grid.
    const baseFirst = realHalf(US_FIRST_NAMES, INTL_FIRST_NAMES, rng);
    const baseLast = realHalf(US_LAST_NAMES, INTL_LAST_NAMES, rng);
    const firstName = corrupt(baseFirst, rng);
    const lastName = corrupt(baseLast, rng);
    const fullName = `${firstName} ${lastName}`;
    return {
      firstName, middleName: '', lastName, fullName,
      shortName: makeShortName(firstName, lastName, true), tier, isCorrupted: true,
    };
  }

  // Hybrid: one absurd half on a real name, 50/50 which half.
  const absurdFirst = tier === 'absurd' || (tier === 'hybrid' && rng() < 0.5);
  const absurdLast = tier === 'absurd' || (tier === 'hybrid' && !absurdFirst);
  // A real half rolls its source first; an absurd half spends that roll too,
  // so every name takes the same draws.
  const first = absurdFirst ? (rng(), pick(ABSURD_FIRST_NAMES, rng)) : realHalf(US_FIRST_NAMES, INTL_FIRST_NAMES, rng);
  const last = absurdLast ? (rng(), pick(ABSURD_LAST_NAMES, rng)) : realHalf(US_LAST_NAMES, INTL_LAST_NAMES, rng);

  // The one-word rule: always two draws, so the odds never shift the stream.
  const oneWord = rng() < ONE_WORD_CHANCE;
  const keepFirst = rng() < ONE_WORD_FIRST_SHARE;
  if (oneWord) {
    const word = keepFirst ? first : last;
    return {
      firstName: word, middleName: '', lastName: '', fullName: word,
      shortName: makeShortName(word, '', false), tier, isCorrupted: false, oneWord: true,
    };
  }
  return {
    firstName: first, middleName: '', lastName: last, fullName: `${first} ${last}`,
    shortName: makeShortName(first, last, false), tier, isCorrupted: false,
  };
}
