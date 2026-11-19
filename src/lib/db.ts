import sql from 'mssql';
import { env } from './config';

/**
 * Verbindung zu Azure SQL (bzw. lokal SQL Server in Docker).
 *
 * Authentisierung über SQL_AUTH:
 *   entra (Standard) – Entra ID via DefaultAzureCredential: Managed Identity in Azure, lokal `az login`.
 *                      Bei einer user-assigned Managed Identity zusätzlich AZURE_CLIENT_ID setzen.
 *   sql              – Benutzer/Passwort (SQL_USER, SQL_PASSWORD), nur für die lokale Entwicklung.
 */

export function isDatabaseConfigured(): boolean {
  return Boolean(env('SQL_SERVER') && env('SQL_DATABASE'));
}

function buildConfig(): sql.config {
  const server = env('SQL_SERVER')!;
  const database = env('SQL_DATABASE')!;
  const mode = env('SQL_AUTH') ?? 'entra';
  const local = ['localhost', '127.0.0.1'].includes(server);

  const base: sql.config = {
    server,
    database,
    port: Number(env('SQL_PORT') ?? 1433),
    options: {
      encrypt: true,
      // Nur der lokale Docker-Container hat ein selbst signiertes Zertifikat.
      trustServerCertificate: local,
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30_000 },
  };

  if (mode === 'sql') {
    return { ...base, user: env('SQL_USER'), password: env('SQL_PASSWORD') };
  }
  if (mode === 'entra') {
    const clientId = env('AZURE_CLIENT_ID');
    return {
      ...base,
      authentication: {
        type: 'azure-active-directory-default',
        options: clientId ? { clientId } : {},
      },
    };
  }
  throw new Error(`Unbekannter SQL_AUTH-Modus: ${mode}`);
}

const g = globalThis as unknown as { __sqlPool?: Promise<sql.ConnectionPool> };

/** Gemeinsamer Connection-Pool (überlebt Hot-Reloads im Dev-Server). */
export function getPool(): Promise<sql.ConnectionPool> {
  if (!g.__sqlPool) {
    g.__sqlPool = new sql.ConnectionPool(buildConfig()).connect();
    g.__sqlPool.catch(() => {
      g.__sqlPool = undefined;
    });
  }
  return g.__sqlPool;
}

/** SQL-Server-Fehlernummern für Verletzungen eines UNIQUE-Constraints bzw. -Index. */
export function isUniqueViolation(err: unknown): boolean {
  const n = (err as { number?: number })?.number;
  return n === 2627 || n === 2601;
}

export { sql };
