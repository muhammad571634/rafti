import { requireOptionalNativeModule } from 'expo';
import { useEffect, useState } from 'react';

const FOLDER = 'booth-selfies';

/**
 * The file system, loaded on first use after checking its native side: loading the JS of a module a
 * build does not have is fatal to the whole app, not an error to catch (seen on the A51, 0z84).
 */
async function files() {
  if (!requireOptionalNativeModule('FileSystem')) return null;
  return import('expo-file-system');
}

/**
 * Moves a Photo Booth selfie out of the camera's cache, where the system may delete it, into the
 * app's own folder. Gives its name, not its path: iOS moves an app's folder across updates, so the
 * path is worked out when it shows (`useSelfieUri`). Without the file system, the cache path itself.
 * The selfie stays on this phone: it is never sent to our server or a model (the phone's own
 * backup, iCloud or Android's, may still carry the app's folder, as it does the voice notes).
 */
export async function keepSelfie(uri: string): Promise<string> {
  try {
    const fs = await files();
    if (!fs) return uri;
    const folder = new fs.Directory(fs.Paths.document, FOLDER);
    folder.create({ idempotent: true });
    const name = `selfie-${Date.now()}.jpg`;
    await new fs.File(uri).move(new fs.File(folder, name));
    return name;
  } catch {
    return uri;
  }
}

/** Looked-up paths, so a picture drawn again (the album, a chat) shows its selfie at once. */
const found = new Map<string, string | null>();

type Fs = NonNullable<Awaited<ReturnType<typeof files>>>;

/** The file a kept name (or a path, when the move failed) stands for. */
function fileOf(fs: Fs, name: string) {
  return name.startsWith('file:') ? new fs.File(name) : new fs.File(new fs.Directory(fs.Paths.document, FOLDER), name);
}

async function lookUp(name: string): Promise<string | null> {
  try {
    const fs = await files();
    // No file system to ask: a path is shown as it is, a name cannot be found.
    if (!fs) return name.startsWith('file:') ? name : null;
    // A path left in the cache is gone once the system clears it: then the friend shows alone.
    const file = fileOf(fs, name);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

/**
 * A selfie no picture shows any more: a shot the allowance refused after the camera, or a blocked
 * friend's photos. The user's face is not left on the phone with nothing pointing at it.
 */
export async function dropSelfie(name: string) {
  found.delete(name);
  try {
    const fs = await files();
    const file = fs && fileOf(fs, name);
    if (file?.exists) file.delete();
  } catch {
    // Goes with the account.
  }
}

/** Where a kept selfie is now: undefined while it is looked up, null when it is not on this phone. */
export function useSelfieUri(name: string | undefined): string | null | undefined {
  const [uri, setUri] = useState(() => (name ? found.get(name) : null));
  useEffect(() => {
    if (!name) {
      setUri(null);
      return;
    }
    if (found.has(name)) {
      setUri(found.get(name));
      return;
    }
    let live = true;
    void lookUp(name).then((path) => {
      found.set(name, path);
      if (live) setUri(path);
    });
    return () => {
      live = false;
    };
  }, [name]);
  return uri;
}

/** The account was deleted: every selfie goes with it. */
export async function forgetAllSelfies() {
  found.clear();
  try {
    const fs = await files();
    const folder = fs && new fs.Directory(fs.Paths.document, FOLDER);
    if (folder?.exists) folder.delete();
  } catch {
    // Nothing else holds them: the folder goes with the app.
  }
}
