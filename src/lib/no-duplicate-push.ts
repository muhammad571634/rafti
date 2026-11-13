/**
 * A tap that lands twice (a double tap, a second press while the push still animates) fires two
 * pushes of the same screen: the stack holds it twice and Back shows it again. The root stack's
 * router drops a push that would put the focused screen on top of itself (same route, same params),
 * so every row, icon, button and link in the app is covered in one place, with no timers and no
 * per-screen locks. Opening a different screen, or the same screen with other params, is untouched.
 */

type RouteLike = { key: string; name: string; params?: object };
type StackStateLike = { key: string; index: number; routes: readonly RouteLike[] };
type ActionLike = { type: string; target?: string; payload?: unknown };
type ActionResultLike<S> = { state: S; affectedRouteKey: string | undefined };

/** Expo Router adds its own bookkeeping params (previews, zoom transitions); they say nothing about which screen it is. */
const isInternalParam = (key: string) => key.startsWith('__');

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  if (typeof a !== 'object' || typeof b !== 'object') return String(a) === String(b);
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  return sameParams(a as Record<string, unknown>, b as Record<string, unknown>);
}

function sameParams(a: object | undefined, b: object | undefined): boolean {
  const left = Object.entries(a ?? {}).filter(([k, v]) => !isInternalParam(k) && v !== undefined);
  const right = Object.entries(b ?? {}).filter(([k, v]) => !isInternalParam(k) && v !== undefined);
  if (left.length !== right.length) return false;
  const rightMap = new Map(right);
  return left.every(([k, v]) => rightMap.has(k) && sameValue(v, rightMap.get(k)));
}

/** True when `action` would open the screen that is already focused in `state`, with the same params. */
export function isRepeatOfFocused(state: StackStateLike, action: ActionLike): boolean {
  if (action.type !== 'PUSH' && action.type !== 'NAVIGATE') return false;
  if (action.target && action.target !== state.key) return false;
  const payload = action.payload as { name?: unknown; params?: object; pop?: boolean; state?: object } | undefined;
  // `state` carries a move inside the screen's own navigator (another tab of (tabs)): never a repeat.
  if (!payload || typeof payload.name !== 'string' || payload.pop || payload.state) return false;
  const focused = state.routes[state.index];
  return focused?.name === payload.name && sameParams(focused.params, payload.params);
}

/**
 * Router override for the root `<Stack UNSTABLE_router={noDuplicatePush}>`. It wraps Expo Router's
 * own stack router (which it receives as `original`), so singular screens, previews and the rest keep
 * working; a repeat is answered as handled with the state unchanged, so it neither pushes nor bubbles.
 */
export function noDuplicatePush<
  S extends StackStateLike,
  A extends ActionLike,
  R extends { getStateForAction: (state: S, action: A, options: never) => unknown },
>(original: R) {
  return {
    getStateForAction(state: S, action: A, options: Parameters<R['getStateForAction']>[2]) {
      if (isRepeatOfFocused(state, action)) {
        const handled: ActionResultLike<S> = { state, affectedRouteKey: state.routes[state.index]?.key };
        return handled as ReturnType<R['getStateForAction']>;
      }
      return original.getStateForAction(state, action, options as never) as ReturnType<R['getStateForAction']>;
    },
  };
}
