// The three-letter driver code (VER, HAM, NOR), one helper for the timing
// tower, the track map and the lap chart (#621). Accents fold to their base
// letter first, so "López" is LOP, not LP.

// Suffixes to ignore when extracting the surname
const NAME_SUFFIXES = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V']);
// Letters NFD can't split into base + mark.
const FOLD: Record<string, string> = { 'ł': 'l', 'Ł': 'L', 'ø': 'o', 'Ø': 'O', 'đ': 'd', 'Đ': 'D', 'ß': 'ss', 'ı': 'i', 'æ': 'ae', 'Æ': 'AE', 'œ': 'oe', 'Œ': 'OE' };

/** A name part as plain capital letters: accents folded, apostrophes and hyphens gone. */
function letters(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').replace(/[łŁøØđĐßıæÆœŒ]/g, c => FOLD[c]).toUpperCase().replace(/[^A-Z]/g, '');
}

/** The surname alone, in capitals (the tower's track view, #778): "Jake Cooper Jr." → COOPER. */
export function driverSurname(name: string): string {
  const parts = name.split(' ').filter(p => p.length > 0);
  const filtered = parts.filter(p => !NAME_SUFFIXES.has(p.toUpperCase()));
  return (filtered[filtered.length - 1] || parts[parts.length - 1] || '').toUpperCase();
}

export function driverCode(name: string): string {
  const parts = name.split(' ').filter(p => p.length > 0);
  const filtered = parts.filter(p => !NAME_SUFFIXES.has(p.toUpperCase()));
  const surname = letters(filtered[filtered.length - 1] || parts[parts.length - 1] || '');
  // A short surname borrows from the word before it ("Wu" → "IWU"-style padding).
  if (surname.length < 3 && filtered.length > 1) {
    return (letters(filtered[filtered.length - 2]).slice(-1) + surname).slice(0, 3);
  }
  return surname.slice(0, 3);
}
