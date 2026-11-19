import AsyncStorage from '@react-native-async-storage/async-storage';

import { dropNote } from '@/lib/voice-files';
import type { Message } from '@/types';

import { branchNotes } from './branches';

/**
 * A branch's lines on the phone (0z286), one key per branch, read only when the user switches to it,
 * so the app's own save never carries them. Like the voice notes, they stay on this phone (a new
 * phone restores the chat as it is, not its branches). Nothing here throws.
 */

const PREFIX = 'sigmazam.branch.';

export async function saveBranchLines(id: string, lines: readonly Message[]) {
  try {
    await AsyncStorage.setItem(PREFIX + id, JSON.stringify(lines));
    return true;
  } catch {
    return false;
  }
}

export async function loadBranchLines(id: string): Promise<Message[] | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + id);
    const lines = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(lines) ? (lines as Message[]) : null;
  } catch {
    return null;
  }
}

/** A branch is gone (deleted, past the cap, its chat deleted): its lines and its voice notes go with it. */
export async function dropBranchLines(id: string, withNotes = true) {
  if (withNotes) {
    const lines = await loadBranchLines(id);
    for (const name of branchNotes(lines ?? [])) await dropNote(name);
  }
  await AsyncStorage.removeItem(PREFIX + id).catch(() => {});
}

/** The account was deleted: every branch's lines go (their notes go with the account's voice folder). */
export async function forgetAllBranches() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(PREFIX)));
  } catch {
    // Left behind: nothing reads them without a branch record.
  }
}
