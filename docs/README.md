# UniBE Auth Example – Documentation

An example and reference site showing how the University of Bern connects various identity sources to a web application via OIDC (or OAuth 2.0 where the IdP offers no OIDC) – including manual linking of several accounts into one user account.

## The goal in one sentence

Users land directly on the sign-in page, sign in with one of the offered methods, then see their profile with all linked accounts and can link or unlink further accounts by hand.

## Contents

| Document | Content |
|---|---|
| [01-architecture.md](01-architecture.md) | Overall architecture, components, flows (direct vs. broker) |
| [02-decisions.md](02-decisions.md) | Architecture decisions (ADR list) |
| [03-identity-providers.md](03-identity-providers.md) | IdP matrix: protocol, connection path, identity key, specifics, status |
| [04-account-linking.md](04-account-linking.md) | Data model and flows for sign-in, linking, unlinking, passkeys |
| [05-open-questions.md](05-open-questions.md) | Open questions and things to clarify |
| [06-hosting-and-data.md](06-hosting-and-data.md) | Azure hosting, data storage, costs |
| [07-app-registrations.md](07-app-registrations.md) | Checklist of app registrations per provider |
| [08-deployment.md](08-deployment.md) | Deployment with Bicep and GitHub Actions: resources, setup, custom domain |

## Tech stack (short)

- **Astro** in SSR mode (`output: 'server'`, `@astrojs/node`)
- **Tailwind CSS** (v4 via `@tailwindcss/vite`)
- **openid-client** (panva) for all OIDC and OAuth 2.0 flows
- **Azure SQL** via `mssql`, migrations as plain SQL
- **SimpleWebAuthn** for the app's own passkeys (planned)
- **Hosting:** Azure Container Apps + Azure SQL Basic, region Switzerland North, about CHF 10/month – see [06](06-hosting-and-data.md)
- **Domain:** `https://login-example.campus.cloud`

## Language

Everything in this repository is English – code, comments, documentation, commit messages. The one exception is the text of the user interface, which is German for now; whether the site becomes bilingual is an [open question](05-open-questions.md).
