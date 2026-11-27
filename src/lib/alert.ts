import { useSyncExternalStore } from 'react';
import { Alert, Platform } from 'react-native';

import i18n from '@/i18n';

/**
 * One way to ask or tell the user something in a small dialog, for every screen (owner, 2026-11-09,
 * prototype docs/prototypes/android-alert.html). iPhone shows Apple's own alert (HIG Alerts: the
 * system one for anything important, as people know it). Android and the web show ours,
 * `AlertHost`, drawn like Apple's: Android's own Material box broke the app's iOS look, and on the
 * web `Alert.alert` does nothing. Same call shape as `Alert.alert`, so any screen can switch to it.
 */
export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertRequest {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

let current: AlertRequest | null = null;
/** Never two at once: a second ask waits for the first to close. */
const waiting: AlertRequest[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

const emit = () => listeners.forEach((listener) => listener());

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const list = buttons?.length ? buttons : [{ text: i18n.t('common.ok') }];
  if (Platform.OS === 'ios') {
    Alert.alert(title, message, list);
    return;
  }
  const request = { id: nextId++, title, message, buttons: list };
  if (current) waiting.push(request);
  else current = request;
  emit();
}

/**
 * Asks before a destructive step in an alert, Cancel and the red action: the one helper seven
 * screens each kept a copy of (with a browser fallback that `showAlert` makes needless).
 */
export function confirmAlert(title: string, message: string, action: string, onConfirm: () => void, cancel: string) {
  showAlert(title, message, [
    { text: cancel, style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

/**
 * Closes the open dialog with one of its buttons (or none) and runs that button after it is gone,
 * so a button that asks again opens the next dialog cleanly.
 */
export function closeAlert(button?: AlertButton) {
  current = waiting.shift() ?? null;
  emit();
  button?.onPress?.();
}

/** The dialog to show now, for `AlertHost`. */
export function useCurrentAlert() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => current,
  );
}

/** A label short enough to share a row with one other button, as Apple's alert lays them out. */
const ROW_LABEL_MAX = 14;

/**
 * How the buttons stand: two short ones side by side with Cancel on the left; otherwise one under
 * another, the actions in the order given and Cancel last (Apple's alert).
 */
export function alertLayout(buttons: readonly AlertButton[]): { row: boolean; ordered: AlertButton[] } {
  const cancel = buttons.filter((b) => b.style === 'cancel');
  const rest = buttons.filter((b) => b.style !== 'cancel');
  const row = buttons.length === 2 && buttons.every((b) => b.text.length <= ROW_LABEL_MAX);
  return { row, ordered: row ? [...cancel, ...rest] : [...rest, ...cancel] };
}

/** What Android's back button (and a tap on the dim ground, when there is a Cancel) does: the Cancel button, else just close. */
export const cancelButton = (buttons: readonly AlertButton[]) => buttons.find((b) => b.style === 'cancel');
