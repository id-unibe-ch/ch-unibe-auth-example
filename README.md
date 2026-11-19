# UniBE Login Example

An example site of the University of Bern that shows various sign-in methods via OIDC (or OAuth 2.0) – with a profile view and manual linking of several accounts.

- Production: https://login-example.campus.cloud
- Architecture, decisions, open questions: [`docs/`](docs/README.md)

## Stack

Astro (SSR, Node adapter) · Tailwind CSS · openid-client · Azure SQL (`mssql`) · Azure Container Apps

## Running locally

Requires Node.js 22 and, for the database, Docker.

```bash
npm install
```

```bash
cp .env.example .env
```

Enter client id and secret of the providers you want in `.env`. Providers without configuration are shown greyed out on the sign-in page.

Start the local database and create the schema (without a database the app runs with an in-memory store):

```bash
docker compose up -d
```

```bash
npm run db:migrate -- --create-db
```

```bash
npm run dev
```

The app runs at http://localhost:4321. The redirect URI per provider (enter it in the app registration, details in [`docs/07-app-registrations.md`](docs/07-app-registrations.md)):

```
{APP_BASE_URL}/auth/{provider}/callback
```

| Provider | `{provider}` |
|---|---|
| Entra ID – UniBE | `unibe` |
| Microsoft (personal + all tenants) | `microsoft` |
| Entra External ID | `external-id` |
| SWITCH edu-ID | `switch` |
| ORCID | `orcid` |
| Google | `google` |
| GitHub | `github` |
| AGOV (access open) | `agov` |

Testing without a real registration: start a mock OIDC server on `http://localhost` and point `ORCID_ISSUER` at it. HTTP issuers on `localhost` are allowed in dev mode only.

## Checks

```bash
npm run check
```

```bash
npm run build
```

## Build and container

```bash
docker build -t unibe-login-example .
```

```bash
docker run --rm -p 4321:4321 --env-file .env unibe-login-example
```

## Deployment (Azure)

Bicep template in `infra/`, GitHub Actions workflows in `.github/workflows/` (CI, deploy, infrastructure, fill Key Vault). Setup and procedure: [`docs/08-deployment.md`](docs/08-deployment.md).

## Project structure

```
src/
  lib/providers.ts       Provider registry (add new IdPs here)
  lib/auth.ts            Authorization code flow with PKCE (openid-client)
  lib/store.ts           UserStore interface + in-memory variant (development without a DB)
  lib/store-sql.ts       UserStore on Azure SQL
  lib/db.ts              Connection pool, Entra or SQL login
  lib/session-driver.ts  Astro sessions in Azure SQL
  middleware.ts          Session → user, access control, security headers
  pages/index.astro      Sign-in page
  pages/profile.astro    Profile with linked accounts
  pages/auth/…           Sign-in, callback, sign-out
  pages/account/…        Unlink an account, delete the account
db/migrations/           SQL schema (npm run db:migrate)
infra/                   Bicep template, parameters, SQL grants for the managed identities
.github/workflows/       CI, deploy, infrastructure, Key Vault secrets
```

## Status

- [x] Skeleton, sign-in page, profile, link/unlink
- [x] Azure SQL (users, identities, sessions)
- [x] Infrastructure as Bicep (Container Apps, SQL, Key Vault)
- [x] CI/CD (GitHub Actions with OIDC federation)
- [ ] App registrations at the providers (Entra UniBE, Microsoft, External ID done)
- [ ] Passkeys (WebAuthn)

## Language

Everything in this repository is English. The user interface is German for now ([ADR-016](docs/02-decisions.md)).
