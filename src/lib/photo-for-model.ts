import { PHOTO_CHARS_MAX, type ChatImage } from '@/ai/photo-prompt';

/** Long enough to read a screenshot of a chat, small enough for a slow connection. */
const LONG_EDGE = 1024;
const JPEG_QUALITY = 0.7;

export interface PreparedPhoto {
  id: string;
  image: ChatImage;
}

/** One picture as the model gets it, or null when its file is gone or cannot be read. */
async function prepare(uri: string): Promise<ChatImage | null> {
  // Loaded here, so the store and its tests never touch the native module.
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const small =
    Math.max(original.width, original.height) > LONG_EDGE
      ? await ImageManipulator.manipulate(original)
          .resize(original.width >= original.height ? { width: LONG_EDGE } : { height: LONG_EDGE })
          .renderAsync()
      : original;
  const saved = await small.saveAsync({ base64: true, compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  // A full-size bitmap is tens of megabytes on a phone: let it go now.
  original.release();
  if (small !== original) small.release();
  return saved.base64 && saved.base64.length <= PHOTO_CHARS_MAX ? { mimeType: 'image/jpeg', data: saved.base64 } : null;
}

/** The photos that could be read, in order. The rest are left out: the character then says it cannot see them. */
export async function photosForModel(photos: readonly { id: string; uri: string }[]): Promise<PreparedPhoto[]> {
  const prepared = await Promise.all(
    photos.map(async ({ id, uri }) => {
      const image = await prepare(uri).catch((error: unknown) => {
        console.warn(`[photo] could not read a photo: ${String((error as Error)?.message).slice(0, 120)}`);
        return null;
      });
      return image ? { id, image } : null;
    }),
  );
  return prepared.filter((photo): photo is PreparedPhoto => !!photo);
}
