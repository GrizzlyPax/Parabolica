// Moving to playaceamerica.com (#701). Saves live in localStorage, which is
// per domain, so nothing follows the player from playparabolica.com on its
// own. The one-tap move: on the old domain the menu offers "Move my save",
// which opens the new domain with every save in the link (#carry=…); the new
// domain writes them once, never over a save it already has, and drops the
// link from the address bar. Every save key starts with `parabolica.` (the
// keys keep the old name; only the game's name changed).

export const NEW_ORIGIN = 'https://playaceamerica.com';
const PREFIX = 'parabolica.';
const HASH = '#carry=';

/** True on the old domain (playparabolica.com or www.), where the move is offered. */
export function onOldDomain(hostname: string = typeof location !== 'undefined' ? location.hostname : ''): boolean {
  return /(^|\.)playparabolica\.com$/.test(hostname);
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

/** Every save on this device (the `parabolica.*` keys), as key → value. */
export function collectSaves(store: Pick<Storage, 'length' | 'key' | 'getItem'> = localStorage): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k?.startsWith(PREFIX)) out[k] = store.getItem(k) ?? '';
  }
  return out;
}

/** The link that carries this device's saves to the new domain. */
export function carryLink(saves: Record<string, string> = collectSaves(), origin: string = NEW_ORIGIN): string {
  return `${origin}/${HASH}${toBase64Url(JSON.stringify(saves))}`;
}

/**
 * Read a carry link's hash and write its saves: only `parabolica.*` keys, and
 * never over a key the device already holds. Returns how many were written,
 * or null when the hash isn't a carry (or can't be read).
 */
export function importCarry(hash: string, store: Pick<Storage, 'getItem' | 'setItem'> = localStorage): number | null {
  if (!hash.startsWith(HASH)) return null;
  try {
    const saves = JSON.parse(fromBase64Url(hash.slice(HASH.length))) as Record<string, unknown>;
    let n = 0;
    for (const [k, v] of Object.entries(saves)) {
      if (!k.startsWith(PREFIX) || typeof v !== 'string' || store.getItem(k) !== null) continue;
      store.setItem(k, v);
      n++;
    }
    return n;
  } catch {
    return null;
  }
}

/** On load: take a carry link if there is one, then clear it from the address bar. */
export function takeCarryFromLocation(): number | null {
  if (typeof location === 'undefined' || !location.hash.startsWith(HASH)) return null;
  const n = importCarry(location.hash);
  history.replaceState(null, '', location.pathname + location.search);
  return n;
}
