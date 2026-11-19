/**
 * Runtime configuration from environment variables.
 *
 * Deliberately `process.env` rather than `import.meta.env`: values are read at runtime in the
 * container (Container Apps, Key Vault references) and not inlined at build time.
 *
 * Astro/Vite loads `.env` into `import.meta.env` only, not into `process.env`, so an existing
 * `.env` is loaded here explicitly. Variables that are already set (e.g. by Container Apps)
 * take precedence and are not overwritten.
 */
import { existsSync } from 'node:fs';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : undefined;
}

export function baseUrl(): string {
  return (env('APP_BASE_URL') ?? 'http://localhost:4321').replace(/\/+$/, '');
}

export function redirectUri(providerId: string): string {
  return `${baseUrl()}/auth/${providerId}/callback`;
}
