import type { AppState } from './use-app-store';

/** The store's setter and getter as the slices and helpers take them. */
export type Setter = (fn: (s: AppState) => Partial<AppState>) => void;
export type Getter = () => AppState;
export type RawSetter = (partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void;
