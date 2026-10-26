import { serve } from '@hono/node-server';

import { createApp } from './app.ts';
import { config } from './config.ts';
import { geminiProvider } from './llm/gemini.ts';
import { chainProviders, openAiCompatProvider } from './llm/openai-compat.ts';
import type { LlmProvider } from './llm/types.ts';

// The OpenAI-compatible provider first when it is configured, Gemini behind it (or alone).
const providers: LlmProvider[] = [];
if (config.openai.apiKey && config.openai.baseUrl && config.openai.model) providers.push(openAiCompatProvider(config.openai));
if (config.geminiKey) providers.push(geminiProvider(config.geminiKey, config.chatModels));
const provider = chainProviders(providers);
const app = createApp(provider, { timeoutMs: config.timeoutMs });

serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  console.log(`Sigmazam API on http://${config.host}:${info.port}`);
  console.log(provider ? `Model: ${provider.name}` : 'No model key in server/.env.local: the app keeps its stand-in replies.');
});
