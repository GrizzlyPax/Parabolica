// URL navigation (#186): every screen has its own address, so refresh keeps
// you where you were, the browser back button works and a copied link opens
// the same screen. Hash routes (/#/world-deck/teams) because the static host
// doesn't rewrite unknown paths to index.html.
//
// Other hashes (e.g. old #league=CODE links; Commissioner leagues were removed
// in #339) are not routes: parseHash returns null and the app leaves them alone.
// Old #/league/… addresses fall through to the menu.
import { useCallback, useEffect, useState } from 'react';

/** Season Mode screens (docs/SEASON_MODE.md). Each gets /#/season/<screen>;
 * the Season build registers a component per name in App's switch. */
export const SEASON_SCREENS = ['setup', 'draft', 'paddock', 'race', 'standings'] as const;
export type SeasonScreen = (typeof SEASON_SCREENS)[number];

export type Route =
  | { name: 'menu' }
  | { name: 'quick-race' }
  | { name: 'race' }
  | { name: 'world-deck'; tab?: string }
  | { name: 'race-control'; tab?: string }
  | { name: 'credits' }
  | { name: 'season'; screen: SeasonScreen };

const SLUG = /^[a-z0-9-]+$/;

/** "#/world-deck/teams" → { name: 'world-deck', tab: 'teams' }; "" or "#/" → menu; anything else → null. */
export function parseHash(hash: string): Route | null {
  if (hash === '' || hash === '#') return { name: 'menu' };
  if (!hash.startsWith('#/')) return null;
  const parts = hash.slice(2).split('?')[0].split('/').filter(Boolean);
  const [head, sub] = parts;
  const tab = sub && SLUG.test(sub) ? sub : undefined;
  switch (head) {
    case undefined: return { name: 'menu' };
    case 'quick-race': return { name: 'quick-race' };
    case 'race': return { name: 'race' };
    case 'world-deck': return { name: 'world-deck', tab };
    case 'race-control': return { name: 'race-control', tab };
    case 'credits': return { name: 'credits' };
    case 'season': return (SEASON_SCREENS as readonly string[]).includes(sub) ? { name: 'season', screen: sub as SeasonScreen } : { name: 'season', screen: 'setup' };
    default: return { name: 'menu' };
  }
}

/** The address for a route: "#/world-deck/teams". */
export function routeHash(route: Route): string {
  switch (route.name) {
    case 'menu': return '#/';
    case 'world-deck': return route.tab ? `#/world-deck/${route.tab}` : '#/world-deck';
    case 'race-control': return route.tab ? `#/race-control/${route.tab}` : '#/race-control';
    case 'season': return `#/season/${route.screen}`;
    default: return `#/${route.name}`;
  }
}

export function sameRoute(a: Route, b: Route): boolean {
  return routeHash(a) === routeHash(b);
}

/** How many in-app steps back exist in this tab's history (so back() never leaves the site). */
const depth = (): number => (typeof history !== 'undefined' && typeof history.state?.pbDepth === 'number' ? history.state.pbDepth : 0);

export interface Navigator {
  route: Route;
  /** Go to a route: a new history entry, or replace the current one. */
  navigate: (route: Route, opts?: { replace?: boolean }) => void;
  /** Browser back when there's an in-app page behind us; otherwise replace with `fallback`. */
  back: (fallback: Route) => void;
}

/** The current route, kept in step with the address bar (back / forward / typed URLs). */
export function useRoute(): Navigator {
  const [route, setRoute] = useState<Route>(() => (typeof location === 'undefined' ? { name: 'menu' } : parseHash(location.hash) ?? { name: 'menu' }));

  useEffect(() => {
    const sync = () => { const r = parseHash(location.hash); if (r) setRoute(r); };
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); };
  }, []);

  const navigate = useCallback((next: Route, opts?: { replace?: boolean }) => {
    const hash = routeHash(next);
    if (location.hash !== hash) {
      if (opts?.replace) history.replaceState({ pbDepth: depth() }, '', hash);
      else history.pushState({ pbDepth: depth() + 1 }, '', hash);
    }
    setRoute(next);
  }, []);

  const back = useCallback((fallback: Route) => {
    if (depth() > 0) history.back();
    else navigate(fallback, { replace: true });
  }, [navigate]);

  return { route, navigate, back };
}
