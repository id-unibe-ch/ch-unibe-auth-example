// UniBE Login-Beispiel – Azure-Infrastruktur
// Architektur und Kosten: docs/06-hosting-and-data.md · Ablauf: docs/08-deployment.md
//
// Ressourcen (Region Switzerland North):
//   Log Analytics · Container-Apps-Umgebung · Container App (immer an) · Container-Apps-Job (DB-Migration)
//   2 User-assigned Managed Identities (App, Migration) · Key Vault (RBAC) · Azure SQL Server + DB (Basic)
//
// Deployment in zwei Phasen, weil die Container App beim Erstellen auf vorhandene Key-Vault-Secrets verweist:
//   1. deployApp = false → Basis (Identitäten, Key Vault, SQL, Umgebung)
//   2. Secrets im Key Vault setzen, DB-Benutzer anlegen, dann deployApp = true

targetScope = 'resourceGroup'

// ---------------------------------------------------------------------------
// Parameter
// ---------------------------------------------------------------------------

@description('Azure-Region aller Ressourcen.')
param location string = 'switzerlandnorth'

@description('Kurzname für Ressourcennamen (Kleinbuchstaben, Ziffern, Bindestrich).')
@maxLength(12)
param namePrefix string = 'authex'

@description('Tags für alle Ressourcen.')
param tags object = {
  project: 'unibe-auth-example'
  owner: 'IDCI'
}

@description('Phase 2: Container App und Migrations-Job bereitstellen. Erst setzen, wenn die Secrets im Key Vault vorhanden sind.')
param deployApp bool = false

@description('Container-Image, z. B. ghcr.io/id-unibe-ch/ch-unibe-auth-example:<commit-sha>')
param containerImage string = 'ghcr.io/id-unibe-ch/ch-unibe-auth-example:latest'

@description('Container-Registry für private Images (leer = öffentliches Image), z. B. ghcr.io')
param registryServer string = ''

@description('Benutzername für die Container-Registry.')
param registryUsername string = ''

@description('Passwort bzw. Token für die Container-Registry (z. B. GitHub-PAT mit read:packages).')
@secure()
param registryPassword string = ''

@description('Entra-Gruppe, die Administrator des SQL-Servers wird: Anzeigename.')
param sqlAdminGroupName string

@description('Entra-Gruppe, die Administrator des SQL-Servers wird: Objekt-ID.')
param sqlAdminGroupObjectId string

@description('''Rollenzuweisungen anlegen. Eine Tenant-Policy verbietet Service Principals das Zuweisen von Rollen:
Der GitHub-Workflow setzt deshalb false; die Rollen legt eine Person beim ersten Deployment an (docs/08-deployment.md).''')
param assignRoles bool = true

@description('Objekt-ID des Principals, der Secrets im Key Vault setzen darf – typischerweise der Service Principal der GitHub-Workflows (leer = keine Zuweisung).')
param secretsOfficerPrincipalId string = ''

@description('Typ des Secrets-Officer-Principals.')
@allowed([
  'ServicePrincipal'
  'User'
  'Group'
])
param secretsOfficerPrincipalType string = 'ServicePrincipal'

@description('Eigene Domain der App (leer = nur *.azurecontainerapps.io).')
param customDomain string = 'login-example.campus.cloud'

@description('''Custom Domain:
none     – nicht konfigurieren
validate – Hostname ohne Zertifikat hinzufügen und verwaltetes Zertifikat ausstellen (DNS-Einträge müssen bestehen)
bind     – Hostname mit dem verwalteten Zertifikat binden''')
@allowed([
  'none'
  'validate'
  'bind'
])
param customDomainMode string = 'none'

@description('''Anmeldemethoden: pro Eintrag Präfix der Umgebungsvariablen, Client-ID und Name des Secrets im Key Vault.
Ergibt {envPrefix}_CLIENT_ID (Wert) und {envPrefix}_CLIENT_SECRET (aus Key Vault).''')
param identityProviders array = []

@description('Weitere, nicht geheime Umgebungsvariablen der App, z. B. [{ name: \'ORCID_ISSUER\', value: \'https://orcid.org\' }].')
param extraEnv array = []

@description('Anzahl Instanzen der App (min = max, kein Scale-to-Zero).')
@minValue(1)
@maxValue(3)
param replicas int = 1

// ---------------------------------------------------------------------------
// Namen
// ---------------------------------------------------------------------------

var suffix = uniqueString(resourceGroup().id)
var names = {
  logs: 'log-${namePrefix}'
  environment: 'cae-${namePrefix}'
  app: 'ca-${namePrefix}'
  migrationJob: 'caj-${namePrefix}-migrate'
  appIdentity: 'id-${namePrefix}-app'
  migrationIdentity: 'id-${namePrefix}-migrate'
  keyVault: take('kv-${namePrefix}-${suffix}', 24)
  sqlServer: 'sql-${namePrefix}-${suffix}'
  sqlDatabase: 'sqldb-${namePrefix}'
  certificate: 'cert-${replace(customDomain, '.', '-')}'
}

var appPort = 4321
var useRegistry = !empty(registryServer)
var useCustomDomain = !empty(customDomain) && customDomainMode != 'none'

// Eingebaute Rollen
var roleKeyVaultSecretsUser = '4633458b-17de-408a-b874-0445c86b69e6'
var roleKeyVaultSecretsOfficer = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'

// ---------------------------------------------------------------------------
// Monitoring
// ---------------------------------------------------------------------------

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: names.logs
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    // Kostendeckel: max. 0.2 GB Logs pro Tag.
    workspaceCapping: { dailyQuotaGb: json('0.2') }
  }
}

// ---------------------------------------------------------------------------
// Identitäten
// ---------------------------------------------------------------------------

resource appIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: names.appIdentity
  location: location
  tags: tags
}

// Eigene Identität für Migrationen: nur sie erhält DDL-Rechte in der Datenbank.
resource migrationIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: names.migrationIdentity
  location: location
  tags: tags
}

// ---------------------------------------------------------------------------
// Key Vault
// ---------------------------------------------------------------------------

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: names.keyVault
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    // Von der Policy «Enforce recommended guardrails for Azure Key Vault» verlangt.
    // Purge Protection lässt sich nicht mehr ausschalten; der Name bleibt nach dem Löschen 30 Tage reserviert.
    enableSoftDelete: true
    softDeleteRetentionInDays: 30
    enablePurgeProtection: true
    publicNetworkAccess: 'Enabled'
  }
}

resource appSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (assignRoles) {
  scope: keyVault
  name: guid(keyVault.id, appIdentity.id, roleKeyVaultSecretsUser)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleKeyVaultSecretsUser)
    principalId: appIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource secretsOfficer 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (assignRoles && !empty(secretsOfficerPrincipalId)) {
  scope: keyVault
  name: guid(keyVault.id, secretsOfficerPrincipalId, roleKeyVaultSecretsOfficer)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleKeyVaultSecretsOfficer)
    principalId: secretsOfficerPrincipalId
    principalType: secretsOfficerPrincipalType
  }
}

// ---------------------------------------------------------------------------
// Azure SQL
// ---------------------------------------------------------------------------

resource sqlServer 'Microsoft.Sql/servers@2023-08-01' = {
  name: names.sqlServer
  location: location
  tags: tags
  properties: {
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    // Nur Entra-Anmeldung, keine SQL-Logins.
    administrators: {
      administratorType: 'ActiveDirectory'
      azureADOnlyAuthentication: true
      login: sqlAdminGroupName
      sid: sqlAdminGroupObjectId
      tenantId: subscription().tenantId
      principalType: 'Group'
    }
  }
}

// Container Apps (Consumption) haben keine festen ausgehenden IP-Adressen.
// Daher Zugriff aus Azure-Diensten erlauben; die Anmeldung ist ohnehin nur mit Entra möglich.
resource sqlAllowAzure 'Microsoft.Sql/servers/firewallRules@2023-08-01' = {
  parent: sqlServer
  name: 'AllowAllWindowsAzureIps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-08-01' = {
  parent: sqlServer
  name: names.sqlDatabase
  location: location
  tags: tags
  sku: {
    name: 'Basic'
    tier: 'Basic'
  }
  properties: {
    maxSizeBytes: 2147483648 // 2 GB
    requestedBackupStorageRedundancy: 'Local'
  }
}

// ---------------------------------------------------------------------------
// Container-Apps-Umgebung
// ---------------------------------------------------------------------------

resource containerEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: names.environment
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
  }
}

resource managedCertificate 'Microsoft.App/managedEnvironments/managedCertificates@2024-03-01' = if (deployApp && useCustomDomain) {
  parent: containerEnv
  name: names.certificate
  location: location
  tags: tags
  properties: {
    subjectName: customDomain
    domainControlValidation: 'CNAME'
  }
  dependsOn: [
    // Der Hostname muss zuerst an der App hängen (Phase «validate»).
    app
  ]
}

// ---------------------------------------------------------------------------
// App-Konfiguration
// ---------------------------------------------------------------------------

var appBaseUrl = useCustomDomain && customDomainMode == 'bind'
  ? 'https://${customDomain}'
  : 'https://${names.app}.${containerEnv.properties.defaultDomain}'

var sqlEnv = [
  { name: 'SQL_SERVER', value: sqlServer.properties.fullyQualifiedDomainName }
  { name: 'SQL_DATABASE', value: sqlDatabase.name }
  { name: 'SQL_AUTH', value: 'entra' }
]

// Key-Vault-URL aus dem Namen bilden: Variablen-Schleifen dürfen keine Laufzeitwerte (vaultUri) verwenden.
var keyVaultUri = 'https://${names.keyVault}${environment().suffixes.keyvaultDns}'

var providerSecrets = [
  for p in identityProviders: {
    name: toLower(replace('${p.envPrefix}-client-secret', '_', '-'))
    keyVaultUrl: '${keyVaultUri}/secrets/${p.secretName}'
    identity: appIdentity.id
  }
]

var providerEnv = flatten([
  for p in identityProviders: [
    { name: '${p.envPrefix}_CLIENT_ID', value: p.clientId }
    { name: '${p.envPrefix}_CLIENT_SECRET', secretRef: toLower(replace('${p.envPrefix}-client-secret', '_', '-')) }
  ]
])

var registrySecrets = useRegistry ? [{ name: 'registry-password', value: registryPassword }] : []
var registries = useRegistry
  ? [{ server: registryServer, username: registryUsername, passwordSecretRef: 'registry-password' }]
  : []

var customDomains = useCustomDomain
  ? [
      customDomainMode == 'bind'
        ? {
            name: customDomain
            bindingType: 'SniEnabled'
            certificateId: resourceId('Microsoft.App/managedEnvironments/managedCertificates', containerEnv.name, names.certificate)
          }
        : {
            name: customDomain
            bindingType: 'Disabled'
          }
    ]
  : []

// ---------------------------------------------------------------------------
// Container App
// ---------------------------------------------------------------------------

resource app 'Microsoft.App/containerApps@2024-03-01' = if (deployApp) {
  name: names.app
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${appIdentity.id}': {} }
  }
  properties: {
    environmentId: containerEnv.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: appPort
        transport: 'auto'
        allowInsecure: false
        customDomains: customDomains
      }
      secrets: concat(providerSecrets, registrySecrets)
      registries: registries
    }
    template: {
      containers: [
        {
          name: 'app'
          image: containerImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: concat(
            [
              { name: 'APP_BASE_URL', value: appBaseUrl }
              { name: 'AZURE_CLIENT_ID', value: appIdentity.properties.clientId }
            ],
            sqlEnv,
            providerEnv,
            extraEnv
          )
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/healthz', port: appPort }
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: { path: '/healthz', port: appPort }
              periodSeconds: 10
            }
          ]
        }
      ]
      // Immer an, kein Scale-to-Zero (ADR-011).
      scale: {
        minReplicas: replicas
        maxReplicas: replicas
      }
    }
  }
  dependsOn: [
    appSecretsUser
  ]
}

// ---------------------------------------------------------------------------
// Migrations-Job (manuell auslösen: az containerapp job start)
// ---------------------------------------------------------------------------

resource migrationJob 'Microsoft.App/jobs@2024-03-01' = if (deployApp) {
  name: names.migrationJob
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${migrationIdentity.id}': {} }
  }
  properties: {
    environmentId: containerEnv.id
    workloadProfileName: 'Consumption'
    configuration: {
      triggerType: 'Manual'
      manualTriggerConfig: {
        parallelism: 1
        replicaCompletionCount: 1
      }
      replicaTimeout: 600
      replicaRetryLimit: 0
      secrets: registrySecrets
      registries: registries
    }
    template: {
      containers: [
        {
          name: 'migrate'
          image: containerImage
          command: [ 'node', 'scripts/migrate.mjs' ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: concat(sqlEnv, [
            { name: 'AZURE_CLIENT_ID', value: migrationIdentity.properties.clientId }
          ])
        }
      ]
    }
  }
}

// ---------------------------------------------------------------------------
// Ausgaben
// ---------------------------------------------------------------------------

@description('Standard-Hostname der App (Ziel des CNAME-Eintrags).')
output appDefaultHostname string = '${names.app}.${containerEnv.properties.defaultDomain}'

@description('Wert für den TXT-Eintrag asuid.<subdomain> zur Domain-Verifizierung.')
output customDomainVerificationId string = containerEnv.properties.customDomainConfiguration.customDomainVerificationId

@description('Öffentliche Basis-URL der App (für Redirect-URIs).')
output appBaseUrl string = appBaseUrl

output keyVaultName string = keyVault.name
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output sqlDatabaseName string = sqlDatabase.name

@description('Name der App-Identität (für CREATE USER … FROM EXTERNAL PROVIDER).')
output appIdentityName string = appIdentity.name

@description('Name der Migrations-Identität (für CREATE USER … FROM EXTERNAL PROVIDER).')
output migrationIdentityName string = migrationIdentity.name

output migrationJobName string = names.migrationJob
