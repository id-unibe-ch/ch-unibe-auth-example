#!/usr/bin/env node
/**
 * Wendet die SQL-Migrationen aus db/migrations in Dateinamen-Reihenfolge an.
 * Bereits angewendete Migrationen stehen in dbo.schema_migrations.
 *
 *   npm run db:migrate                 Migrationen anwenden
 *   npm run db:migrate -- --create-db  vorher die Datenbank anlegen (nur lokal/Docker)
 *
 * Verbindung über dieselben Variablen wie die App (SQL_SERVER, SQL_DATABASE, SQL_AUTH, …).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sql from 'mssql';

if (existsSync('.env')) process.loadEnvFile('.env');

const env = (name) => (process.env[name]?.trim() ? process.env[name].trim() : undefined);
const server = env('SQL_SERVER');
const database = env('SQL_DATABASE');
if (!server || !database) {
  console.error('SQL_SERVER und SQL_DATABASE müssen gesetzt sein.');
  process.exit(1);
}

function config(db) {
  const mode = env('SQL_AUTH') ?? 'entra';
  const local = ['localhost', '127.0.0.1'].includes(server);
  const base = {
    server,
    database: db,
    port: Number(env('SQL_PORT') ?? 1433),
    options: { encrypt: true, trustServerCertificate: local },
  };
  if (mode === 'sql') return { ...base, user: env('SQL_USER'), password: env('SQL_PASSWORD') };
  const clientId = env('AZURE_CLIENT_ID');
  return { ...base, authentication: { type: 'azure-active-directory-default', options: clientId ? { clientId } : {} } };
}

if (process.argv.includes('--create-db')) {
  const master = await new sql.ConnectionPool(config('master')).connect();
  await master
    .request()
    .input('name', sql.NVarChar(128), database)
    .query(`IF DB_ID(@name) IS NULL
              BEGIN
                DECLARE @stmt NVARCHAR(400) = N'CREATE DATABASE ' + QUOTENAME(@name);
                EXEC (@stmt);
              END`);
  await master.close();
  console.log(`Datenbank ${database} bereit.`);
}

const pool = await new sql.ConnectionPool(config(database)).connect();
await pool.request().query(`
  IF OBJECT_ID('dbo.schema_migrations') IS NULL
    CREATE TABLE dbo.schema_migrations (
      name        NVARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at  DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME()
    )`);

const applied = new Set(
  (await pool.request().query('SELECT name FROM dbo.schema_migrations')).recordset.map((r) => r.name),
);
const dir = join(process.cwd(), 'db', 'migrations');
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

let count = 0;
for (const file of files) {
  if (applied.has(file)) continue;
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    await new sql.Request(tx).batch(readFileSync(join(dir, file), 'utf8'));
    await new sql.Request(tx).input('name', sql.NVarChar(255), file).query('INSERT INTO dbo.schema_migrations (name) VALUES (@name)');
    await tx.commit();
    console.log(`✔ ${file}`);
    count++;
  } catch (err) {
    await tx.rollback();
    console.error(`✘ ${file}: ${err.message}`);
    process.exit(1);
  }
}
console.log(count ? `${count} Migration(en) angewendet.` : 'Datenbank ist aktuell.');
await pool.close();
