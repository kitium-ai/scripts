/**
 * AI Integration Module
 * Utilities for working with AI services and token management
 */

/**
 * AI token configuration
 */
export interface AITokenConfig {
  openai?: string;
  anthropic?: string;
  google?: string;
  deepseek?: string;
  [key: string]: string | undefined;
}

/**
 * AI provider type
 */
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'deepseek';

/**
 * Validate AI token format
 * @param provider AI provider name
 * @param token Token to validate
 * @returns True if token format is valid
 */
export function validateAIToken(provider: AIProvider, token: string): boolean {
  if (!token || token.trim().length === 0) {
    return false;
  }

  // Basic validation patterns
  const patterns: Record<AIProvider, RegExp> = {
    openai: /^sk-[a-zA-Z0-9]{48,}$/,
    anthropic: /^sk-ant-[a-zA-Z0-9-]{95,}$/,
    google: /^[a-zA-Z0-9_-]{39}$/,
    deepseek: /^sk-[a-zA-Z0-9]{32,}$/,
  };

  return patterns[provider]?.test(token) ?? false;
}

/**
 * Get AI token from environment or config file
 * @param provider AI provider name
 * @returns Token if found, undefined otherwise
 */
export function getAIToken(provider: AIProvider): string | undefined {
  // Try environment variables first
  const envVars: Record<AIProvider, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
  };

  return process.env[envVars[provider]];
}

/**
 * Check if AI provider is configured
 * @param provider AI provider name
 * @returns True if provider is configured
 */
export function isAIProviderConfigured(provider: AIProvider): boolean {
  const token = getAIToken(provider);
  return token !== undefined && validateAIToken(provider, token);
}

/**
 * Get all configured AI providers
 * @returns Array of configured provider names
 */
export function getConfiguredAIProviders(): AIProvider[] {
  const providers: AIProvider[] = ['openai', 'anthropic', 'google', 'deepseek'];
  return providers.filter(provider => isAIProviderConfigured(provider));
}

/**
 * Mask AI token for logging (show first/last 4 chars)
 * @param token Token to mask
 * @returns Masked token
 */
export function maskAIToken(token: string): string {
  if (!token || token.length < 8) {
    return '****';
  }
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}
