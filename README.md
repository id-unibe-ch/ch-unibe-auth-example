# UniBE Login-Beispiel

Beispielseite der Universität Bern, die verschiedene Anmeldemethoden über OIDC (bzw. OAuth 2.0) zeigt – mit Profilansicht und manuellem Verknüpfen mehrerer Accounts.

- Produktiv: https://login-example.campus.cloud
- Architektur, Entscheide, offene Fragen: [`docs/`](docs/README.md)

## Stack

Astro (SSR, Node-Adapter) · Tailwind CSS · openid-client · Azure Container Apps

## Lokal starten

Voraussetzung: Node.js 22.

```bash
npm install
```

```bash
cp .env.example .env
```

Client-ID und Secret der gewünschten Provider in `.env` eintragen. Provider ohne Konfiguration werden auf der Login-Seite ausgegraut angezeigt.

```bash
npm run dev
```

Die App läuft unter http://localhost:4321. Redirect-URI pro Provider (bei der App-Registrierung eintragen):

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

## Projektstruktur

```
src/
  lib/providers.ts   Provider-Registry (neue IdPs hier ergänzen)
  lib/auth.ts        Authorization Code Flow mit PKCE (openid-client)
  lib/store.ts       Benutzer & Identitäten (aktuell In-Memory, später Azure SQL)
  middleware.ts      Session → Benutzer, Zugriffsschutz, Security-Header
  pages/index.astro  Login-Seite
  pages/profile.astro Profil mit verbundenen Accounts
  pages/auth/…       Login, Callback, Logout
  pages/account/…    Account trennen, Konto löschen
```

## Stand

- [x] Grundgerüst, Login-Seite, Profil, Verknüpfen/Trennen (In-Memory-Speicher)
- [ ] App-Registrierungen bei den Providern
- [ ] Azure SQL (Benutzer, Identitäten, Sessions)
- [ ] Passkeys (WebAuthn)
- [ ] Infrastruktur (Container Apps, SQL, Key Vault) und CI/CD
