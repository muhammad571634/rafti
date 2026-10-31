import { GoogleGenAI } from '@google/genai';

import { config } from './config.ts';

/** `npm run models`: the Gemini models this key may call, so CHAT_MODEL is never a guess. */
if (!config.geminiKey) {
  console.log('No GEMINI_API_KEY in server/.env.local.');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: config.geminiKey });
const pager = await ai.models.list();
for await (const model of pager) {
  if (model.supportedActions?.includes('generateContent') && /flash|pro/i.test(model.name ?? '')) console.log(model.name);
}
