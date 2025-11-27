#!/usr/bin/env node
/**
 * Interactive helper to store AI provider API tokens in a global user config.
 * Saves to: ~/.kitiumai/ai-tokens.json
 *
 * Providers covered:
 * - OpenAI (https://platform.openai.com/api-keys)
 * - Anthropic Claude (https://console.anthropic.com/settings/keys)
 * - Google Gemini (https://aistudio.google.com/app/apikey)
 * - DeepSeek (https://platform.deepseek.com/api_keys)
 */

import { runAddAiTokens } from '../dist/ai/add-ai-tokens.js';

runAddAiTokens().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
