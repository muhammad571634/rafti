import { serve } from '@hono/node-server';

import { createApp } from './app.ts';
import { config } from './config.ts';
import { geminiProvider } from './llm/gemini.ts';

const provider = config.geminiKey ? geminiProvider(config.geminiKey, config.chatModel) : null;
const app = createApp(provider, { timeoutMs: config.timeoutMs });

serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  console.log(`Sigmazam API on http://${config.host}:${info.port}`);
  console.log(provider ? `Model: ${provider.name}` : 'No GEMINI_API_KEY in server/.env.local: the app keeps its stand-in replies.');
});
