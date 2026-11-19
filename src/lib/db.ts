import sql from 'mssql';
import { env } from './config';

/**
 * Connection to Azure SQL (or, locally, SQL Server in Docker).
 *
 * Authentication through SQL_AUTH:
 *   entra (default) – Entra ID via DefaultAzureCredential: managed identity in Azure, `az login` locally.
 *                     For a user-assigned managed identity, also set AZURE_CLIENT_ID.
 *   sql             – user and password (SQL_USER, SQL_PASSWORD), local development only.
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
      // Only the local Docker container has a self-signed certificate.
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
  throw new Error(`Unknown SQL_AUTH mode: ${mode}`);
}

const g = globalThis as unknown as { __sqlPool?: Promise<sql.ConnectionPool> };

/** Shared connection pool (survives hot reloads of the dev server). */
export function getPool(): Promise<sql.ConnectionPool> {
  if (!g.__sqlPool) {
    g.__sqlPool = new sql.ConnectionPool(buildConfig()).connect();
    g.__sqlPool.catch(() => {
      g.__sqlPool = undefined;
    });
  }
  return g.__sqlPool;
}

/** SQL Server error numbers for a violated UNIQUE constraint or index. */
export function isUniqueViolation(err: unknown): boolean {
  const n = (err as { number?: number })?.number;
  return n === 2627 || n === 2601;
}

export { sql };
