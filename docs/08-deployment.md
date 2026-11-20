# 08 – Deployment (Azure, Bicep, GitHub Actions)

Infrastructure as code in [`infra/main.bicep`](../infra/main.bicep), parameters in [`infra/main.bicepparam`](../infra/main.bicepparam). Architecture and costs: [06](06-hosting-and-data.md). The workflows follow `ch-unibe-learning-astro` ([ADR-015](02-decisions.md)).

## Resources

| Resource | Name | Purpose |
|---|---|---|
| Log Analytics | `log-authex` | Logs of the Container Apps environment, 30 days, daily cap 0.2 GB |
| Container Apps environment | `cae-authex` | Consumption profile |
| Container App | `ca-authex` | The application, 0.25 vCPU / 0.5 GiB, always one instance |
| Container Apps job | `caj-authex-migrate` | Database migration, started by the deploy workflow |
| Managed identity | `id-authex-app` | App: read Key Vault secrets, read/write data |
| Managed identity | `id-authex-migrate` | Migration: change the schema |
| Key Vault | `kv-authex-…` | The providers' client secrets (RBAC, purge protection) |
| SQL server | `sql-authex-…` | Entra sign-in only, administrator = an Entra group; **Sweden Central** ([ADR-018](02-decisions.md)) |
| SQL database | `sqldb-authex` | Basic, 2 GB; Sweden Central |

The `…` suffixes are derived from the resource group and are stable. All resources are in Switzerland North except SQL server and database (`sqlLocation`).

## Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| [`ci.yml`](../.github/workflows/ci.yml) | pull request, push to `main` | Type-check, build, compile and lint the Bicep template |
| [`deploy.yml`](../.github/workflows/deploy.yml) | push to `main`, manual | Build the image → GHCR, run the migration job with the new image, update the app |
| [`infra.yml`](../.github/workflows/infra.yml) | manual | Bicep `what-if` or `deploy`; keeps the running image |
| [`secrets.yml`](../.github/workflows/secrets.yml) | manual | GitHub secrets → Key Vault (with expiry date and content type), restart the app |

Every Azure workflow signs in with **OIDC federation** – there is no Azure secret in GitHub.

## One-time setup

### 1. An identity for the workflows

In the UniBE tenant, create an app registration, e.g. "UniBE - IDCI - Auth Example GitHub Deploy", with a **federated credential**:

- Scenario: GitHub Actions or "Other issuer"
- Issuer: `https://token.actions.githubusercontent.com`
- Subject: `repo:id-unibe-ch@53422583/ch-unibe-auth-example@1464391898:ref:refs/heads/main`
- Audience: `api://AzureADTokenExchange`

The organisation issues subjects with the immutable owner and repository ids. The plain form `repo:id-unibe-ch/ch-unibe-auth-example:…` never matches (`AADSTS700213`).

On the resource group, the service principal gets the custom role **Unibe-Application-Owner (mg-unibe)**. Contributor is not granted to service principals here, and a tenant policy keeps them from assigning roles anyway. The workflows therefore set `ASSIGN_ROLES=false`.

### 2. Repository variables (Settings → Secrets and variables → Actions → Variables)

| Variable | Value |
|---|---|
| `AZURE_CLIENT_ID` | Client id of the workflow app registration |
| `ENTRA_TENANT_ID` | `d400387a-212f-43ea-ac7f-77aa12d7977e` |
| `AZURE_SUBSCRIPTION_ID` | The subscription under the EA |
| `RESOURCE_GROUP` | e.g. `rg-authex` (Switzerland North) |
| `DEPLOYER_PRINCIPAL_ID` | **Object id of the service principal** (the enterprise application, not the app registration) |
| `SQL_ADMIN_GROUP_NAME` | Display name of the Entra group administering SQL |
| `SQL_ADMIN_GROUP_OBJECT_ID` | Object id of that group |
| `KEY_VAULT_NAME` | optional; otherwise `secrets.yml` looks for `kv-authex-…` in the resource group |

### 3. Repository secrets (Settings → Secrets and variables → Actions → Secrets)

| GitHub secret | Key Vault secret |
|---|---|
| `ENTRA_UNIBE_CLIENT_SECRET` | `entra-unibe-client-secret` |
| `MICROSOFT_CLIENT_SECRET` | `microsoft-client-secret` |
| `EXTERNAL_ID_CLIENT_SECRET` | `external-id-client-secret` |
| `SWITCH_CLIENT_SECRET` | `switch-client-secret` |
| `ORCID_CLIENT_SECRET` | `orcid-client-secret` |
| `GOOGLE_CLIENT_SECRET` | `google-client-secret` |
| `OAUTH_GITHUB_CLIENT_SECRET` | `github-client-secret` (GitHub refuses secret names starting with `GITHUB_`) |
| `AGOV_CLIENT_SECRET` | `agov-client-secret` |

The workflow skips any secret that is not set.

### 4. First deployment by a person (phase 1)

The role assignments (app identity → *Key Vault Secrets User*, workflow → *Key Vault Secrets Officer*) have to be created by a person. Locally, with the Azure CLI and Bicep:

```bash
az bicep build --file infra/main.bicep
```

```bash
export SQL_ADMIN_GROUP_NAME='<group>' SQL_ADMIN_GROUP_OBJECT_ID='<object id>' DEPLOYER_PRINCIPAL_ID='<object id of the service principal>' DEPLOY_APP=false
```

```bash
az deployment group what-if --resource-group rg-authex --parameters infra/main.bicepparam
```

```bash
az deployment group create --resource-group rg-authex --parameters infra/main.bicepparam
```

Leave `ASSIGN_ROLES` unset (= `true`).

### 5. Secrets into the Key Vault

Run the **Fill Key Vault** workflow (`secrets.yml`). Choose a validity no longer than at the provider; the expiry date in the Key Vault is the reminder to renew the secret.

### 6. Database users

Connect to `sqldb-authex` as a member of the SQL administrator group (Azure Data Studio, VS Code mssql or the portal's query editor) and run [`infra/sql/grant-identities.sql`](../infra/sql/grant-identities.sql).

### 7. Build the image

Push to `main` (or start `deploy.yml` by hand). As long as the Container App does not exist, the workflow only builds the image.

After the first push, check that the package `ghcr.io/id-unibe-ch/ch-unibe-auth-example` is **public** (GitHub → organisation → Packages → Package settings). The Container App pulls the image without credentials; for a private package, `registryServer`, `registryUsername` and `registryPassword` would have to be set.

### 8. Deploy the app (phase 2)

Run **Infrastructure (Bicep)** with `mode = what-if`, `deploy_app = true`, `custom_domain_mode = none`, check the result, then run it with `mode = deploy`.

### 9. First release

Start `deploy.yml` by hand: the migration job runs with the current image, then the app is updated. The app is then reachable at `https://ca-authex.<defaultDomain>` (output `appDefaultHostname`).

### 10. Custom domain `login-example.campus.cloud`

1. DNS records in the `campus.cloud` zone:
   - `CNAME login-example` → `<appDefaultHostname>`
   - `TXT asuid.login-example` → `<customDomainVerificationId>`
2. `infra.yml` with `custom_domain_mode = validate` (hostname without certificate, the managed certificate is issued – takes a few minutes).
3. `infra.yml` with `custom_domain_mode = bind`. `APP_BASE_URL` then points at `https://login-example.campus.cloud`.

The redirect URIs of the app registrations ([07](07-app-registrations.md)) have to match the active base URL. Before step 10, either add `https://<appDefaultHostname>/auth/{provider}/callback` temporarily or test only afterwards.

## Operations

- **New version:** merge or push to `main` – `deploy.yml` migrates and rolls out.
- **Infrastructure change:** `infra.yml`, always `what-if` first. The running image is kept. The inputs' defaults (`deploy_app = true`, `custom_domain_mode = bind`) are the final state.
- **New provider:** add the GitHub secret → `secrets.yml` → entry in `identityProviders` (`infra/main.bicepparam`) → `infra.yml`.
- **Renewed secret:** update the GitHub secret → `secrets.yml` (restarts the app).
- **New role assignment needed:** have a person deploy (`ASSIGN_ROLES` unset).

## Deliberate choices

- **SQL firewall "allow Azure services":** Container Apps on the Consumption profile have no fixed outbound IP addresses. Sign-in is possible with Entra only (no SQL logins), so the risk is small. Stricter alternative: VNet integration with a private endpoint (extra cost).
- **Two identities:** the app has no DDL rights; schema changes only through the migration job.
- **Two phases:** the Container App refers to Key Vault secrets on creation, and they have to exist by then.
- **Secrets never as template parameters:** they would end up in the deployment history. They go only through `secrets.yml` (or `az keyvault secret set` by hand).
- **Key Vault with purge protection, secrets with expiry date and content type:** required by the tenant's guardrail policy.
- **Not verified here:** the template has not been compiled in the development environment (no Bicep CLI); `ci.yml` compiles and lints it on every pull request.
