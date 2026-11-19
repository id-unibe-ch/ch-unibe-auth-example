# 07 – Checklist: app registrations

One registration per provider. The redirect URI always has the form:

```
{base URL}/auth/{provider}/callback
```

- **Production:** `https://login-example.campus.cloud`
- **Development:** `http://localhost:4321`, or `https://localhost:4321` with a local certificate (README, "HTTPS locally") – required by providers that accept HTTPS redirect URIs only, such as SWITCH and ORCID

Client id and secret go into the environment variables (locally `.env`, in production Key Vault via [`secrets.yml`](08-deployment.md)), see `.env.example`.

## Overview

| # | Where | `{provider}` | Environment variables | Status |
|---|---|---|---|---|
| 1 | UniBE tenant (unibe365) | `unibe` | `ENTRA_UNIBE_CLIENT_ID`, `ENTRA_UNIBE_CLIENT_SECRET` | ☑ registered |
| 2 | UniBE tenant (unibe365) | `microsoft` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | ☑ registered |
| 3 | External ID `unibeeid` | `external-id` | `EXTERNAL_ID_CLIENT_ID`, `EXTERNAL_ID_CLIENT_SECRET` | ☑ registered, user flow created |
| 4 | SWITCH Resource Registry | `switch` | `SWITCH_CLIENT_ID`, `SWITCH_CLIENT_SECRET` | ☐ |
| 5 | ORCID Developer Tools | `orcid` | `ORCID_CLIENT_ID`, `ORCID_CLIENT_SECRET` (`ORCID_ISSUER` for the sandbox) | ☐ |
| 6 | Google Cloud Console | `google` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | ☐ |
| 7 | GitHub organisation | `github` | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (GitHub secret: `OAUTH_GITHUB_CLIENT_SECRET`) | ☐ |
| 8 | Google Cloud Console (for External ID) | – | stored in `unibeeid`, not in the app | ☐ |
| – | AGOV | `agov` | `AGOV_ISSUER`, `AGOV_CLIENT_ID`, `AGOV_CLIENT_SECRET` | access open |
| – | Apple, Meta | – | – | deferred |

---

## 1. Entra ID – UniBE tenant (`unibe`)

> **Registered:** "UniBE - IDCI - Auth Example App (UniBE)" – client id `22c30b53-85f0-4da8-b68b-8c0c2340904a`

- [x] Entra admin center → App registrations → New registration, in the tenant `unibe.ch` (`d400387a-212f-43ea-ac7f-77aa12d7977e`)
- [x] Supported account types: **Accounts in this organizational directory only** (single tenant)
- [ ] Platform **Web** (not SPA), redirect URIs:
  - [ ] `https://login-example.campus.cloud/auth/unibe/callback`
  - [ ] `http://localhost:4321/auth/unibe/callback`
- [ ] API permissions: `openid`, `profile`, `email` (Microsoft Graph, delegated) – the default, no admin consent needed
- [ ] Create a client secret, note its expiry date
- [ ] Optional: Token configuration → optional claim `email`; group or role claims depending on [open question 5](05-open-questions.md)

## 2. Microsoft – personal accounts + all tenants (`microsoft`)

> **Registered:** "UniBE - IDCI - Auth Example App (All Tenants)" – client id `b048dae9-05c7-4e86-a5c2-ac955c3c26bf`

- [x] New registration in the UniBE tenant (an app of its own, not the same as no. 1)
- [x] Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
- [ ] Platform **Web**, redirect URIs:
  - [ ] `https://login-example.campus.cloud/auth/microsoft/callback`
  - [ ] `http://localhost:4321/auth/microsoft/callback`
- [ ] API permissions: `openid`, `profile`, `email`
- [ ] Create a client secret, note its expiry date
- [ ] Branding: name, logo, links to the terms of use and the privacy statement (shown in the consent dialog of foreign tenants)
- [ ] Recommended: **publisher verification** with UniBE's Partner Center id – otherwise the consent dialog says "unverified"

## 3. Entra External ID (`external-id`)

> **Registered:** "UniBE - IDCI - Auth Example App (eID)" – client id `20bf5a5b-79a0-40e2-abcb-828224942804`

- [x] In the external tenant `unibeeid.onmicrosoft.com` (`a791c572-76d6-4480-83df-b81dcdb92f69`) → App registrations → New registration
- [x] Supported account types: **Accounts in this organizational directory only**
- [ ] Platform **Web**, redirect URIs:
  - [ ] `https://login-example.campus.cloud/auth/external-id/callback`
  - [ ] `http://localhost:4321/auth/external-id/callback`
- [ ] API permissions: `openid`, `profile`, `email`; grant admin consent
- [ ] Create a client secret, note its expiry date
- [x] **Prerequisite:** the external tenant is linked to an Azure subscription (Home → Billing). No credit card needed when an existing UniBE subscription is linked. The first 50,000 monthly active users are free, add-ons (e.g. SMS MFA) are not.
- [x] Create the "Sign up and sign in" user flow – in the **Entra admin center** under Entra ID → External Identities → User flows, *not* in the Azure portal: there the external tenant shows no subscription, because it lives in the UniBE tenant – and **assign the app to the user flow**
- [ ] Choose the sign-in methods in the user flow (email one-time passcode, Google, passkeys if available – see [open question 2](05-open-questions.md))
- [ ] Optional: company branding for the sign-in page

## 4. SWITCH edu-ID / SWITCHaai (`switch`)

- [ ] Create a resource in the SWITCH Resource Registry or extend the existing OIDC connection ([open question 3](05-open-questions.md))
- [ ] Redirect URIs:
  - [ ] `https://login-example.campus.cloud/auth/switch/callback`
  - [ ] `https://localhost:4321/auth/switch/callback` (SWITCH accepts HTTPS only – run the dev server with HTTPS)
- [ ] Keys and Secrets: credential type **Shared client secret**, token endpoint method **Client Secret Post** (the app sends the secret in the POST body, `openid-client`'s default)
- [ ] Request attribute releases (e.g. name, email, `swissEduPersonUniqueID`, affiliation)
- [ ] Take over client id and secret

## 5. ORCID (`orcid`)

- [ ] For tests: a sandbox account at `sandbox.orcid.org` → Developer Tools → Public API credentials; `ORCID_ISSUER=https://sandbox.orcid.org`
- [ ] Production: public API credentials at `orcid.org` (needs the ORCID iD of the person responsible)
- [ ] Redirect URI: `https://login-example.campus.cloud/auth/orcid/callback` (ORCID requires HTTPS – whether the sandbox accepts `localhost` is still to be checked)
- [ ] Take over client id and secret

## 6. Google – direct (`google`)

- [ ] Google Cloud Console → create a project (e.g. "UniBE Login Example")
- [ ] OAuth consent screen: type **External**, app name, support email, authorised domain `campus.cloud`, links to the privacy statement and terms of use
- [ ] Scopes: `openid`, `email`, `profile` (not sensitive, no Google verification needed)
- [ ] Credentials → OAuth client id, type **Web application**, authorised redirect URIs:
  - [ ] `https://login-example.campus.cloud/auth/google/callback`
  - [ ] `http://localhost:4321/auth/google/callback`
- [ ] Publish the app ("In production"), otherwise only listed test users can sign in

## 7. GitHub (`github`)

- [ ] GitHub organisation → Settings → Developer settings → **OAuth Apps** → New OAuth App ([open question 4](05-open-questions.md))
- [ ] Homepage URL: `https://login-example.campus.cloud`
- [ ] Authorization callback URL: `https://login-example.campus.cloud/auth/github/callback`
- [ ] An OAuth App allows only **one** callback URL → a second OAuth App for development with `http://localhost:4321/auth/github/callback`
- [ ] Create a client secret; as a GitHub Actions secret it is called `OAUTH_GITHUB_CLIENT_SECRET` (GitHub refuses names starting with `GITHUB_`)

## 8. Google for External ID (broker path)

A **second** OAuth client, separate from no. 6 – it belongs to `unibeeid`, not to our app. Source: Microsoft Learn, [Add Google as an identity provider](https://learn.microsoft.com/entra/external-id/customers/how-to-google-federation-customers).

- [ ] In the same or a separate Google Cloud project; add the authorised domains `ciamlogin.com` and `microsoftonline.com`
- [ ] OAuth client id, type **Web application**, authorised redirect URIs:
  - [ ] `https://login.microsoftonline.com`
  - [ ] `https://login.microsoftonline.com/te/a791c572-76d6-4480-83df-b81dcdb92f69/oauth2/authresp`
  - [ ] `https://login.microsoftonline.com/te/unibeeid.onmicrosoft.com/oauth2/authresp`
  - [ ] `https://a791c572-76d6-4480-83df-b81dcdb92f69.ciamlogin.com/a791c572-76d6-4480-83df-b81dcdb92f69/federation/oidc/accounts.google.com`
  - [ ] `https://a791c572-76d6-4480-83df-b81dcdb92f69.ciamlogin.com/unibeeid.onmicrosoft.com/federation/oidc/accounts.google.com`
  - [ ] `https://unibeeid.ciamlogin.com/a791c572-76d6-4480-83df-b81dcdb92f69/federation/oauth2`
  - [ ] `https://unibeeid.ciamlogin.com/unibeeid.onmicrosoft.com/federation/oauth2`
- [ ] In `unibeeid`: External Identities → All identity providers → Google → Configure, enter client id and secret
- [ ] Add Google to the user flow of no. 3

---

## After every registration

- [ ] Put client id and secret into `.env` (locally) and the secret into the GitHub secrets, then run `secrets.yml` (production)
- [ ] Add the provider to `identityProviders` in `infra/main.bicepparam`
- [ ] Record the secret's expiry date in the operations calendar (Entra: at most 24 months)
- [ ] Test sign-in and "link account" on the site
- [ ] Update the status in the overview above and in [03](03-identity-providers.md)
