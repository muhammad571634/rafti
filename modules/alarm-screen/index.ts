import { requireOptionalNativeModule } from 'expo';

type AlarmScreenModule = {
  createAlarmChannel(id: string, name: string, sound: string): boolean;
  showOverLockScreen(on: boolean): void;
  unlock(): Promise<boolean>;
};

/** Null on iOS, the web and Expo Go: there the ring screen is an ordinary screen. */
const native = requireOptionalNativeModule<AlarmScreenModule>('AlarmScreen');

/** A notification channel whose melody rings on the alarm stream (Android builds); false without the module. */
export function createAlarmChannel(id: string, name: string, sound: string): boolean {
  return native?.createAlarmChannel(id, name, sound) ?? false;
}

/** Lets the ring screen show over the lock screen and wake the display (Android dev builds). */
export function showOverLockScreen(on: boolean) {
  native?.showOverLockScreen(on);
}

/** Asks the user to unlock the phone; true once it is unlocked (or was never locked). */
export function unlockPhone(): Promise<boolean> {
  return native ? native.unlock() : Promise.resolve(true);
}
