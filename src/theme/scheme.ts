import { createContext, useContext } from 'react';

import { day, isDark, night } from './colors';

/**
 * Appearance B (owner 2026-11-11, docs/appearance-plan.md): every screen where you are with a
 * character is dark whatever the phone is set to; the tools follow the phone. Such a screen wraps
 * itself in `NightScope` and the kit inside reads the night tokens there (`useTokens`, `useThemed`),
 * so one component serves a tool screen by day and a friend's page at night. Sheets keep the phone's
 * look (they are system-like), so a sheet's content opens its own scope only when it asks for it.
 */
export const NightScope = createContext(false);

export type Tokens = typeof night;

/** True inside a screen that is always dark, or anywhere when the phone is dark. */
export const useNight = () => useContext(NightScope) || isDark;

/** The token set for where this component sits. */
export const useTokens = (): Tokens => (useContext(NightScope) ? night : day);

/**
 * Styles built once per set at import, so a scoped screen costs one context read per render. By
 * night the phone's set is the night set, so both entries are the same object.
 */
export function themed<T>(make: (t: Tokens) => T): { day: T; night: T } {
  const forDay = make(day);
  return { day: forDay, night: isDark ? forDay : make(night) };
}

/** The entry of a `themed` pair for where this component sits. */
export const useThemed = <T,>(pair: { day: T; night: T }): T => (useContext(NightScope) ? pair.night : pair.day);
