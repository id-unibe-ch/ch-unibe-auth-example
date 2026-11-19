# 02 – Architekturentscheide

Status: **angenommen** = entschieden · **vorgeschlagen** = Vorschlag, noch zu bestätigen

---

## ADR-001: Astro (SSR) als Framework

- **Status:** angenommen
- **Kontext:** Astro ist in mehreren UniBE-Projekten im Einsatz; Know-how vorhanden.
- **Entscheid:** Astro im Server-Modus (`output: 'server'`) mit `@astrojs/node` (standalone). SSR ist nötig für OAuth-Callbacks, Sessions und Datenbankzugriff.
- **Konsequenz:** Die App läuft als Node-Prozess (Container), nicht als rein statische Seite.

## ADR-002: Tailwind CSS für das Design

- **Status:** angenommen
- **Entscheid:** Tailwind CSS v4 über `@tailwindcss/vite`. Login-Buttons der Drittanbieter halten sich an deren Branding-Richtlinien (Google, Apple, Microsoft, GitHub, Meta, ORCID, SWITCH, AGOV).

## ADR-003: Beide Anbindungswege (direkt und Broker) zeigen

- **Status:** angenommen
- **Kontext:** Zwei gängige Muster: jede IdP-Anbindung in der App selbst, oder Delegation an einen Broker (Entra External ID).
- **Entscheid:** Die Beispielseite zeigt beide Wege nebeneinander. Die Login-Seite gruppiert die Buttons entsprechend.
- **Konsequenzen:**
  - Derselbe Google-Account über *direkt* und über *External ID* ergibt **zwei verschiedene Identitäten** (unterschiedlicher Issuer und Subject). Das ist gewollt und wird auf der Seite erklärt – es veranschaulicht gerade den Unterschied der beiden Wege.
  - Der Broker-Weg kapselt Nicht-OIDC-Provider (Facebook) hinter einer sauberen OIDC-Schnittstelle.

## ADR-004: OAuth 2.0 für GitHub und Meta explizit kennzeichnen

- **Status:** angenommen
- **Kontext:** GitHub liefert kein ID-Token (reines OAuth 2.0). Facebook Login im Web ist ebenfalls OAuth 2.0 (OIDC nur eingeschränkt, «Limited Login» auf iOS).
- **Entscheid:** GitHub und Meta werden direkt als OAuth-2.0-Provider angebunden: Authorization Code + PKCE, danach Benutzerdaten über die jeweilige API (GitHub `/user` und `/user/emails`, Meta Graph API `/me`). In der UI und der Doku sind diese Provider als «OAuth 2.0» gekennzeichnet.
- **Konsequenz:** Für diese Provider gibt es keine kryptografisch signierte Identitätsaussage; der Identitätsschlüssel ist die numerische Benutzer-ID der API.

## ADR-005: Kein automatisches Zusammenführen von Accounts

- **Status:** angenommen
- **Kontext:** Ursprünglich war ein automatischer Merge über eindeutige Attribute vorgesehen. E-Mail-Adressen sind dafür ungeeignet: Bei fremden Entra-Tenants ist das `email`-Claim vom Tenant frei setzbar und unverifiziert («nOAuth»), bei anderen Providern ist `email_verified` nicht immer vorhanden, Apple liefert ggf. Relay-Adressen.
- **Entscheid:** Accounts werden **nur manuell** verknüpft: Der/die eingeloggte Benutzer:in startet «Account verbinden» und weist den Besitz durch eine Anmeldung beim zweiten Provider nach. Identitäten werden ausschliesslich über (Issuer, Subject) identifiziert.
- **Konsequenz:** Wer sich mit einem neuen Provider anmeldet statt ihn zu verbinden, erhält ein neues Benutzerkonto. Die Login-Seite weist darauf hin. Umgang mit solchen Duplikaten: siehe [offene Fragen](05-open-questions.md).

## ADR-006: Microsoft-Button = persönliche Konten + alle Tenants

- **Status:** angenommen
- **Entscheid:** Der «Mit Microsoft anmelden»-Button verwendet den `common`-Endpunkt (persönliche Microsoft-Konten und Geschäfts-/Schulkonten aller Tenants, wie auf vielen Seiten üblich). Es wird **jeder Tenant** zugelassen. Zusätzlich gibt es einen eigenen UniBE-Button, der fest auf den UniBE-Tenant zeigt.
- **Konsequenzen:**
  - Issuer-Validierung muss die Tenant-ID aus dem Token einsetzen (`https://login.microsoftonline.com/{tid}/v2.0`); eine statische Issuer-Prüfung funktioniert mit `common` nicht.
  - Persönliche Konten erkennt man an `tid = 9188040d-6c67-4c5b-b112-36a304b66dad`.
  - Ein UniBE-Konto, das sich über den Microsoft-Button anmeldet, erzeugt denselben Identitätsschlüssel wie über den UniBE-Button und landet daher beim selben Benutzer (siehe [03](03-identity-providers.md)).

## ADR-007: Kein separates eduGAIN – SWITCHaai deckt es ab

- **Status:** angenommen
- **Entscheid:** Keine separate eduGAIN-Anbindung (SAML). Die OIDC-Anbindung über SWITCH (edu-ID / SWITCHaai) deckt den Bedarf ab.

## ADR-008: ORCID und Apple zusätzlich aufnehmen

- **Status:** angenommen
- **Kontext:** ORCID ist die Standard-ID für Forschende; Apple ist neben Google und Meta der wichtigste Consumer-IdP (und für iOS-Apps faktisch Pflicht, sobald andere Social Logins angeboten werden).
- **Entscheid:** Beide werden direkt via OIDC angebunden; Apple zusätzlich über External ID (Broker-Weg).

## ADR-009: Passkeys umsetzen – app-eigen und über IdPs

- **Status:** angenommen (Ausgestaltung siehe [04](04-account-linking.md#passkeys))
- **Entscheid:** Passkeys werden auf zwei Ebenen gezeigt:
  1. **App-eigen (WebAuthn, SimpleWebAuthn):** Benutzer:innen können im Profil Passkeys registrieren und sich danach direkt mit Passkey anmelden.
  2. **IdP-seitig:** Passkey-Anmeldung bei Entra (UniBE-Tenant), External ID u. a. Die App sieht davon nur die Claims `amr`/`acr` und zeigt diese an.

## ADR-010: openid-client als einzige Auth-Bibliothek

- **Status:** vorgeschlagen
- **Kontext:** Alternativen: Auth.js (`auth-astro`) oder Arctic. Auth.js bringt eigenes Account-Linking-Verhalten mit, das wir explizit steuern wollen; Arctic ist schlank, deckt aber keine generische OIDC-Discovery/Validierung ab.
- **Entscheid:** `openid-client` (v6) für alle Provider – OIDC via Discovery, GitHub/Meta mit manuell konfigurierten Endpunkten. Linking-Logik und Datenmodell bleiben vollständig in unserem Code und damit als Beispiel nachvollziehbar.

## ADR-011: Hosting auf Azure Container Apps, Daten in Azure SQL (Free Offer)

- **Status:** vorgeschlagen – Details und Alternativen in [06](06-hosting-and-data.md)
- **Entscheid:** Container Apps (Consumption, Scale-to-Zero) in Switzerland North; Azure SQL Database serverless im kostenlosen Angebot; Secrets in Key Vault.
