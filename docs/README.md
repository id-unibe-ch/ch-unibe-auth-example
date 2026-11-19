# UniBE Auth Example – Dokumentation

Beispiel- und Referenzseite, die aufzeigt, wie die Universität Bern verschiedene Identitätsquellen über OIDC (bzw. OAuth 2.0, wo der IdP kein OIDC anbietet) in eine Webapplikation einbindet – inklusive manueller Verknüpfung mehrerer Accounts zu einem Benutzerkonto.

## Ziel in einem Satz

Benutzer:innen landen direkt auf der Anmeldeseite, melden sich mit einer der angebotenen Methoden an, sehen danach ihr Profil mit allen verbundenen Accounts und können weitere Accounts manuell verbinden oder trennen.

## Inhalt

| Dokument | Inhalt |
|---|---|
| [01-architecture.md](01-architecture.md) | Gesamtarchitektur, Komponenten, Flows (direkt vs. Broker) |
| [02-decisions.md](02-decisions.md) | Architekturentscheide (ADR-Liste) |
| [03-identity-providers.md](03-identity-providers.md) | IdP-Matrix: Protokoll, Anbindungsweg, Identitätsschlüssel, Besonderheiten, Status |
| [04-account-linking.md](04-account-linking.md) | Datenmodell und Abläufe für Login, Verknüpfen, Trennen, Passkeys |
| [05-open-questions.md](05-open-questions.md) | Offene Fragen und Klärungsbedarf |
| [06-hosting-and-data.md](06-hosting-and-data.md) | Azure-Hosting, Datenhaltung, Kosten |
| [07-app-registrations.md](07-app-registrations.md) | Checkliste App-Registrierungen pro Anbieter |

## Tech-Stack (Kurzfassung)

- **Astro** im SSR-Modus (`output: 'server'`, `@astrojs/node`)
- **Tailwind CSS** (v4 via `@tailwindcss/vite`)
- **openid-client** (panva) für alle OIDC- und OAuth-2.0-Flows
- **SimpleWebAuthn** für app-eigene Passkeys
- **Hosting:** Azure Container Apps + Azure SQL Basic, Region Switzerland North, ca. CHF 10/Monat – siehe [06](06-hosting-and-data.md)
- **Domain:** `https://login-example.campus.cloud`
