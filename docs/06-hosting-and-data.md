# 06 – Hosting and data (Azure)

Requirement: hosted in Azure, as cheap as possible, without a wait on the first request. Status: **accepted** ([ADR-011](02-decisions.md)).

> Prices: Azure retail price list in CHF for Switzerland North, list prices without discounts, retrieved on 19 November 2026. The CHF list rounds the per-second prices of Container Apps to 0; those are converted from the USD list prices and are therefore estimates.

## Decision

| Building block | Service | Configuration | Cost per month (estimate) |
|---|---|---|---|
| App | **Azure Container Apps** (Consumption) | 0.25 vCPU / 0.5 GiB, `minReplicas: 1`, `maxReplicas: 1` | ≈ CHF 4 (mostly idle), at most ≈ CHF 12 |
| Database | **Azure SQL Database Basic** | 5 DTU, 2 GB, no auto-pause | ≈ CHF 4.50 |
| Secrets | **Azure Key Vault** (Standard) | Client secrets; access through managed identity | a few cents |
| Images | **GitHub Container Registry** | public package; alternatively ACR Basic (≈ CHF 5) | 0 |
| Logs | **Log Analytics** | 30 days' retention, daily cap 0.2 GB | small |
| Region | **Switzerland North**; SQL in **Sweden Central** | Switzerland North accepts no new Azure SQL servers at the moment ([ADR-018](02-decisions.md)) | – |

**Expected total: about CHF 9–17 a month**, realistically around CHF 10.

### Why no scale to zero

The site is demonstrated; nobody should wait for the app (a few seconds) and the database (up to about a minute) to wake up. Compared with scale to zero, it costs only about CHF 10 a month more.

### Notes

- Container Apps bills a running but idle instance at a much lower rate. For a demo site that is the normal case.
- The monthly free grant of Container Apps applies per subscription. If other apps have used it up, add about CHF 3–4.
- The health probe (`/healthz`) deliberately does not query the database.

## Sessions

Astro sessions with a driver of our own on Azure SQL (`src/lib/session-driver.ts`, table `dbo.sessions`). Sessions survive restarts and deployments; several instances are possible. No Redis needed.

Without a database configuration, the driver falls back to an in-memory store (development only).

## Setting up the database (Azure)

The Bicep template ([08](08-deployment.md)) creates server and database. What is left by hand:

1. The Azure SQL server accepts **Microsoft Entra authentication only**; an Entra group is its administrator.
2. Create the managed identities as database users, connected as a member of that group – [`infra/sql/grant-identities.sql`](../infra/sql/grant-identities.sql):

   ```sql
   CREATE USER [id-authex-app] FROM EXTERNAL PROVIDER;
   ALTER ROLE db_datareader ADD MEMBER [id-authex-app];
   ALTER ROLE db_datawriter ADD MEMBER [id-authex-app];
   ```

   The migration identity `id-authex-migrate` additionally gets `db_ddladmin`.
3. Migrations run as the Container Apps job `caj-authex-migrate` (`node scripts/migrate.mjs`), started by the deploy workflow.
4. The app is configured with `SQL_SERVER=<server>.database.windows.net`, `SQL_DATABASE=<database>`, `SQL_AUTH=entra` and `AZURE_CLIENT_ID` of its user-assigned identity – all set by the template.

The app itself deliberately has no DDL rights.

## Rejected options

| Option | Cost per month | Reason |
|---|---|---|
| Everything scaling to zero (Container Apps + SQL free offer with auto-pause) | ≈ CHF 0–2 | Waits of up to about a minute on the first request |
| Azure SQL free offer without auto-pause | ≈ CHF 175 | Free grant used up after about a day, then the serverless hourly price (CHF 0.52 per vCore hour, min. 0.5 vCore) |
| Azure SQL Standard S0 | ≈ CHF 13.50 | Basic is enough |
| App Service B1 Linux | ≈ CHF 12 | Comparable, but Container Apps is more flexible and cheaper while idle |
| Azure Table Storage | < CHF 1 | No relational model; SQL is more common at UniBE and transfers better as an example |
| Cosmos DB free tier | 0 | Only one free-tier account per subscription, unique keys only per partition |
| PostgreSQL Flexible Server B1ms | ≈ CHF 15–20 | More expensive without benefit for this purpose |

## Data access

`mssql` with parameterised SQL, no ORM ([ADR-014](02-decisions.md)). The application goes through the `UserStore` interface (`src/lib/store.ts`): `SqlUserStore` (`src/lib/store-sql.ts`) once `SQL_SERVER` and `SQL_DATABASE` are set, otherwise an in-memory store for development.
