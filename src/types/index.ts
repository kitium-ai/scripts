/**
 * Shared Types Module
 * Common type definitions used across the package
 */

/**
 * Log level type
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

/**
 * Exit code type
 */
export type ExitCode = 0 | 1;

/**
 * Package manager type
 */
export type PackageManager = 'npm' | 'pnpm' | 'yarn';

/**
 * Common error types
 */
export class ScriptError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly exitCode: ExitCode = 1
  ) {
    super(message);
    this.name = 'ScriptError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Command execution error
 */
export class CommandError extends ScriptError {
  constructor(
    message: string,
    public readonly command: string,
    public readonly stderr?: string
  ) {
    super(message, 'COMMAND_ERROR');
    this.name = 'CommandError';
  }
}

/**
 * File operation error
 */
export class FileError extends ScriptError {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly operation: 'read' | 'write' | 'delete' | 'access'
  ) {
    super(message, 'FILE_ERROR');
    this.name = 'FileError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends ScriptError {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value?: unknown
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/**
 * Configuration error
 */
export class ConfigError extends ScriptError {
  constructor(
    message: string,
    public readonly configKey: string
  ) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigError';
  }
}

/**
 * Network error
 */
export class NetworkError extends ScriptError {
  constructor(
    message: string,
    public readonly url: string,
    public readonly statusCode?: number
  ) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

/**
 * Package.json structure
 */
export interface PackageJson {
  name: string;
  version: string;
  description?: string;
  main?: string;
  types?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  repository?: {
    type: string;
    url: string;
  };
  author?: string | { name: string; email?: string; url?: string };
  license?: string;
  keywords?: string[];
  [key: string]: unknown;
}

/**
 * Git commit info
 */
export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
  parents?: string[];
}

/**
 * File pattern matching result
 */
export interface FileMatch {
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size?: number;
}

/**
 * Command execution options
 */
export interface CommandOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  verbose?: boolean;
  throwOnError?: boolean;
}

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: {
  current: number;
  total: number;
  percentage: number;
  message?: string;
}) => void;
