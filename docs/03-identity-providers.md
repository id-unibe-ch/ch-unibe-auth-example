# 03 – Identity providers

## Overview

| # | Provider | Audience | Protocol | Path | Identity key | Status |
|---|---|---|---|---|---|---|
| 1 | Entra ID – UniBE tenant | Staff, students | OIDC | direct | `tid` + `oid` | implemented, registered |
| 2 | Microsoft (`common`) | Personal Microsoft accounts + all Entra tenants | OIDC | direct | `tid` + `oid` | implemented, registered |
| 3 | Entra External ID (`unibeeid`) | External people (social, email one-time passcode, passkey) | OIDC | broker | `iss` + `oid` | implemented, registered, user flow created |
| 4 | SWITCH edu-ID / SWITCHaai | Members of Swiss and international universities | OIDC | direct | `iss` + `sub` | implemented, registration pending |
| 5 | ORCID | Researchers | OIDC | direct | `sub` (= ORCID iD) | implemented, registration pending |
| 6 | AGOV | Citizens, government-verified identity | OIDC | direct | `iss` + `sub` | **access open** |
| 7 | Google | Public | OIDC | direct + broker | `iss` + `sub` | implemented, registration pending |
| 8 | Apple | Public | OIDC | direct + broker | `iss` + `sub` | **deferred** (no Apple Developer account) |
| 9 | GitHub | Developers | **OAuth 2.0** | direct | numeric `id` | implemented, registration pending |
| 10 | Meta (Facebook) | Public | **OAuth 2.0** (direct) / OIDC via broker | direct + broker | app-scoped `id` | **deferred** (no Meta Business account) |
| 11 | Passkey (the app's own) | All signed-in users | WebAuthn | the app's own | credential id | planned |

> **Identity key:** what is stored is always the pair (issuer, subject). For Entra the subject is `oid` and the issuer the tenant-specific issuer URL. Signing in with the same UniBE account through the UniBE button and the Microsoft button therefore leads to the same identity. Entra's `sub`, by contrast, is pairwise per app and less suitable as a key across apps.

---

## 1. Entra ID – UniBE tenant

- **Tenant:** `unibe.ch` – `d400387a-212f-43ea-ac7f-77aa12d7977e`
- **Issuer:** `https://login.microsoftonline.com/d400387a-212f-43ea-ac7f-77aa12d7977e/v2.0`
- **Registration:** app registration in the UniBE tenant (single tenant).
- **Scopes:** `openid profile email` (`offline_access` is not needed).
- **Interesting claims:** `oid`, `tid`, `preferred_username`, `name`, `amr`, optionally groups or roles (e.g. staff vs. students – see the open questions).
- **Passkeys:** if enabled in the tenant, visible in `amr`.

## 2. Microsoft (personal + all tenants)

- **Issuer (discovery):** `https://login.microsoftonline.com/common/v2.0`
- **Registration:** app registration with "Accounts in any organizational directory and personal Microsoft accounts".
- **Issuer validation:** dynamic, with `{tid}` from the token (see [ADR-006](02-decisions.md)).
- **Specifics:** personal accounts have `tid = 9188040d-6c67-4c5b-b112-36a304b66dad`. A foreign tenant may require admin consent if it restricts user consent – usually not an issue for `openid profile email`.
- **Note:** an email address from a foreign tenant is not verified and is used for display only.

## 3. Entra External ID (broker)

- **Directory:** `unibeeid.onmicrosoft.com` – `a791c572-76d6-4480-83df-b81dcdb92f69` (external tenant, region EU). App registrations may be created.
- **Issuer (discovery):** `https://a791c572-76d6-4480-83df-b81dcdb92f69.ciamlogin.com/a791c572-76d6-4480-83df-b81dcdb92f69/v2.0`
- **Important:** discovery through `unibeeid.ciamlogin.com` returns the tenant-id form (`{tid}.ciamlogin.com`) as the issuer. For the issuer check to pass, the app has to use the tenant-id URL directly.
- **Identity key:** `oid` (the user's object id in the external tenant).
- **Providers federated by the broker:** Google, Apple, Facebook, email one-time passcode, passkeys (availability to be checked), optionally further OIDC providers.
- **Specifics:** the app sees only External ID as the issuer; the original provider shows in the `idp` claim (where configured) and in the profile.

## 4. SWITCH edu-ID / SWITCHaai

- **Issuer:** `https://login.eduid.ch/`
- **Registration:** in the SWITCH Resource Registry.
- **Client authentication:** token endpoint method **Client Secret Post** – `openid-client` sends the secret in the POST body.
- **Interesting claims and attributes:** `swissEduPersonUniqueID`, affiliations, home organisation – each released per attribute in the registry.
- **Note:** per [ADR-007](02-decisions.md) it also covers the international need.

## 5. ORCID

- **Issuer:** `https://orcid.org` (sandbox: `https://sandbox.orcid.org`, set through `ORCID_ISSUER`)
- **Registration:** public API credentials are enough for sign-in (member API only if needed).
- **Scopes:** `openid`.
- **Specifics:** `sub` is the ORCID iD (e.g. `0000-0002-1825-0097`); the name only if made public; **no email** in the ID token.

## 6. AGOV

- **Protocol:** OIDC; the issuer is set through `AGOV_ISSUER`.
- **Status:** access and onboarding with the federal administration are still to be clarified.
- **Specifics:** request and evaluate levels of assurance through `acr` – a very good demo case for step-up. Which attributes and levels are available to us is open.

## 7. Google

- **Issuer:** `https://accounts.google.com`
- **Scopes:** `openid email profile`
- **Specifics:** `email_verified` is present; `hd` claim for Google Workspace accounts.

## 8. Apple (deferred)

- **Issuer:** `https://appleid.apple.com`
- **Registration:** needs an Apple Developer account (paid, about USD 99 a year); a Services ID, a key (`.p8`), a verified domain.
- **Specifics, for when it is implemented:**
  - `client_secret` is a **self-signed JWT (ES256)** valid for at most six months – generated at runtime from the key in Key Vault.
  - With the scopes `name email`, `response_mode=form_post` is mandatory → the callback has to accept POST (cross-site POST: the transaction cookie needs `SameSite=None; Secure`, and Astro's origin check must let it through).
  - The name is sent **only on the first sign-in**.
  - The email may be a relay address (`…@privaterelay.appleid.com`).

## 9. GitHub (OAuth 2.0)

- **Endpoints:** `https://github.com/login/oauth/authorize`, `https://github.com/login/oauth/access_token`, API `https://api.github.com/user` and `/user/emails`
- **Registration:** an OAuth App (or GitHub App) in the UniBE organisation.
- **Scopes:** `read:user user:email`
- **Specifics:** no ID token, no discovery. The key is the numeric `id` (not `login`, which can change).

## 10. Meta / Facebook (deferred)

- **Direct (OAuth 2.0):** Facebook Login, then Graph API `/me?fields=id,name,email`.
- **Via broker:** Facebook as a built-in provider in External ID.
- **Registration:** a Meta app; app review for the email permission may be required; check business verification.
- **Specifics:** `id` is app-scoped. Email is not guaranteed.

## 11. Passkey (the app's own)

See [04 – Passkeys](04-account-linking.md#passkeys).
