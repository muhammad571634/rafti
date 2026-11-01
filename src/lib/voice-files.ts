import { requireOptionalNativeModule } from 'expo';

import { CLIP_CHARS_MAX, type VoiceClip } from '@/ai/voice-prompt';

const FOLDER = 'voice-notes';

/**
 * The file system, loaded on first use after checking its native side: loading the JS of a module a
 * build does not have is fatal to the whole app, not an error to catch (seen on the A51, 0z84).
 */
async function files() {
  if (!requireOptionalNativeModule('FileSystem')) return null;
  return import('expo-file-system');
}

/** A recorded file as the server takes it, or null when it cannot be read or is too long. */
export async function readClip(uri: string): Promise<VoiceClip | null> {
  try {
    const fs = await files();
    const data = fs ? await new fs.File(uri).base64() : null;
    return data && data.length <= CLIP_CHARS_MAX ? { mimeType: 'audio/mp4', data } : null;
  } catch {
    return null;
  }
}

/**
 * Moves a recording out of the cache, where the system may delete it. Gives its name, not its path:
 * iOS moves an app's folder across updates, so the path is worked out when it plays (`noteUri`).
 */
export async function keepNote(uri: string, chatId: string): Promise<string | undefined> {
  try {
    const fs = await files();
    if (!fs) return undefined;
    const folder = new fs.Directory(fs.Paths.document, FOLDER);
    folder.create({ idempotent: true });
    const name = `${chatId}--${Date.now()}.m4a`;
    await new fs.File(uri).move(new fs.File(folder, name));
    return name;
  } catch {
    return undefined;
  }
}

/** Where a kept note is now, or null when it is not on this phone (a chat restored from the server). */
export async function noteUri(name: string): Promise<string | null> {
  try {
    const fs = await files();
    const file = fs && new fs.File(new fs.Directory(fs.Paths.document, FOLDER), name);
    return file?.exists ? file.uri : null;
  } catch {
    return null;
  }
}

/** A recording that will not be sent. */
export async function dropClip(uri: string) {
  try {
    const fs = await files();
    const file = fs && new fs.File(uri);
    if (file?.exists) file.delete();
  } catch {
    // Left in the cache: the system clears it.
  }
}

/** One message with its voice was deleted. */
export async function dropNote(name: string) {
  try {
    const fs = await files();
    const file = fs && new fs.File(new fs.Directory(fs.Paths.document, FOLDER), name);
    if (file?.exists) file.delete();
  } catch {
    // Goes with the chat or the account.
  }
}

/** A chat was cleared or deleted: its voice goes with it. */
export async function forgetNotes(chatId: string) {
  try {
    const fs = await files();
    const folder = fs && new fs.Directory(fs.Paths.document, FOLDER);
    if (!folder?.exists) return;
    for (const item of folder.list()) if (item.name.startsWith(`${chatId}--`)) item.delete();
  } catch {
    // Nothing to do: the next account delete removes the folder.
  }
}

/** The account was deleted. */
export async function forgetAllNotes() {
  try {
    const fs = await files();
    const folder = fs && new fs.Directory(fs.Paths.document, FOLDER);
    if (folder?.exists) folder.delete();
  } catch {
    // Same as above.
  }
}
