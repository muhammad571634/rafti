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
// The Google SDK prefers GOOGLE_API_KEY over GEMINI_API_KEY when both are set, and the laptop has
// one that may bill. The server only ever uses its own key.
delete process.env.GOOGLE_API_KEY;

export const config = {
  port: Number(process.env.PORT ?? 8787),
  /** 0.0.0.0 so a phone on the same Wi-Fi reaches the laptop during testing. */
  host: process.env.HOST ?? '0.0.0.0',
  geminiKey: process.env.GEMINI_API_KEY ?? '',
  /**
   * The chat models, tried in order (`CHAT_MODELS`, comma-separated). Measured on the free tier on
   * 2026-10-26: 3.1 Flash-Lite answered in ~1.5 s, 2.5 Flash in ~3.5 s, the newest Flash was often
   * "experiencing high demand". `npm run models` lists what the key may call.
   */
  chatModels: (process.env.CHAT_MODELS ?? 'gemini-3.1-flash-lite,gemini-2.5-flash,gemini-flash-latest')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean),
  /** An OpenAI-compatible provider (DeepSeek, OpenRouter, Groq…), tried before Gemini when all three are set. */
  openai: {
    baseUrl: process.env.OPENAI_BASE_URL ?? '',
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? '',
    label: process.env.OPENAI_LABEL ?? 'openai',
  },
  /** A longer wait than this and the app writes the stand-in reply instead. */
  timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 20_000),
} as const;
