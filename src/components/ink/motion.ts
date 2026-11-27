import { Easing, LinearTransition } from 'react-native-reanimated';

/**
 * A row that moves (a new line lifts a chat to the top, a filter drops rows) slides to its new place
 * instead of jumping (design audit 2026-11-15 §8.2.3, continuity). On-screen movement: ease-in-out,
 * 240 ms; Reanimated drops it under Reduce Motion (its default `ReduceMotion.System`).
 */
export const listReorder = LinearTransition.duration(240).easing(Easing.bezier(0.77, 0, 0.175, 1));
