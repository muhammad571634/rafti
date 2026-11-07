import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const SIG_CHARS = 32;

/**
 * Signs each line the model wrote for a user on a call, so `/v1/voice/speak` reads aloud only those
 * lines, for that user: no one can make a character's voice say their own words, or spend the voice
 * budget on text of their choosing. The key lives in this process only: a line is spoken seconds
 * after it was written, and a restart only means those lines show as captions.
 */
export function lineSigner(key: Buffer = randomBytes(32)) {
  const sign = (userId: string, text: string) => createHmac('sha256', key).update(`${userId}\n${text}`).digest('base64url').slice(0, SIG_CHARS);
  return {
    sign,
    check(userId: string, text: string, sig: string) {
      const want = Buffer.from(sign(userId, text));
      const got = Buffer.from(sig);
      return got.length === want.length && timingSafeEqual(got, want);
    },
  };
}
