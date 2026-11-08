/**
 * Where the user was when the phone switched light / dark. Colours are read once at launch, so a
 * theme switch reloads the app (`useThemeReload`); this keeps the open tab and the screens on top of
 * it, so the reload lands where the user was instead of on Today (a chat at sunset, a page after the
 * phone wakes in the other theme). Pure: the root stack's state in, hrefs out.
 */

/** A route as the navigation state holds it. */
export interface NavRoute {
  name: string;
  params?: object;
  state?: { index?: number; routes: NavRoute[] };
}

export interface SavedStack {
  at: number;
  /** The open tab's href ("/" is Today). */
  tab: string;
  /** The screens above the tabs, bottom first. */
  screens: string[];
}

/** How long a saved place is good for: the reload takes a second or two. */
export const RESTORE_WINDOW_MS = 60_000;

/** Screens a reload must not reopen: a live call or ring, a one-way door, or a moment that is over. */
const SKIP = [/^onboarding/, /^call\//, /^group\/\[id\]\/call/, /^alarms\/ring/];

/** `chat/[id]` with `{ id: 'c1', q: 'x' }` → `/chat/c1?q=x`; `character/[id]/index` → `/character/abc`. */
export function routeHref(route: NavRoute): string | null {
  const params = { ...(route.params as Record<string, unknown> | undefined) };
  if (route.name.startsWith('(') || route.name.startsWith('+') || route.name.startsWith('_')) return null;
  if (SKIP.some((re) => re.test(route.name))) return null;
  let missing = false;
  const path = route.name
    .replace(/\/index$/, '')
    .replace(/^index$/, '')
    .replace(/\[([^\]]+)\]/g, (_, key: string) => {
      const value = params[key];
      delete params[key];
      if (value == null || value === '') missing = true;
      return encodeURIComponent(String(value ?? ''));
    });
  if (missing) return null;
  const query = Object.entries(params)
    .filter(([key, value]) => (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') && !key.startsWith('__'))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `/${path}${query ? `?${query}` : ''}`;
}

/**
 * The app's own stack (the one holding `(tabs)`): the container's root state wraps it in expo-router's
 * `__root` slot, so look one level down, and further, until the tabs are found.
 */
export function appStack(routes: NavRoute[]): NavRoute[] {
  if (routes.some((r) => r.name === '(tabs)')) return routes;
  for (const r of routes) {
    const inner = r.state?.routes ? appStack(r.state.routes) : [];
    if (inner.length) return inner;
  }
  return [];
}

/** The open tab and the screens above it, from the root state's routes. */
export function stackOf(rootRoutes: NavRoute[], at = Date.now()): SavedStack {
  const routes = appStack(rootRoutes);
  const tabs = routes.find((r) => r.name === '(tabs)');
  const tabRoute = tabs?.state?.routes[tabs.state.index ?? 0];
  const tabName = tabRoute?.name ?? 'index';
  const screens = routes.filter((r) => r.name !== '(tabs)').map(routeHref);
  // Stop at the first screen that cannot be reopened: what sat above it belonged to it.
  const cut = screens.indexOf(null);
  return {
    at,
    tab: tabName === 'index' ? '/' : `/${tabName}`,
    screens: (cut === -1 ? screens : screens.slice(0, cut)) as string[],
  };
}

/** A saved place that is still fresh and worth reopening, or null. */
export function freshStack(saved: SavedStack | null, now = Date.now()): SavedStack | null {
  if (!saved || now - saved.at > RESTORE_WINDOW_MS || now < saved.at) return null;
  if (saved.tab === '/' && saved.screens.length === 0) return null;
  return saved;
}
