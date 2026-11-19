import type { SessionDriver } from 'astro';
import { getPool, isDatabaseConfigured, sql } from './db';

/**
 * Astro session driver on Azure SQL (table dbo.sessions).
 * Without a database configuration: in memory (development only, one instance).
 *
 * Astro handles the expiry of individual values (ttl) inside the stored content itself.
 * This only cleans up orphaned rows.
 */

/** Rows not written for this long are deleted (well beyond the session TTL). */
const STALE_AFTER_HOURS = 24;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

function memoryDriver(): SessionDriver {
  const g = globalThis as unknown as { __sessionMemory?: Map<string, unknown> };
  const map = (g.__sessionMemory ??= new Map());
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => void map.set(key, value),
    removeItem: async (key) => void map.delete(key),
  };
}

let lastCleanup = 0;
async function cleanupIfDue() {
  if (Date.now() - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = Date.now();
  try {
    const pool = await getPool();
    await pool
      .request()
      .input('hours', sql.Int, STALE_AFTER_HOURS)
      .query('DELETE FROM dbo.sessions WHERE updated_at < DATEADD(hour, -@hours, SYSUTCDATETIME())');
  } catch (err) {
    console.error('[session] cleanup failed', err);
  }
}

function sqlDriver(): SessionDriver {
  return {
    async getItem(key) {
      const pool = await getPool();
      const res = await pool
        .request()
        .input('id', sql.NVarChar(128), key)
        .query<{ data: string }>('SELECT data FROM dbo.sessions WHERE id = @id');
      return res.recordset[0]?.data ?? null;
    },
    async setItem(key, value) {
      const pool = await getPool();
      const data = typeof value === 'string' ? value : JSON.stringify(value);
      await pool
        .request()
        .input('id', sql.NVarChar(128), key)
        .input('data', sql.NVarChar(sql.MAX), data)
        .query(
          `UPDATE dbo.sessions WITH (UPDLOCK, SERIALIZABLE) SET data = @data, updated_at = SYSUTCDATETIME() WHERE id = @id;
           IF @@ROWCOUNT = 0 INSERT INTO dbo.sessions (id, data) VALUES (@id, @data);`,
        );
      void cleanupIfDue();
    },
    async removeItem(key) {
      const pool = await getPool();
      await pool.request().input('id', sql.NVarChar(128), key).query('DELETE FROM dbo.sessions WHERE id = @id');
    },
  };
}

export default function (): SessionDriver {
  return isDatabaseConfigured() ? sqlDriver() : memoryDriver();
}
