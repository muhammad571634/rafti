import AsyncStorage from '@react-native-async-storage/async-storage';

import { type CreateForm, hasContent, readSavedCreation, type SavedCreation } from './create-flow';

/**
 * The unfinished new character, on the phone only (0z149). Writing a character takes minutes, and
 * Android closes a backgrounded app within about a minute (seen on the A51, 0z140), so the form is
 * kept as it is typed and offered again on the next visit. Its own key: never in the app store.
 */
const KEY = 'sigmazam.create-draft.v1';

export async function loadCreation(): Promise<SavedCreation | null> {
  try {
    return readSavedCreation(await AsyncStorage.getItem(KEY), Date.now());
  } catch {
    return null;
  }
}

export async function saveCreation(form: CreateForm) {
  try {
    if (!hasContent(form)) await AsyncStorage.removeItem(KEY);
    else await AsyncStorage.setItem(KEY, JSON.stringify({ v: 1, savedAt: new Date().toISOString(), form } satisfies SavedCreation));
  } catch {
    // Storage full or unavailable: the form still works, it just is not kept.
  }
}

export async function clearCreation() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
}
