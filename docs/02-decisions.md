# 02 – Architecture decisions

Status: **accepted** = decided · **proposed** = to be confirmed

When a decision changes, add a new entry and mark the superseded one rather than editing it.

---

## ADR-001: Astro (SSR) as the framework

- **Status:** accepted
- **Context:** Astro is used in several UniBE projects; the know-how exists.
- **Decision:** Astro in server mode (`output: 'server'`) with `@astrojs/node` (standalone). SSR is needed for OAuth callbacks, sessions and database access.
- **Consequence:** The app runs as a Node process (container), not as a purely static site.

## ADR-002: Tailwind CSS for the design

- **Status:** accepted
- **Decision:** Tailwind CSS v4 via `@tailwindcss/vite`. Third-party sign-in buttons follow the providers' branding guidelines (Google, Apple, Microsoft, GitHub, Meta, ORCID, SWITCH, AGOV).

## ADR-003: Show both connection paths (direct and broker)

- **Status:** accepted
- **Context:** Two common patterns: every IdP connected in the app itself, or delegation to a broker (Entra External ID).
- **Decision:** The example site shows both side by side. The sign-in page groups the buttons accordingly.
- **Consequences:**
  - The same Google account signed in *directly* and *via External ID* yields **two different identities** (different issuer and subject). This is intended and explained on the site – it illustrates exactly the difference between the two paths.
  - The broker path hides non-OIDC providers (Facebook) behind a clean OIDC interface.

## ADR-004: Mark GitHub and Meta explicitly as OAuth 2.0

- **Status:** accepted
- **Context:** GitHub issues no ID token (plain OAuth 2.0). Facebook Login on the web is OAuth 2.0 too (OIDC only in a limited form, "Limited Login" on iOS).
- **Decision:** GitHub and Meta are connected directly as OAuth 2.0 providers: authorization code + PKCE, then the user's data from the provider's API (GitHub `/user` and `/user/emails`, Meta Graph API `/me`). The UI and the documentation label them "OAuth 2.0".
- **Consequence:** For these providers there is no cryptographically signed identity statement; the identity key is the API's numeric user id.

## ADR-005: No automatic merging of accounts

- **Status:** accepted
- **Context:** Automatic merging by unique attributes was originally planned. Email addresses are unsuitable for it: for foreign Entra tenants the `email` claim can be set freely by the tenant and is unverified ("nOAuth"), other providers do not always send `email_verified`, and Apple may hand out relay addresses.
- **Decision:** Accounts are linked **only by hand**: the signed-in user starts "link account" and proves ownership by signing in with the second provider. Identities are identified solely by (issuer, subject).
- **Consequence:** Someone who signs in with a new provider instead of linking it gets a new user account. The sign-in page says so. Handling such duplicates: see the [open questions](05-open-questions.md).

## ADR-006: The Microsoft button = personal accounts + all tenants

- **Status:** accepted
- **Decision:** The "Sign in with Microsoft" button uses the `common` endpoint (personal Microsoft accounts and work or school accounts of every tenant, as many sites do). **Every tenant** is admitted. There is also a separate UniBE button pointing at the UniBE tenant only.
- **Consequences:**
  - Issuer validation has to insert the tenant id from the token (`https://login.microsoftonline.com/{tid}/v2.0`); a static issuer check does not work with `common`. `openid-client` does this itself for an Entra issuer containing `{tenantid}`.
  - Personal accounts are recognised by `tid = 9188040d-6c67-4c5b-b112-36a304b66dad`.
  - A UniBE account signing in through the Microsoft button produces the same identity key as through the UniBE button and therefore lands at the same user (see [03](03-identity-providers.md)).

## ADR-007: No separate eduGAIN – SWITCHaai covers it

- **Status:** accepted
- **Decision:** No separate eduGAIN connection (SAML). The OIDC connection through SWITCH (edu-ID / SWITCHaai) covers the need.

## ADR-008: Add ORCID and Apple

- **Status:** accepted; Apple **deferred**
- **Context:** ORCID is the standard identifier for researchers; Apple is the most important consumer IdP next to Google and Meta (and effectively mandatory for iOS apps once other social sign-ins are offered).
- **Decision:** ORCID is connected directly via OIDC. Apple is planned (direct and via External ID) but not set up for now, because UniBE currently has no Apple Developer account. The provider is in the registry as "deferred" and shown accordingly on the sign-in page.

## ADR-009: Passkeys – the app's own and through the IdPs

- **Status:** accepted, the app's own passkeys implemented (details in [04](04-account-linking.md#passkeys))
- **Decision:** Passkeys are shown on two levels:
  1. **The app's own (WebAuthn, SimpleWebAuthn):** users can register passkeys in their profile and then sign in with a passkey directly.
  2. **On the IdP's side:** passkey sign-in at Entra (UniBE tenant), External ID and others. The app sees only the `amr`/`acr` claims and shows them.

## ADR-010: openid-client as the only auth library

- **Status:** accepted (implemented)
- **Context:** Alternatives: Auth.js (`auth-astro`) or Arctic. Auth.js brings its own account-linking behaviour, which we want to control explicitly; Arctic is lean but offers no generic OIDC discovery or validation.
- **Decision:** `openid-client` (v6) for every provider – OIDC via discovery, GitHub/Meta with manually configured endpoints. Linking logic and data model stay entirely in our code and are therefore traceable as an example.

## ADR-011: Hosting on Azure Container Apps (always on), data in Azure SQL Basic

- **Status:** accepted – details, costs and rejected options in [06](06-hosting-and-data.md)
- **Context:** Cheap, but without a wait on the first request, because the site is demonstrated.
- **Decision:** Container Apps (Consumption) in Switzerland North with one instance always running (no scale to zero); Azure SQL Database Basic (no auto-pause); secrets in Key Vault.
- **Consequence:** about CHF 10 a month instead of about CHF 0–2 with scale to zero.

## ADR-018: Azure SQL in Sweden Central

- **Status:** accepted
- **Context:** The first deployment failed with `RegionDoesNotAllowProvisioning`: Switzerland North accepts no new Azure SQL servers at the moment.
- **Decision:** SQL server and database go to **Sweden Central** (parameter `sqlLocation`); everything else stays in Switzerland North. Supersedes the SQL part of [ADR-011](#adr-011-hosting-on-azure-container-apps-always-on-data-in-azure-sql-basic).
- **Consequences:**
  - User accounts, linked identities (with the stored claims), passkeys' public keys and sessions are stored in the EU, not in Switzerland. Acceptable for a demo site; to be noted in the privacy statement ([open question 8](05-open-questions.md)).
  - Each query crosses from Switzerland North to Sweden Central (a few tens of milliseconds); the app makes only a handful per request.
  - Moving back once Switzerland North accepts new servers again means a new server and a data copy; the parameter makes the template ready for it.

## ADR-012: Meta deferred

- **Status:** accepted
- **Context:** Facebook Login (direct as well as via External ID) needs a Meta app under a Meta Business account. None exists at the moment.
- **Decision:** Meta is not set up for now; it is in the registry as "deferred". [ADR-004](#adr-004-mark-github-and-meta-explicitly-as-oauth-20) still applies once Meta is implemented.

## ADR-013: Domain `login-example.campus.cloud`

- **Status:** accepted
- **Decision:** The application runs at `https://login-example.campus.cloud`.
- **Consequences:** Redirect URIs are `https://login-example.campus.cloud/auth/{provider}/callback`. The domain is also the WebAuthn RP id for the app's own passkeys.

## ADR-014: Data access with `mssql` and SQL migrations, no ORM

- **Status:** accepted (implemented)
- **Context:** Prisma and Kysely were the candidates for Azure SQL. The application needs about ten simple queries; as a reference implementation, what happens in the database should be easy to follow.
- **Decision:** Direct access with the `mssql` package (driver `tedious`) and parameterised SQL. The schema lives as SQL files in `db/migrations/` and is applied with `npm run db:migrate` (recorded in `dbo.schema_migrations`).
- **Consequences:**
  - No code generation, no additional abstraction layer; the schema is directly readable.
  - Authentication to Azure SQL with Entra ID (managed identity) – no password in the configuration. Locally a SQL login against SQL Server in Docker.
  - The database enforces the uniqueness of (issuer, subject) with a `UNIQUE` constraint; two concurrent links of the same identity are therefore correctly detected as a conflict.
  - Astro sessions are kept in the same database through a session driver of our own (`dbo.sessions`).

## ADR-015: Bicep and GitHub Actions with OIDC federation

- **Status:** accepted (implemented) – details in [08](08-deployment.md)
- **Context:** The workflows follow `ch-unibe-learning-astro`: a tenant policy keeps service principals from assigning roles, the workflow identity holds `Unibe-Application-Owner (mg-unibe)` on the resource group, and the Key Vault guardrail policy requires purge protection as well as an expiry date and a content type on every secret.
- **Decision:** Infrastructure as Bicep (`infra/`), deployed by a manual workflow (`infra.yml`, what-if or deploy). The image is built on every push to `main` and published to GHCR (`deploy.yml`), which also runs the migration job and rolls out the app. Client secrets travel from GitHub secrets into the Key Vault through `secrets.yml`, never as template parameters. All workflows sign in to Azure with OIDC federation.
- **Consequences:**
  - The role assignments are created by a person on the first deployment (`assignRoles`); the workflows set it to `false`.
  - The image is public on GHCR, so the Container App pulls it without credentials.

## ADR-016: English throughout the repository

- **Status:** accepted
- **Decision:** Code, comments, documentation, workflow and resource descriptions, and commit messages are English, as in `ch-unibe-learning-astro`. The user interface stays German for now; bilingual UI is an open question.
- **Superseded in part by [ADR-017](#adr-017-bilingual-user-interface-german-and-english)** for the user interface.

## ADR-017: Bilingual user interface (German and English)

- **Status:** accepted
- **Decision:** The user interface is offered in German and English, with a language switch in the header. Supersedes the "UI German for now" part of [ADR-016](#adr-016-english-throughout-the-repository).
- **Design direction:** dark mode by default with a light option, Tailwind's zinc greys and the emerald palette as the accent, the providers' logos on the sign-in buttons. The official logos and button rules come from each provider's brand guidelines (Google, Microsoft, GitHub, ORCID, SWITCH).
- **Sign-in page:** the providers are grouped by audience – a prominent UniBE button, then "universities & research" (SWITCH edu-ID, ORCID), "other accounts" (Microsoft, Google, GitHub, email code via External ID), the passkey button and "coming soon" (AGOV, Apple, Meta).
- **Guided sign-in as a second way in:** a link "Help me choose" on the sign-in page leads to a guided page ("Who are you?" → a recommended method plus alternatives), which links back to the full list.
- **No "how it works" page in the header.** The difference between the direct and the broker path is explained in the profile's technical details instead.
