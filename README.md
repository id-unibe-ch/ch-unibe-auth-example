# UniBE Login-Beispiel

Beispielseite der Universität Bern, die verschiedene Anmeldemethoden über OIDC (bzw. OAuth 2.0) zeigt – mit Profilansicht und manuellem Verknüpfen mehrerer Accounts.

- Produktiv: https://login-example.campus.cloud
- Architektur, Entscheide, offene Fragen: [`docs/`](docs/README.md)

## Stack

Astro (SSR, Node-Adapter) · Tailwind CSS · openid-client · Azure SQL (`mssql`) · Azure Container Apps

## Lokal starten

Voraussetzung: Node.js 22.

```bash
npm install
```

```bash
cp .env.example .env
```

Lokale Datenbank starten und Schema anlegen (Docker nötig; ohne Datenbank läuft die App mit einem In-Memory-Speicher):

```bash
docker compose up -d
```

```bash
npm run db:migrate -- --create-db
```

Client-ID und Secret der gewünschten Provider in `.env` eintragen. Provider ohne Konfiguration werden auf der Login-Seite ausgegraut angezeigt.

```bash
npm run dev
```

Die App läuft unter http://localhost:4321. Redirect-URI pro Provider (bei der App-Registrierung eintragen, Details in [`docs/07-app-registrations.md`](docs/07-app-registrations.md)):

```
{APP_BASE_URL}/auth/{provider}/callback
```

| Provider | `{provider}` |
|---|---|
| Entra ID – UniBE | `unibe` |
| Microsoft (privat + alle Tenants) | `microsoft` |
| Entra External ID | `external-id` |
| SWITCH edu-ID | `switch` |
| ORCID | `orcid` |
| Google | `google` |
| GitHub | `github` |
| AGOV (Zugang offen) | `agov` |

Lokal testen ohne echte Registrierung: einen Mock-OIDC-Server auf `http://localhost` starten und `ORCID_ISSUER` darauf setzen. HTTP-Issuer auf `localhost` sind nur im Dev-Modus erlaubt.

## Build und Container

```bash
npm run build
```

```bash
docker build -t unibe-login-example .
```

```bash
docker run --rm -p 4321:4321 --env-file .env unibe-login-example
```

## Deployment (Azure)

Bicep-Vorlage in `infra/`, GitHub-Actions-Workflows in `.github/workflows/` (CI, Deploy, Infrastruktur, Key Vault befüllen). Einrichtung und Ablauf: [`docs/08-deployment.md`](docs/08-deployment.md).

## Projektstruktur

```
src/
  lib/providers.ts   Provider-Registry (neue IdPs hier ergänzen)
  lib/auth.ts        Authorization Code Flow mit PKCE (openid-client)
  lib/store.ts       Schnittstelle UserStore + In-Memory-Variante (Entwicklung ohne DB)
  lib/store-sql.ts   UserStore auf Azure SQL
  lib/db.ts          Connection-Pool, Entra- oder SQL-Login
  lib/session-driver.ts  Astro-Sessions in Azure SQL
  middleware.ts      Session → Benutzer, Zugriffsschutz, Security-Header
  pages/index.astro  Login-Seite
  pages/profile.astro Profil mit verbundenen Accounts
  pages/auth/…       Login, Callback, Logout
  pages/account/…    Account trennen, Konto löschen
db/migrations/       SQL-Schema (npm run db:migrate)
infra/               Bicep-Vorlage, Parameter, SQL-Rechte für die Managed Identities
```

## Stand

- [x] Grundgerüst, Login-Seite, Profil, Verknüpfen/Trennen
- [x] Azure SQL (Benutzer, Identitäten, Sessions)
- [ ] App-Registrierungen bei den Providern (Entra UniBE, Microsoft, External ID erledigt)
- [ ] Passkeys (WebAuthn)
- [x] Infrastruktur als Bicep (Container Apps, SQL, Key Vault)
- [x] CI/CD (GitHub Actions mit OIDC-Federation)
