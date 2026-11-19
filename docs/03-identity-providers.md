# 03 – Identity Provider

## Übersicht

| # | Provider | Zielgruppe | Protokoll | Weg | Identitätsschlüssel | Status |
|---|---|---|---|---|---|---|
| 1 | Entra ID – UniBE-Tenant | Mitarbeitende, Studierende | OIDC | direkt | `tid` + `oid` | umgesetzt (Registrierung ausstehend) |
| 2 | Microsoft (`common`) | persönliche MS-Konten + alle Entra-Tenants | OIDC | direkt | `tid` + `oid` | umgesetzt (Registrierung ausstehend) |
| 3 | Entra External ID (`unibeeid`) | externe Personen (Social, E-Mail-OTP, Passkey) | OIDC | Broker | `iss` + `oid` | umgesetzt (Registrierung ausstehend) |
| 4 | SWITCH edu-ID / SWITCHaai | Hochschulangehörige CH & international | OIDC | direkt | `iss` + `sub` | umgesetzt (Registrierung ausstehend) |
| 5 | ORCID | Forschende | OIDC | direkt | `sub` (= ORCID iD) | umgesetzt (Registrierung ausstehend) |
| 6 | AGOV | Bürger:innen, staatlich geprüfte Identität | OIDC | direkt | `iss` + `sub` | **Zugang offen** |
| 7 | Google | Öffentlichkeit | OIDC | direkt + Broker | `iss` + `sub` | umgesetzt (Registrierung ausstehend) |
| 8 | Apple | Öffentlichkeit | OIDC | direkt + Broker | `iss` + `sub` | **zurückgestellt** (kein Apple-Developer-Account) |
| 9 | GitHub | Entwickler:innen | **OAuth 2.0** | direkt | numerische `id` | umgesetzt (Registrierung ausstehend) |
| 10 | Meta (Facebook) | Öffentlichkeit | **OAuth 2.0** (direkt) / OIDC via Broker | direkt + Broker | App-scoped `id` | **zurückgestellt** (kein Meta-Business-Account) |
| 11 | Passkey (app-eigen) | alle eingeloggten Benutzer:innen | WebAuthn | app-eigen | Credential-ID | geplant |

> **Hinweis Identitätsschlüssel:** Gespeichert wird immer das Paar (Issuer, Subject). Für Entra wird als Subject `oid` verwendet und als Issuer die tenant-spezifische Issuer-URL. Damit führen Anmeldungen über den UniBE-Button und den Microsoft-Button mit demselben UniBE-Konto zur selben Identität. Das Entra-`sub` ist dagegen pro App paarweise und eignet sich weniger als app-übergreifender Schlüssel.

---

## 1. Entra ID – UniBE-Tenant

- **Tenant:** `unibe.ch` – `d400387a-212f-43ea-ac7f-77aa12d7977e`
- **Endpunkt:** `https://login.microsoftonline.com/d400387a-212f-43ea-ac7f-77aa12d7977e/v2.0`
- **Registrierung:** App Registration im UniBE-Tenant (Single-Tenant).
- **Scopes:** `openid profile email` (ggf. `offline_access` nicht nötig).
- **Interessante Claims:** `oid`, `tid`, `preferred_username`, `name`, `amr`, optional Gruppen/Rollen (z. B. Mitarbeitende vs. Studierende – siehe offene Fragen).
- **Passkeys:** Wenn im Tenant aktiviert, sichtbar über `amr`.

## 2. Microsoft (persönlich + alle Tenants)

- **Endpunkt:** `https://login.microsoftonline.com/common/v2.0`
- **Registrierung:** App Registration mit «Accounts in any organizational directory and personal Microsoft accounts».
- **Issuer-Validierung:** dynamisch mit `{tid}` aus dem Token (siehe [ADR-006](02-decisions.md)).
- **Besonderheiten:** Persönliche Konten: `tid = 9188040d-6c67-4c5b-b112-36a304b66dad`. Bei fremden Tenants kann eine Admin-Zustimmung nötig sein, falls dort User Consent eingeschränkt ist – für `openid profile email` in der Regel unkritisch.
- **Hinweis:** E-Mail aus fremden Tenants ist nicht verifiziert und dient nur der Anzeige.

## 3. Entra External ID (Broker)

- **Directory:** `unibeeid.onmicrosoft.com` – `a791c572-76d6-4480-83df-b81dcdb92f69` (External Tenant, Region EU). App-Registrierungen dürfen angelegt werden.
- **Endpunkt (Discovery):** `https://a791c572-76d6-4480-83df-b81dcdb92f69.ciamlogin.com/a791c572-76d6-4480-83df-b81dcdb92f69/v2.0`
- **Wichtig:** Discovery über `unibeeid.ciamlogin.com` liefert als Issuer die Tenant-ID-Variante (`{tid}.ciamlogin.com`). Damit die Issuer-Prüfung gelingt, muss die App direkt die Tenant-ID-URL verwenden.
- **Identitätsschlüssel:** `oid` (Objekt-ID des Benutzers im External Tenant).
- **Föderierte Provider im Broker:** Google, Apple, Facebook, E-Mail-OTP, Passkeys (Verfügbarkeit prüfen), optional weitere OIDC-Provider.
- **Besonderheiten:** Die App sieht nur External ID als Issuer; der ursprüngliche Provider ist über das `idp`-Claim (falls konfiguriert) ersichtlich und wird im Profil angezeigt.

## 4. SWITCH edu-ID / SWITCHaai

- **Protokoll:** OIDC (bestehende Anbindung über SWITCH).
- **Registrierung:** über die SWITCH-Ressource-Registry.
- **Interessante Claims/Attribute:** `swissEduPersonUniqueID`, Affiliations, Home-Organisation – Freigabe pro Attribut über die Registry.
- **Hinweis:** Deckt gemäss [ADR-007](02-decisions.md) auch den internationalen Bedarf ab. Genaue Issuer-URL und Attributfreigaben aus der bestehenden Anbindung übernehmen.

## 5. ORCID

- **Issuer:** `https://orcid.org` (Sandbox: `https://sandbox.orcid.org`)
- **Registrierung:** Public-API-Credentials genügen für die Anmeldung (Member-API nur bei Bedarf).
- **Scopes:** `openid` (optional `/authenticate`).
- **Besonderheiten:** `sub` ist die ORCID iD (z. B. `0000-0002-1825-0097`); Name nur, wenn öffentlich freigegeben; **keine E-Mail** im ID-Token.

## 6. AGOV

- **Protokoll:** OIDC.
- **Status:** Zugang und Onboarding beim Bund sind noch zu klären.
- **Besonderheiten:** Vertrauensstufen (Levels of Assurance) über `acr` anfordern bzw. auswerten – sehr gutes Demo-Beispiel für Step-up. Welche Attribute und LoA uns zur Verfügung stehen, ist offen.

## 7. Google

- **Issuer:** `https://accounts.google.com`
- **Scopes:** `openid email profile`
- **Besonderheiten:** `email_verified` vorhanden; `hd`-Claim bei Google-Workspace-Konten.

## 8. Apple

- **Issuer:** `https://appleid.apple.com`
- **Registrierung:** Apple Developer Account nötig (kostenpflichtig, ca. USD 99/Jahr); Services ID, Key (`.p8`), verifizierte Domain.
- **Besonderheiten:**
  - `client_secret` ist ein **selbst signiertes JWT (ES256)** mit max. 6 Monaten Gültigkeit – wird zur Laufzeit aus dem Key in Key Vault erzeugt.
  - Bei Scopes `name email` ist `response_mode=form_post` Pflicht → Callback muss POST annehmen (CSRF-/SameSite-Thema: Transaktions-Cookie mit `SameSite=None; Secure`).
  - Name wird **nur bei der ersten Anmeldung** mitgeliefert.
  - E-Mail ggf. als Relay-Adresse (`…@privaterelay.appleid.com`).

## 9. GitHub (OAuth 2.0)

- **Endpunkte:** `https://github.com/login/oauth/authorize`, `https://github.com/login/oauth/access_token`, API `https://api.github.com/user`, `/user/emails`
- **Registrierung:** OAuth App (oder GitHub App) in der UniBE-Organisation.
- **Scopes:** `read:user user:email`
- **Besonderheiten:** Kein ID-Token, keine Discovery. Schlüssel ist die numerische `id` (nicht `login`, da änderbar).

## 10. Meta / Facebook

- **Direkt (OAuth 2.0):** Facebook Login, danach Graph API `/me?fields=id,name,email`.
- **Via Broker:** Facebook als eingebauter Provider in External ID.
- **Registrierung:** Meta-App mit App-Review für E-Mail-Berechtigung ggf. nötig; Business-Verifizierung prüfen.
- **Besonderheiten:** `id` ist app-scoped. E-Mail nicht garantiert.

## 11. Passkey (app-eigen)

Siehe [04 – Passkeys](04-account-linking.md#passkeys).
