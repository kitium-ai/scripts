import fs, { promises as fsp } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import type { WriteStream } from 'node:tty';

import chalk from 'chalk';

const CONFIG_DIR = path.join(os.homedir(), '.kitiumai');
const CONFIG_PATH = path.join(CONFIG_DIR, 'ai-tokens.json');

type ProviderKey = 'openai' | 'claude' | 'gemini' | 'deepseek';

interface Provider {
  key: ProviderKey;
  name: string;
  env: string;
  help: string;
}

const providers: Provider[] = [
  {
    key: 'openai',
    name: 'OpenAI',
    env: 'OPENAI_API_KEY',
    help: 'Create a secret key at https://platform.openai.com/api-keys (starts with "sk-").',
  },
  {
    key: 'claude',
    name: 'Anthropic Claude',
    env: 'ANTHROPIC_API_KEY',
    help: 'Create an API key at https://console.anthropic.com/settings/keys (starts with "sk-ant-").',
  },
  {
    key: 'gemini',
    name: 'Google Gemini',
    env: 'GEMINI_API_KEY',
    help: 'Create an API key at https://aistudio.google.com/app/apikey.',
  },
  {
    key: 'deepseek',
    name: 'DeepSeek',
    env: 'DEEPSEEK_API_KEY',
    help: 'Create an API key at https://platform.deepseek.com/api_keys.',
  },
];

const log = {
  info: (message: string) => console.log(chalk.blue('ℹ'), message),
  success: (message: string) => console.log(chalk.green('✔'), message),
  warn: (message: string) => console.log(chalk.yellow('!'), message),
  error: (message: string) => console.error(chalk.red('✖'), message),
};

function prompt(question: string, mask = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    }) as readline.Interface & { output?: Writable; input: Readable };

    const out = rl.output as WriteStream | undefined;

    if (mask && out && 'isTTY' in out && out.isTTY) {
      out.write(question);
      rl.input.on('data', (char: Buffer | string) => {
        const ch = typeof char === 'string' ? char : char.toString();
        switch (ch) {
          case '\n':
          case '\r':
          case '\u0004':
            out.write('\n');
            break;
          default:
            out.write('*');
            break;
        }
      });
    }

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function ensureConfigDir(): Promise<void> {
  if (!fs.existsSync(CONFIG_DIR)) {
    await fsp.mkdir(CONFIG_DIR, { recursive: true });
  }
}

async function loadExisting(): Promise<Record<string, string>> {
  try {
    const raw = await fsp.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

async function saveConfig(config: Record<string, string>): Promise<void> {
  await ensureConfigDir();
  await fsp.writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

export async function runAddAiTokens(): Promise<void> {
  log.info(`This will store AI API tokens in ${CONFIG_PATH}`);
  log.info('Leave input empty to skip a provider.\n');

  const existing = await loadExisting();
  const updated = { ...existing };
  let changed = false;

  for (const provider of providers) {
    const environmentValue = process.env[provider.env];
    if (environmentValue) {
      log.info(`${provider.name} token detected in ${provider.env}; using that value.`);
      updated[provider.key] = environmentValue;
      changed = true;
      continue;
    }

    log.info(`${provider.name}: ${provider.help}`);
    const token = await prompt(`Enter ${provider.name} API key (leave blank to skip): `, true);
    if (!token) {
      log.warn(`Skipped ${provider.name}`);
      continue;
    }
    updated[provider.key] = token;
    changed = true;
    log.success(`${provider.name} token captured.`);
  }

  if (!changed) {
    log.warn('No tokens provided; exiting without changes.');
    return;
  }

  await saveConfig(updated);
  log.success(`Saved tokens to ${CONFIG_PATH}`);
  log.info('Keep this file secure; consider restricting file permissions if needed.');
}
