/**
 * Settings from the environment. Secrets live in `server/.env.local` (git-ignored) or the host's
 * secret store, never in the repo or a chat. Without a model key the server still starts and says
 * so; the app then keeps its stand-in replies.
 */
try {
  process.loadEnvFile(new URL('../.env.local', import.meta.url));
} catch {
  // No local file: the environment alone decides.
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  /** 0.0.0.0 so a phone on the same Wi-Fi reaches the laptop during testing. */
  host: process.env.HOST ?? '0.0.0.0',
  geminiKey: process.env.GEMINI_API_KEY ?? '',
  /**
   * The chat model. `gemini-flash-latest` follows Google's current Flash, which the free tier
   * serves (2026: Flash-class models only, a daily request cap). `npm run models` lists what the key
   * may call.
   */
  chatModel: process.env.CHAT_MODEL ?? 'gemini-flash-latest',
  /** A longer wait than this and the app writes the stand-in reply instead. */
  timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 20_000),
} as const;
