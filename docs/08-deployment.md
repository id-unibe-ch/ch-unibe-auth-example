# 08 – Deployment (Azure, Bicep, GitHub Actions)

Infrastruktur als Code in [`infra/main.bicep`](../infra/main.bicep), Parameter in [`infra/main.bicepparam`](../infra/main.bicepparam). Architektur und Kosten: [06](06-hosting-and-data.md). Aufbau der Workflows nach dem Vorbild von `ch-unibe-learning-astro`.

## Ressourcen

| Ressource | Name | Zweck |
|---|---|---|
| Log Analytics | `log-authex` | Logs der Container-Apps-Umgebung, 30 Tage, Tageslimit 0.2 GB |
| Container-Apps-Umgebung | `cae-authex` | Consumption-Profil |
| Container App | `ca-authex` | Die Anwendung, 0.25 vCPU / 0.5 GiB, immer eine Instanz |
| Container-Apps-Job | `caj-authex-migrate` | Datenbank-Migration, vom Deploy-Workflow ausgelöst |
| Managed Identity | `id-authex-app` | App: Key-Vault-Secrets lesen, Daten lesen/schreiben |
| Managed Identity | `id-authex-migrate` | Migration: Schema ändern |
| Key Vault | `kv-authex-…` | Client Secrets der Anbieter (RBAC, Purge Protection) |
| SQL Server | `sql-authex-…` | Nur Entra-Anmeldung, Administrator = Entra-Gruppe |
| SQL-Datenbank | `sqldb-authex` | Basic, 2 GB |

Die Suffixe `…` werden aus der Ressourcengruppe abgeleitet und sind stabil.

## Workflows

| Workflow | Auslöser | Aufgabe |
|---|---|---|
| [`ci.yml`](../.github/workflows/ci.yml) | Pull Request, Push | Typecheck, Build, Bicep kompilieren und linten |
| [`deploy.yml`](../.github/workflows/deploy.yml) | Push auf `main`, manuell | Image bauen → GHCR, Migrations-Job mit neuem Image ausführen, App aktualisieren |
| [`infra.yml`](../.github/workflows/infra.yml) | manuell | Bicep `what-if` oder `deploy`; übernimmt das laufende Image |
| [`secrets.yml`](../.github/workflows/secrets.yml) | manuell | GitHub-Secrets → Key Vault (mit Ablaufdatum und Content-Type), App neu starten |

Alle Azure-Workflows melden sich per **OIDC-Federation** an – es liegt kein Azure-Secret in GitHub.

## Einmalige Einrichtung

### 1. Identität für die Workflows

Im UniBE-Tenant eine App-Registrierung anlegen, z. B. «UniBE - IDCI - Auth Example GitHub Deploy», mit einem **Federated Credential**:

- Szenario: GitHub Actions bzw. «Other issuer»
- Issuer: `https://token.actions.githubusercontent.com`
- Subject: `repo:id-unibe-ch@53422583/ch-unibe-auth-example@1464391898:ref:refs/heads/main`
- Audience: `api://AzureADTokenExchange`

Die Organisation stellt Subjects mit den unveränderlichen Owner- und Repository-IDs aus. Die einfache Form `repo:id-unibe-ch/ch-unibe-auth-example:…` passt nie (`AADSTS700213`).

Auf der Ressourcengruppe erhält der Service Principal die Rolle **Unibe-Application-Owner (mg-unibe)**. Contributor wird Service Principals hier nicht vergeben, und Rollen zuweisen dürfen sie wegen einer Tenant-Policy ohnehin nicht. Die Workflows setzen daher `ASSIGN_ROLES=false`.

### 2. Repository-Variablen (Settings → Secrets and variables → Actions → Variables)

| Variable | Wert |
|---|---|
| `AZURE_CLIENT_ID` | Client-ID der Workflow-App-Registrierung |
| `ENTRA_TENANT_ID` | `d400387a-212f-43ea-ac7f-77aa12d7977e` |
| `AZURE_SUBSCRIPTION_ID` | Subscription unter dem EA |
| `RESOURCE_GROUP` | z. B. `rg-authex` (Switzerland North) |
| `DEPLOYER_PRINCIPAL_ID` | **Objekt-ID des Service Principals** (Enterprise Application, nicht App-Registrierung) |
| `SQL_ADMIN_GROUP_NAME` | Anzeigename der Entra-Gruppe für die SQL-Administration |
| `SQL_ADMIN_GROUP_OBJECT_ID` | Objekt-ID dieser Gruppe |
| `KEY_VAULT_NAME` | optional; sonst sucht `secrets.yml` den Vault `kv-authex-…` in der Ressourcengruppe |

### 3. Repository-Secrets (Settings → Secrets and variables → Actions → Secrets)

| GitHub-Secret | Key-Vault-Secret |
|---|---|
| `ENTRA_UNIBE_CLIENT_SECRET` | `entra-unibe-client-secret` |
| `MICROSOFT_CLIENT_SECRET` | `microsoft-client-secret` |
| `EXTERNAL_ID_CLIENT_SECRET` | `external-id-client-secret` |
| `SWITCH_CLIENT_SECRET` | `switch-client-secret` |
| `ORCID_CLIENT_SECRET` | `orcid-client-secret` |
| `GOOGLE_CLIENT_SECRET` | `google-client-secret` |
| `OAUTH_GITHUB_CLIENT_SECRET` | `github-client-secret` (GitHub verbietet Secret-Namen mit Präfix `GITHUB_`) |
| `AGOV_CLIENT_SECRET` | `agov-client-secret` |

Nicht gesetzte Secrets überspringt der Workflow.

### 4. Erstes Deployment durch eine Person (Phase 1)

Die Rollenzuweisungen (App-Identität → *Key Vault Secrets User*, Workflow → *Key Vault Secrets Officer*) muss eine Person anlegen. Lokal mit Azure CLI und Bicep:

```bash
az bicep build --file infra/main.bicep
```

```bash
export SQL_ADMIN_GROUP_NAME='<Gruppe>' SQL_ADMIN_GROUP_OBJECT_ID='<Objekt-ID>' DEPLOYER_PRINCIPAL_ID='<Objekt-ID des Service Principals>' DEPLOY_APP=false
```

```bash
az deployment group what-if --resource-group rg-authex --parameters infra/main.bicepparam
```

```bash
az deployment group create --resource-group rg-authex --parameters infra/main.bicepparam
```

`ASSIGN_ROLES` bleibt dabei ungesetzt (= `true`).

### 5. Secrets in den Key Vault

Workflow **Key Vault befüllen** (`secrets.yml`) ausführen. Gültigkeit nicht länger wählen als beim Anbieter; das Ablaufdatum im Key Vault ist die Erinnerung zum Erneuern.

### 6. Datenbankbenutzer anlegen

Als Mitglied der SQL-Administratorgruppe mit `sqldb-authex` verbinden (Azure Data Studio, VS Code mssql oder Query-Editor im Portal) und [`infra/sql/grant-identities.sql`](../infra/sql/grant-identities.sql) ausführen.

### 7. Image bauen

Push auf `main` (oder `deploy.yml` manuell starten). Solange die Container App fehlt, baut der Workflow nur das Image.

Nach dem ersten Push prüfen, ob das Paket `ghcr.io/id-unibe-ch/ch-unibe-auth-example` **öffentlich** ist (GitHub → Organisation → Packages → Package settings). Die Container App bezieht das Image ohne Zugangsdaten; bei einem privaten Paket müssten `registryServer`, `registryUsername` und `registryPassword` gesetzt werden.

### 8. App bereitstellen (Phase 2)

Workflow **Infrastructure (Bicep)** mit `mode = what-if`, `deploy_app = true`, `custom_domain_mode = none`, Ergebnis prüfen, dann mit `mode = deploy`.

### 9. Erstes Release

`deploy.yml` manuell starten: Migrations-Job läuft mit dem aktuellen Image, danach wird die App aktualisiert. Die App ist dann unter `https://ca-authex.<defaultDomain>` erreichbar (Ausgabe `appDefaultHostname`).

### 10. Eigene Domain `login-example.campus.cloud`

1. DNS-Einträge in der Zone `campus.cloud`:
   - `CNAME login-example` → `<appDefaultHostname>`
   - `TXT asuid.login-example` → `<customDomainVerificationId>`
2. `infra.yml` mit `custom_domain_mode = validate` (Hostname ohne Zertifikat, verwaltetes Zertifikat wird ausgestellt – einige Minuten).
3. `infra.yml` mit `custom_domain_mode = bind`. `APP_BASE_URL` zeigt danach auf `https://login-example.campus.cloud`.

Die Redirect-URIs der App-Registrierungen ([07](07-app-registrations.md)) müssen zur aktiven Basis-URL passen. Vor Schritt 10 also vorübergehend auch `https://<appDefaultHostname>/auth/{provider}/callback` eintragen oder erst danach testen.

## Betrieb

- **Neue Version:** Merge bzw. Push auf `main` – `deploy.yml` migriert und rollt aus.
- **Infrastruktur ändern:** `infra.yml`, immer zuerst `what-if`. Das laufende Image bleibt erhalten. Standardwerte der Eingaben (`deploy_app = true`, `custom_domain_mode = bind`) entsprechen dem Endzustand.
- **Neuer Anbieter:** GitHub-Secret anlegen → `secrets.yml` → Eintrag in `identityProviders` (`infra/main.bicepparam`) → `infra.yml`.
- **Secret erneuern:** GitHub-Secret aktualisieren → `secrets.yml` (startet die App neu).
- **Neue Rollenzuweisung nötig:** von einer Person deployen lassen (`ASSIGN_ROLES` ungesetzt).

## Bewusste Entscheide

- **SQL-Firewall «Azure-Dienste zulassen»:** Container Apps im Consumption-Profil haben keine festen ausgehenden IP-Adressen. Die Anmeldung ist nur mit Entra möglich (keine SQL-Logins), das Risiko daher gering. Strengere Alternative: VNet-Integration mit Private Endpoint (Mehrkosten).
- **Zwei Identitäten:** Die App hat keine DDL-Rechte; Schemaänderungen nur über den Migrations-Job.
- **Zwei Phasen:** Die Container App verweist beim Erstellen auf Key-Vault-Secrets, die es dann bereits geben muss.
- **Secrets nie als Template-Parameter:** Sie stünden sonst in der Deployment-Historie. Der Weg führt ausschliesslich über `secrets.yml` (oder `az keyvault secret set` von Hand).
- **Key Vault mit Purge Protection, Secrets mit Ablaufdatum und Content-Type:** von der Guardrail-Policy des Tenants verlangt.
