/**
 * Laufzeit-Konfiguration aus Umgebungsvariablen.
 *
 * Bewusst `process.env` statt `import.meta.env`: Werte werden zur Laufzeit im Container gelesen
 * (Container Apps / Key Vault-Referenzen) und nicht beim Build eingebettet.
 *
 * Astro/Vite übernimmt `.env` nur in `import.meta.env`, nicht in `process.env`.
 * Deshalb wird eine vorhandene `.env` hier explizit geladen. Bereits gesetzte
 * Umgebungsvariablen (z. B. aus Container Apps) haben Vorrang und werden nicht überschrieben.
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
