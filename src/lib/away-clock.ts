import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

/** When the app last went to the background (ms), for the welcome back on Today (`src/lib/welcome-back.ts`). */
const KEY = 'sigmazam.awayAt';
/** A notification tap counts as "opened by a notification" for this long. */
const NOTIFICATION_HOLD_MS = 5000;

let started = false;
let loaded: Promise<number | null> | null = null;
let current: number | null = null;
let notificationAt = 0;
/** A dev rewind survives the one trip to the background it takes to see it. */
let held = false;

function save(at: number) {
  current = at;
  AsyncStorage.setItem(KEY, String(at)).catch(() => {});
}

/** Starts listening once per launch: going to the background stamps the time. */
export function startAwayClock() {
  if (started) return;
  started = true;
  void awayAt();
  AppState.addEventListener('change', (state) => {
    if (state !== 'background') return;
    if (held) held = false;
    else save(Date.now());
  });
}

/** The last time the app went away, or null if never saved. Read from storage once, then kept in memory. */
export function awayAt(): Promise<number | null> {
  if (!loaded) {
    loaded = AsyncStorage.getItem(KEY)
      .then((raw) => {
        const at = raw ? Number(raw) : NaN;
        // A background stamp made while the read was in flight wins over the stored one.
        if (current === null && Number.isFinite(at)) current = at;
        return current;
      })
      .catch(() => current);
  }
  return loaded.then(() => current);
}

export function markOpenedFromNotification() {
  notificationAt = Date.now();
}

export function openedFromNotification() {
  return Date.now() - notificationAt < NOTIFICATION_HOLD_MS;
}

/** The welcome just showed: stamp now, so the same return never welcomes twice. */
export function markWelcomed(now: number) {
  save(now);
}

/** Dev (Profile, preview builds): pretend the app went away `ms` ago, to see the welcome on the next return. */
export function rewindAwayClock(ms: number) {
  save(Date.now() - ms);
  held = true;
}

let lastCheck = '—';
/** Dev: what Today's last welcome check decided, shown beside the test row in Profile. */
export function noteWelcomeCheck(result: string) {
  lastCheck = result;
}
export function lastWelcomeCheck() {
  return lastCheck;
}
