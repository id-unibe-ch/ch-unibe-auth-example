// UniBE login example – Azure infrastructure
// Architecture and costs: docs/06-hosting-and-data.md · Procedure: docs/08-deployment.md
//
// Resources (region Switzerland North; SQL in Sweden Central, see sqlLocation):
//   Log Analytics · Container Apps environment · Container App (always on) · Container Apps job (DB migration)
//   2 user-assigned managed identities (app, migration) · Key Vault (RBAC) · Azure SQL server + DB (Basic)
//
// Deployed in two phases, because the Container App refers to existing Key Vault secrets on creation:
//   1. deployApp = false → base (identities, Key Vault, SQL, environment)
//   2. set the secrets in the Key Vault, create the DB users, then deployApp = true

targetScope = 'resourceGroup'

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

@description('Azure region of all resources.')
param location string = 'switzerlandnorth'

@description('''Azure region of the SQL server and database. Switzerland North accepts no new Azure SQL
servers at the moment (RegionDoesNotAllowProvisioning), hence a region of its own (ADR-018).''')
param sqlLocation string = 'swedencentral'

@description('Short name for resource names (lower-case letters, digits, hyphen).')
@maxLength(12)
param namePrefix string = 'authex'

@description('Tags for all resources.')
param tags object = {
  project: 'unibe-auth-example'
  owner: 'IDCI'
}

@description('Phase 2: deploy the Container App and the migration job. Set only once the secrets exist in the Key Vault.')
param deployApp bool = false

@description('Container image, e.g. ghcr.io/id-unibe-ch/ch-unibe-auth-example:<commit-sha>')
param containerImage string = 'ghcr.io/id-unibe-ch/ch-unibe-auth-example:latest'

@description('Container registry for private images (empty = public image), e.g. ghcr.io')
param registryServer string = ''

@description('User name for the container registry.')
param registryUsername string = ''

@description('Password or token for the container registry (e.g. a GitHub PAT with read:packages).')
@secure()
param registryPassword string = ''

@description('Entra group that becomes administrator of the SQL server: display name.')
param sqlAdminGroupName string

@description('Entra group that becomes administrator of the SQL server: object id.')
param sqlAdminGroupObjectId string

@description('''Create the role assignments. A tenant policy keeps service principals from assigning roles:
the GitHub workflow therefore sets false; a person creates the roles on the first deployment (docs/08-deployment.md).''')
param assignRoles bool = true

@description('Object id of the principal allowed to set Key Vault secrets – typically the service principal of the GitHub workflows (empty = no assignment).')
param keyVaultWriterPrincipalId string = ''

@description('Type of the Key Vault writer principal.')
@allowed([
  'ServicePrincipal'
  'User'
  'Group'
])
param keyVaultWriterPrincipalType string = 'ServicePrincipal'

@description('Custom domain of the app (empty = *.azurecontainerapps.io only).')
param customDomain string = 'login-example.campus.cloud'

@description('''Custom domain:
none     – not configured
validate – add the hostname without a certificate and issue the managed certificate (the DNS records must exist)
bind     – bind the hostname with the managed certificate''')
@allowed([
  'none'
  'validate'
  'bind'
])
param customDomainMode string = 'none'

@description('''Sign-in methods: per entry the prefix of the environment variables, the client id and the name of the Key Vault secret.
Yields {envPrefix}_CLIENT_ID (value) and {envPrefix}_CLIENT_SECRET (from Key Vault).''')
param identityProviders array = []

@description('Further, non-secret environment variables of the app, e.g. [{ name: \'ORCID_ISSUER\', value: \'https://orcid.org\' }].')
param extraEnv array = []

@description('Number of app instances (min = max, no scale to zero).')
@minValue(1)
@maxValue(3)
param replicas int = 1

// ---------------------------------------------------------------------------
// Names
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
  // The location is part of the name: a server cannot move, and a failed attempt in one region keeps
  // the name bound to it (InvalidResourceLocation). Another sqlLocation therefore means another server.
  sqlServer: 'sql-${namePrefix}-${uniqueString(resourceGroup().id, sqlLocation)}'
  sqlDatabase: 'sqldb-${namePrefix}'
  certificate: 'cert-${replace(customDomain, '.', '-')}'
}

var appPort = 4321
var useRegistry = !empty(registryServer)
var useCustomDomain = !empty(customDomain) && customDomainMode != 'none'

// Built-in roles
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
    // Cost cap: at most 0.2 GB of logs a day.
    workspaceCapping: { dailyQuotaGb: json('0.2') }
  }
}

// ---------------------------------------------------------------------------
// Identities
// ---------------------------------------------------------------------------

resource appIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: names.appIdentity
  location: location
  tags: tags
}

// A separate identity for migrations: only it gets DDL rights in the database.
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
    // Required by the policy "Enforce recommended guardrails for Azure Key Vault".
    // Purge protection cannot be switched off again; a deleted vault's name stays reserved for 30 days.
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

resource keyVaultWriter 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (assignRoles && !empty(keyVaultWriterPrincipalId)) {
  scope: keyVault
  name: guid(keyVault.id, keyVaultWriterPrincipalId, roleKeyVaultSecretsOfficer)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleKeyVaultSecretsOfficer)
    principalId: keyVaultWriterPrincipalId
    principalType: keyVaultWriterPrincipalType
  }
}

// ---------------------------------------------------------------------------
// Azure SQL
// ---------------------------------------------------------------------------

resource sqlServer 'Microsoft.Sql/servers@2023-08-01' = {
  name: names.sqlServer
  location: sqlLocation
  tags: tags
  properties: {
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    // Entra sign-in only, no SQL logins.
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

// Container Apps (Consumption) have no fixed outbound IP addresses.
// Hence access from Azure services is allowed; sign-in is possible with Entra only anyway.
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
  location: sqlLocation
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
// Container Apps environment
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
    // The hostname has to be on the app first (phase "validate").
    app
  ]
}

// ---------------------------------------------------------------------------
// App configuration
// ---------------------------------------------------------------------------

var appBaseUrl = useCustomDomain && customDomainMode == 'bind'
  ? 'https://${customDomain}'
  : 'https://${names.app}.${containerEnv.properties.defaultDomain}'

var sqlEnv = [
  { name: 'SQL_SERVER', value: sqlServer.properties.fullyQualifiedDomainName }
  { name: 'SQL_DATABASE', value: sqlDatabase.name }
  { name: 'SQL_AUTH', value: 'entra' }
]

// Build the Key Vault URL from the name: variable loops may not use runtime values (vaultUri).
var keyVaultUri = 'https://${names.keyVault}${environment().suffixes.keyvaultDns}'

var providerSecrets = [
  for p in identityProviders: {
    name: toLower(replace('${p.envPrefix}-client-secret', '_', '-'))
    keyVaultUrl: '${keyVaultUri}/secrets/${p.secretName}'
    identity: appIdentity.id
  }
]

// Two loops and a concat: a for-expression may not stand inside a function call such as flatten() (BCP138).
var providerIdEnv = [
  for p in identityProviders: { name: '${p.envPrefix}_CLIENT_ID', value: p.clientId }
]
var providerSecretEnv = [
  for p in identityProviders: {
    name: '${p.envPrefix}_CLIENT_SECRET'
    secretRef: toLower(replace('${p.envPrefix}-client-secret', '_', '-'))
  }
]
var providerEnv = concat(providerIdEnv, providerSecretEnv)

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
      // Always on, no scale to zero (ADR-011).
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
// Migration job (start manually: az containerapp job start)
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
// Outputs
// ---------------------------------------------------------------------------

@description('Default hostname of the app (target of the CNAME record).')
output appDefaultHostname string = '${names.app}.${containerEnv.properties.defaultDomain}'

@description('Value of the TXT record asuid.<subdomain> for domain verification.')
output customDomainVerificationId string = containerEnv.properties.customDomainConfiguration.customDomainVerificationId

@description('Public base URL of the app (for redirect URIs).')
output appBaseUrl string = appBaseUrl

output keyVaultName string = keyVault.name
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output sqlDatabaseName string = sqlDatabase.name

@description('Name of the app identity (for CREATE USER … FROM EXTERNAL PROVIDER).')
output appIdentityName string = appIdentity.name

@description('Name of the migration identity (for CREATE USER … FROM EXTERNAL PROVIDER).')
output migrationIdentityName string = migrationIdentity.name

output migrationJobName string = names.migrationJob
