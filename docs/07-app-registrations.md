# 07 – Checkliste App-Registrierungen

Pro Anbieter eine Registrierung. Die Redirect-URI hat immer die Form:

```
{Basis-URL}/auth/{provider}/callback
```

- **Produktiv:** `https://login-example.campus.cloud`
- **Entwicklung:** `http://localhost:4321`

Client-ID und Secret kommen in die Umgebungsvariablen (lokal `.env`, produktiv Key Vault), siehe `.env.example`.

## Übersicht

| # | Wo | `{provider}` | Umgebungsvariablen | Status |
|---|---|---|---|---|
| 1 | UniBE-Tenant (unibe365) | `unibe` | `ENTRA_UNIBE_CLIENT_ID`, `ENTRA_UNIBE_CLIENT_SECRET` | ☑ registriert |
| 2 | UniBE-Tenant (unibe365) | `microsoft` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | ☑ registriert |
| 3 | External ID `unibeeid` | `external-id` | `EXTERNAL_ID_CLIENT_ID`, `EXTERNAL_ID_CLIENT_SECRET` | ☑ registriert, User Flow offen |
| 4 | SWITCH Resource Registry | `switch` | `SWITCH_CLIENT_ID`, `SWITCH_CLIENT_SECRET` | ☐ |
| 5 | ORCID Developer Tools | `orcid` | `ORCID_CLIENT_ID`, `ORCID_CLIENT_SECRET` (`ORCID_ISSUER` für die Sandbox) | ☐ |
| 6 | Google Cloud Console | `google` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | ☐ |
| 7 | GitHub-Organisation | `github` | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | ☐ |
| 8 | Google Cloud Console (für External ID) | – | wird in `unibeeid` hinterlegt, nicht in der App | ☐ |
| – | AGOV | `agov` | `AGOV_ISSUER`, `AGOV_CLIENT_ID`, `AGOV_CLIENT_SECRET` | Zugang offen |
| – | Apple, Meta | – | – | zurückgestellt |

---

## 1. Entra ID – UniBE-Tenant (`unibe`)

> **Registriert:** «UniBE - IDCI - Auth Example App (UniBE)» – Client-ID `22c30b53-85f0-4da8-b68b-8c0c2340904a`

- [ ] Entra Admin Center → App registrations → New registration, im Tenant `unibe.ch` (`d400387a-212f-43ea-ac7f-77aa12d7977e`)
- [ ] Unterstützte Kontotypen: **Nur Konten in diesem Organisationsverzeichnis** (Single-Tenant)
- [ ] Plattform **Web** (nicht SPA), Redirect-URIs:
  - [ ] `https://login-example.campus.cloud/auth/unibe/callback`
  - [ ] `http://localhost:4321/auth/unibe/callback`
- [ ] API-Berechtigungen: `openid`, `profile`, `email` (Microsoft Graph, delegiert) – Standard, keine Admin-Zustimmung nötig
- [ ] Client Secret erstellen, Ablaufdatum notieren
- [ ] Optional: Token-Konfiguration → optionaler Claim `email`; Gruppen-/Rollen-Claims je nach [offener Frage 5](05-open-questions.md)

## 2. Microsoft – persönliche Konten + alle Tenants (`microsoft`)

> **Registriert:** «UniBE - IDCI - Auth Example App (All Tenants)» – Client-ID `b048dae9-05c7-4e86-a5c2-ac955c3c26bf`

- [ ] Neue Registrierung im UniBE-Tenant (eigene App, nicht dieselbe wie Nr. 1)
- [ ] Unterstützte Kontotypen: **Konten in einem beliebigen Organisationsverzeichnis und persönliche Microsoft-Konten**
- [ ] Plattform **Web**, Redirect-URIs:
  - [ ] `https://login-example.campus.cloud/auth/microsoft/callback`
  - [ ] `http://localhost:4321/auth/microsoft/callback`
- [ ] API-Berechtigungen: `openid`, `profile`, `email`
- [ ] Client Secret erstellen, Ablaufdatum notieren
- [ ] Branding: Name, Logo, Links zu Nutzungsbedingungen und Datenschutz (erscheint im Zustimmungsdialog fremder Tenants)
- [ ] Empfohlen: **Herausgeberüberprüfung** (Publisher Verification) mit der Partner-Center-ID der UniBE – sonst steht «nicht verifiziert» im Zustimmungsdialog

## 3. Entra External ID (`external-id`)

> **Registriert:** «UniBE - IDCI - Auth Example App (eID)» – Client-ID `20bf5a5b-79a0-40e2-abcb-828224942804`

- [ ] Im External Tenant `unibeeid.onmicrosoft.com` (`a791c572-76d6-4480-83df-b81dcdb92f69`) → App registrations → New registration
- [ ] Unterstützte Kontotypen: **Nur Konten in diesem Organisationsverzeichnis**
- [ ] Plattform **Web**, Redirect-URIs:
  - [ ] `https://login-example.campus.cloud/auth/external-id/callback`
  - [ ] `http://localhost:4321/auth/external-id/callback`
- [ ] API-Berechtigungen: `openid`, `profile`, `email`; Admin-Zustimmung erteilen
- [ ] Client Secret erstellen, Ablaufdatum notieren
- [ ] **Voraussetzung:** External Tenant mit einer Azure-Subscription verknüpft (Home → Billing). Keine Kreditkarte nötig, wenn eine bestehende UniBE-Subscription verknüpft wird. Die ersten 50 000 monatlich aktiven Benutzer:innen sind kostenlos, Add-ons (z. B. SMS-MFA) nicht.
- [ ] User Flow «Registrieren und anmelden» anlegen bzw. bestehenden wählen und **die App dem User Flow zuweisen**
- [ ] Anmeldemethoden im User Flow festlegen (E-Mail-Einmalcode, Google, ggf. Passkeys – siehe [offene Frage 2](05-open-questions.md))
- [ ] Optional: Company Branding für die Anmeldeseite

## 4. SWITCH edu-ID / SWITCHaai (`switch`)

- [ ] Ressource in der SWITCH Resource Registry anlegen oder bestehende OIDC-Anbindung erweitern ([offene Frage 3](05-open-questions.md))
- [ ] Redirect-URIs:
  - [ ] `https://login-example.campus.cloud/auth/switch/callback`
  - [ ] `http://localhost:4321/auth/switch/callback` (falls von SWITCH zugelassen; sonst separate Test-Ressource)
- [ ] Attributfreigaben beantragen (z. B. Name, E-Mail, `swissEduPersonUniqueID`, Affiliation)
- [ ] Client-ID und Secret übernehmen

## 5. ORCID (`orcid`)

- [ ] Für Tests: Sandbox-Konto auf `sandbox.orcid.org` → Developer Tools → Public API Credentials; `ORCID_ISSUER=https://sandbox.orcid.org`
- [ ] Produktiv: Public API Credentials auf `orcid.org` (ORCID iD der verantwortlichen Person nötig)
- [ ] Redirect-URI: `https://login-example.campus.cloud/auth/orcid/callback` (ORCID verlangt HTTPS – ob die Sandbox `localhost` akzeptiert, ist noch zu prüfen)
- [ ] Client-ID und Secret übernehmen

## 6. Google – direkt (`google`)

- [ ] Google Cloud Console → Projekt anlegen (z. B. «UniBE Login-Beispiel»)
- [ ] OAuth-Zustimmungsbildschirm: Typ **Extern**, App-Name, Support-E-Mail, autorisierte Domain `campus.cloud`, Links zu Datenschutz/Nutzungsbedingungen
- [ ] Scopes: `openid`, `email`, `profile` (nicht sensibel, keine Google-Verifizierung nötig)
- [ ] Anmeldedaten → OAuth-Client-ID, Typ **Webanwendung**, autorisierte Weiterleitungs-URIs:
  - [ ] `https://login-example.campus.cloud/auth/google/callback`
  - [ ] `http://localhost:4321/auth/google/callback`
- [ ] App veröffentlichen («In Produktion»), sonst können sich nur eingetragene Testbenutzer anmelden

## 7. GitHub (`github`)

- [ ] GitHub-Organisation → Settings → Developer settings → **OAuth Apps** → New OAuth App ([offene Frage 4](05-open-questions.md))
- [ ] Homepage-URL: `https://login-example.campus.cloud`
- [ ] Authorization callback URL: `https://login-example.campus.cloud/auth/github/callback`
- [ ] Eine OAuth App erlaubt nur **eine** Callback-URL → zweite OAuth App für die Entwicklung mit `http://localhost:4321/auth/github/callback`
- [ ] Client Secret erstellen

## 8. Google für External ID (Broker-Weg)

Ein **zweiter** OAuth-Client, getrennt von Nr. 6 – er gehört zu `unibeeid`, nicht zu unserer App. Quelle: Microsoft Learn, [Add Google as an identity provider](https://learn.microsoft.com/entra/external-id/customers/how-to-google-federation-customers).

- [ ] Im selben oder einem eigenen Google-Cloud-Projekt; autorisierte Domains `ciamlogin.com` und `microsoftonline.com` ergänzen
- [ ] OAuth-Client-ID, Typ **Webanwendung**, autorisierte Weiterleitungs-URIs:
  - [ ] `https://login.microsoftonline.com`
  - [ ] `https://login.microsoftonline.com/te/a791c572-76d6-4480-83df-b81dcdb92f69/oauth2/authresp`
  - [ ] `https://login.microsoftonline.com/te/unibeeid.onmicrosoft.com/oauth2/authresp`
  - [ ] `https://a791c572-76d6-4480-83df-b81dcdb92f69.ciamlogin.com/a791c572-76d6-4480-83df-b81dcdb92f69/federation/oidc/accounts.google.com`
  - [ ] `https://a791c572-76d6-4480-83df-b81dcdb92f69.ciamlogin.com/unibeeid.onmicrosoft.com/federation/oidc/accounts.google.com`
  - [ ] `https://unibeeid.ciamlogin.com/a791c572-76d6-4480-83df-b81dcdb92f69/federation/oauth2`
  - [ ] `https://unibeeid.ciamlogin.com/unibeeid.onmicrosoft.com/federation/oauth2`
- [ ] In `unibeeid`: External Identities → All identity providers → Google → Configure, Client-ID und Secret eintragen
- [ ] Google dem User Flow aus Nr. 3 hinzufügen

---

## Nach jeder Registrierung

- [ ] Client-ID und Secret in `.env` (lokal) bzw. Key Vault (produktiv) eintragen
- [ ] Ablaufdatum des Secrets im Betriebskalender erfassen (Entra: max. 24 Monate)
- [ ] Login und «Account verbinden» auf der Seite testen
- [ ] Status in der Übersicht oben und in [03](03-identity-providers.md) nachführen
