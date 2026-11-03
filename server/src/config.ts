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

/** `ELEVENLABS_VOICES`: a JSON object of character id → voice id; anything else is ignored. */
function voiceMap(raw: string | undefined): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(raw ?? '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(Object.entries(parsed).filter((e): e is [string, string] => typeof e[1] === 'string'));
  } catch {
    return {};
  }
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  /** 0.0.0.0 so a phone on the same Wi-Fi reaches the laptop during testing. */
  host: process.env.HOST ?? '0.0.0.0',
  geminiKey: process.env.GEMINI_API_KEY ?? '',
  /**
   * The chat models, tried in order (`CHAT_MODELS`, comma-separated). Measured on the free tier on
   * 2026-10-26: 3.1 Flash-Lite answered in ~1.5 s, 2.5 Flash in ~3.5 s, the newest Flash was often
   * "experiencing high demand". On 2026-10-28 2.5 Flash stopped serving new keys (404), so
   * 3 Flash Preview took its place. `npm run models` lists what the key may call.
   */
  chatModels: (process.env.CHAT_MODELS ?? 'gemini-3.1-flash-lite,gemini-3-flash-preview,gemini-flash-latest')
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
  /**
   * Supabase: the project URL and the server's secret key (service role; `sb_secret_…` or the
   * legacy JWT) of the cloud project; there is no local stack. Without them the API runs without
   * accounts, as before B0.
   */
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    secretKey: process.env.SUPABASE_SECRET_KEY ?? '',
    /** The public key (`sb_publishable_…`) the app signs in with; handed out by `/v1/client-config`. */
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? '',
  },
  /**
   * `DEV_GRANTS=1` on the laptop's test server only: the app may credit earnings whose rules are not
   * on the server yet (mock purchases, quests, invites; `POST /v1/wallet/grant`). Off anywhere else.
   */
  devGrants: process.env.DEV_GRANTS === '1',
  /**
   * The character's voice on calls (ElevenLabs). Without `ELEVENLABS_API_KEY` calls show captions
   * only. The default voices are ElevenLabs' stock ones until each character gets a voice picked by
   * ear (`ELEVENLABS_VOICES`, a JSON object of character id → voice id). `ELEVENLABS_PRICE_PER_1K`
   * is the list price per 1,000 characters, for the cost log.
   */
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY ?? '',
    model: process.env.ELEVENLABS_MODEL ?? 'eleven_flash_v2_5',
    voiceFemale: process.env.ELEVENLABS_VOICE_FEMALE ?? 'EXAVITQu4vr4xnSDxMaL',
    voiceMale: process.env.ELEVENLABS_VOICE_MALE ?? 'JBFqnCBsd6RMkjVDRZzb',
    voices: voiceMap(process.env.ELEVENLABS_VOICES),
    pricePer1k: Number(process.env.ELEVENLABS_PRICE_PER_1K ?? 0.04),
    /** About 20 minutes of a character speaking, per user a day (900 characters a minute). */
    userCharsPerDay: Number(process.env.SPEECH_USER_CHARS_PER_DAY ?? 20_000),
    /** The whole service a day: about $40 at Flash's list price, a stop on the bill. */
    charsPerDay: Number(process.env.SPEECH_CHARS_PER_DAY ?? 1_000_000),
  },
  /** A longer wait than this and the app writes the stand-in reply instead. */
  timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 20_000),
} as const;
