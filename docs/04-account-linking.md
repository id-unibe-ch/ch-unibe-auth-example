# 04 – Benutzerkonten und Account-Linking

## Grundsätze

- Ein **Benutzerkonto** (User) kann beliebig viele **Identitäten** (verbundene Accounts) und **Passkeys** haben.
- Eine Identität ist eindeutig über **(Issuer, Subject)** und gehört genau einem Benutzerkonto.
- Verknüpfen geschieht **nur manuell** und nur mit Besitznachweis (Anmeldung beim zu verbindenden Provider) – kein automatischer Merge ([ADR-005](02-decisions.md)).

## Datenmodell

```mermaid
erDiagram
    USER ||--o{ IDENTITY : hat
    USER ||--o{ PASSKEY : hat
    USER ||--o{ SESSION : "hat (über data.userId)"

    USER {
        uuid id PK
        string display_name
        datetime created_at
    }
    IDENTITY {
        uuid id PK
        uuid user_id FK
        string provider "z. B. entra-unibe, google, google-xid"
        string issuer
        string subject
        string email "nur Anzeige"
        bool email_verified
        json claims_snapshot "Auswahl für die Profilansicht"
        datetime linked_at
        datetime last_login_at
    }
    PASSKEY {
        uuid id PK
        uuid user_id FK
        bytes credential_id "unique"
        bytes public_key
        int sign_count
        string transports
        string name "vom Benutzer vergeben"
        datetime created_at
        datetime last_used_at
    }
    SESSION {
        string id PK
        string data "von Astro serialisiert: userId, lastAuthAt, authTx, flash"
        datetime updated_at
    }
```

Eindeutigkeit: `UNIQUE(issuer, subject)` auf IDENTITY, `UNIQUE(credential_id)` auf PASSKEY.

Umsetzung: `db/migrations/001_initial.sql` (USER, IDENTITY, SESSION); PASSKEY folgt mit den Passkeys. Identitäten werden beim Löschen eines Benutzers per `ON DELETE CASCADE` mitgelöscht.

**Sessions:** Die Session-Tabelle gehört Astro. Ihr Inhalt ist ein serialisierter Blob, den Ablauf einzelner Werte (TTL 8 Stunden) regelt Astro selbst. Zeilen, die länger als 24 Stunden nicht geschrieben wurden, löscht der Session-Treiber stündlich.

`claims_snapshot` speichert nur die für die Demo nötigen Claims (Datenminimierung, siehe offene Fragen).

## Abläufe

### Anmelden

1. Callback liefert validierte (Issuer, Subject).
2. Identität existiert → Benutzer einloggen, `last_login_at` aktualisieren.
3. Identität existiert nicht → **neues** Benutzerkonto plus Identität anlegen.

### Account verbinden

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as App
    participant I as IdP
    participant D as DB

    B->>A: Profil → «Account verbinden» (Provider wählen)
    A->>A: Session prüfen, Intent=link + user_id in Transaktions-Cookie
    A-->>B: Redirect zum IdP (prompt=login bzw. select_account)
    B->>I: Anmeldung
    I-->>B: Callback
    B->>A: Callback
    A->>D: Identität (issuer, subject) suchen
    alt nicht vorhanden
        A->>D: Identität dem eingeloggten Benutzer zuordnen
        A-->>B: Profil mit Erfolgsmeldung
    else gehört bereits diesem Benutzer
        A-->>B: Hinweis «bereits verbunden»
    else gehört anderem Benutzerkonto
        A-->>B: Konflikt – keine Übernahme (siehe offene Fragen)
    end
```

- Der Intent wird an `state` gebunden; die Session-User-ID im Callback muss mit der im Transaktions-Cookie übereinstimmen.
- `prompt=login` / `select_account`, damit nicht versehentlich der bereits aktive Account beim IdP übernommen wird.

### Account trennen

- Erlaubt, solange danach mindestens **eine Anmeldemöglichkeit** (Identität oder Passkey) übrig bleibt.
- Vorherige Re-Authentisierung, wenn die letzte Anmeldung länger als z. B. 10 Minuten zurückliegt (`last_auth_at`).

### Konto löschen

- Löscht Benutzer, Identitäten, Passkeys und Sessions. Für eine Demo-Seite sinnvoll (Datenschutz, Selbstbedienung).

## Passkeys

### App-eigene Passkeys (WebAuthn)

- **Registrierung:** nur für eingeloggte Benutzer:innen im Profil («Passkey hinzufügen»). Damit ist ein Passkey immer an ein bestehendes Konto gebunden.
- **Anmeldung:** Button «Mit Passkey anmelden» auf der Login-Seite, Discoverable Credentials (Resident Keys) und Conditional UI (Autofill), `userVerification: required`.
- **RP-ID:** `login-example.campus.cloud` – Passkeys sind an diese Domain gebunden; Testumgebungen (z. B. `localhost`) brauchen eigene Passkeys.
- **Bibliothek:** `@simplewebauthn/server` und `@simplewebauthn/browser`.
- **Verwaltung:** Passkeys im Profil auflisten, umbenennen, löschen.

### Passkeys bei den IdPs

- Entra (UniBE-Tenant), External ID, Google, Apple, Microsoft-Konten u. a. unterstützen Passkeys auf ihrer Seite.
- Die App erkennt das nur über `amr`/`acr` (soweit geliefert) und zeigt es in der Lernansicht an. So wird der Unterschied «Passkey bei der App» vs. «Passkey beim IdP» sichtbar.
