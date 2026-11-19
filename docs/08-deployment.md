# 08 – Deployment (Azure, Bicep)

Infrastruktur als Code in [`infra/main.bicep`](../infra/main.bicep), Parameter in [`infra/main.bicepparam`](../infra/main.bicepparam). Architektur und Kosten: [06](06-hosting-and-data.md).

## Ressourcen

| Ressource | Name | Zweck |
|---|---|---|
| Log Analytics | `log-authex` | Logs der Container-Apps-Umgebung, 30 Tage, Tageslimit 0.2 GB |
| Container-Apps-Umgebung | `cae-authex` | Consumption-Profil |
| Container App | `ca-authex` | Die Anwendung, 0.25 vCPU / 0.5 GiB, immer eine Instanz |
| Container-Apps-Job | `caj-authex-migrate` | Datenbank-Migration, manuell ausgelöst |
| Managed Identity | `id-authex-app` | App: Key-Vault-Secrets lesen, Daten lesen/schreiben |
| Managed Identity | `id-authex-migrate` | Migration: Schema ändern |
| Key Vault | `kv-authex-…` | Client Secrets der Anbieter (RBAC) |
| SQL Server | `sql-authex-…` | Nur Entra-Anmeldung, Administrator = Entra-Gruppe |
| SQL-Datenbank | `sqldb-authex` | Basic, 2 GB |

Die Suffixe `…` werden aus der Ressourcengruppe abgeleitet und sind stabil.

## Voraussetzungen

- Azure CLI mit Bicep: `az bicep install` bzw. `az bicep upgrade`
- Subscription unter dem EA und eine Ressourcengruppe in Switzerland North, z. B. `rg-authex`
- Rolle **Owner** (oder Contributor + User Access Administrator) auf der Ressourcengruppe – für die Rollenzuweisungen am Key Vault
- Eine Entra-Gruppe als SQL-Administrator, Ihr Konto als Mitglied
- Container-Image in einer Registry (z. B. GHCR)

## Ablauf

### 0. Prüfen

```bash
az bicep build --file infra/main.bicep
```

```bash
az deployment group what-if --resource-group rg-authex --parameters infra/main.bicepparam
```

### 1. Basis bereitstellen (`deployApp = false`)

Platzhalter in `infra/main.bicepparam` ausfüllen (SQL-Administratorgruppe, Secrets-Officer), dann:

```bash
az deployment group create --resource-group rg-authex --parameters infra/main.bicepparam
```

Die Ausgaben (`keyVaultName`, `sqlServerFqdn`, `appDefaultHostname`, `customDomainVerificationId` …) notieren.

### 2. Secrets setzen

Pro Eintrag in `identityProviders` das Client Secret im Key Vault ablegen:

```bash
az keyvault secret set --vault-name <keyVaultName> --name entra-unibe-client-secret --value '<secret>'
```

Ebenso `microsoft-client-secret` und `external-id-client-secret`. Secrets nie in die Parameterdatei schreiben.

### 3. Datenbankbenutzer anlegen

Als Mitglied der SQL-Administratorgruppe mit der Datenbank verbinden (z. B. Azure Data Studio, VS Code mssql oder Query-Editor im Portal) und [`infra/sql/grant-identities.sql`](../infra/sql/grant-identities.sql) ausführen.

### 4. App und Migrations-Job bereitstellen (`deployApp = true`)

`deployApp = true` setzen und `containerImage` auf das gewünschte Image (am besten mit fester Version statt `latest`), dann:

```bash
az deployment group create --resource-group rg-authex --parameters infra/main.bicepparam
```

Bei einem privaten Image zusätzlich `--parameters registryPassword=<token>` übergeben.

### 5. Datenbank migrieren

```bash
az containerapp job start --resource-group rg-authex --name caj-authex-migrate
```

Ergebnis im Portal unter dem Job → Execution history bzw. in Log Analytics prüfen. Danach die App unter `https://<appDefaultHostname>` aufrufen.

### 6. Eigene Domain `login-example.campus.cloud`

1. DNS-Einträge in der Zone `campus.cloud` anlegen:
   - `CNAME login-example` → `<appDefaultHostname>`
   - `TXT asuid.login-example` → `<customDomainVerificationId>`
2. `customDomainMode = 'validate'` setzen und deployen. Damit wird der Hostname ohne Zertifikat angehängt und ein verwaltetes Zertifikat ausgestellt (kann einige Minuten dauern).
3. `customDomainMode = 'bind'` setzen und deployen. Der Hostname wird mit dem Zertifikat gebunden, `APP_BASE_URL` zeigt dann auf `https://login-example.campus.cloud`.

Die Redirect-URIs der App-Registrierungen ([07](07-app-registrations.md)) müssen zur aktiven Basis-URL passen. Vor Schritt 6 also vorübergehend auch `https://<appDefaultHostname>/auth/{provider}/callback` eintragen oder erst nach Schritt 6 testen.

## Updates

- **Neue App-Version:** `containerImage` anpassen und deployen (oder `az containerapp update --image …`). Bei Schemaänderungen zuerst den Migrations-Job mit dem neuen Image starten.
- **Neuer Anbieter:** Secret im Key Vault setzen, Eintrag in `identityProviders` ergänzen, deployen.
- **Secret rotiert:** Neue Version im Key Vault setzen; die App übernimmt sie mit der nächsten Revision (z. B. `az containerapp revision restart`).

## Bewusste Entscheide

- **SQL-Firewall «Azure-Dienste zulassen»:** Container Apps im Consumption-Profil haben keine festen ausgehenden IP-Adressen. Die Anmeldung ist nur mit Entra möglich (keine SQL-Logins), das Risiko daher gering. Strengere Alternative: VNet-Integration mit Private Endpoint (Mehrkosten).
- **Zwei Identitäten:** Die App hat keine DDL-Rechte; Schemaänderungen nur über den Migrations-Job.
- **Zwei Phasen:** Die Container App verweist beim Erstellen auf Key-Vault-Secrets, die es dann bereits geben muss.
