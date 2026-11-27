import { requireOptionalNativeModule } from 'expo';

const FOLDER = 'character-pictures';
/** Sharp on a full-width card on any phone, a few hundred KB on disk. */
const LONG_EDGE = 1440;
const JPEG_QUALITY = 0.86;

/**
 * Keeps a character's picture from the gallery or the camera (owner, 2026-11-19: any picture, see
 * docs/agent-tasks/creator-ecosystem.md): made smaller when it is big, then copied out of the picker's
 * cache, which the system may empty, into the app's own folder. Gives the kept file's URI; the
 * picker's own URI when a native side is missing or anything fails, so picking never breaks.
 * The picture stays on this phone: it is never sent to our server, a model or another user.
 */
export async function keepCharacterPicture(uri: string): Promise<string> {
  try {
    // Loading a module's JS on a build without its native side is fatal, not an error to catch (0z84).
    if (!requireOptionalNativeModule('FileSystem')) return uri;
    const fs = await import('expo-file-system');
    const folder = new fs.Directory(fs.Paths.document, FOLDER);
    folder.create({ idempotent: true });
    const target = new fs.File(folder, `picture-${Date.now()}.jpg`);
    const small = await shrink(uri);
    new fs.File(small ?? uri).copy(target);
    return target.uri;
  } catch {
    return uri;
  }
}

/** A JPEG no longer than `LONG_EDGE` on its long side, in the cache; null when it cannot be made. */
async function shrink(uri: string): Promise<string | null> {
  if (!requireOptionalNativeModule('ExpoImageManipulator')) return null;
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const big = Math.max(original.width, original.height) > LONG_EDGE;
  const small = big
    ? await ImageManipulator.manipulate(original)
        .resize(original.width >= original.height ? { width: LONG_EDGE } : { height: LONG_EDGE })
        .renderAsync()
    : original;
  const saved = await small.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  original.release();
  if (small !== original) small.release();
  return saved.uri;
}
