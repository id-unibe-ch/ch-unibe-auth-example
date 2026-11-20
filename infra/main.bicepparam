// Parameters for infra/main.bicep.
//
// What differs per environment or does not belong in the repository comes from environment
// variables. .github/workflows/infra.yml fills them from the repository variables of the same name.
// For a deployment by hand, set the same variables in the shell. Nothing here is a secret.
using './main.bicep'

param namePrefix = 'authex'
param location = 'switzerlandnorth'
// Switzerland North accepts no new Azure SQL servers at the moment (ADR-018).
param sqlLocation = 'swedencentral'

// Phase 1: false · phase 2 (after the secrets are set): true
param deployApp = bool(readEnvironmentVariable('DEPLOY_APP', 'false'))

// The workflow passes the image currently running, so an infrastructure deployment does not roll back a version.
param containerImage = readEnvironmentVariable('CONTAINER_IMAGE', 'ghcr.io/id-unibe-ch/ch-unibe-auth-example:latest')

// Entra group as SQL administrator (display name and object id from the UniBE tenant)
param sqlAdminGroupName = readEnvironmentVariable('SQL_ADMIN_GROUP_NAME')
param sqlAdminGroupObjectId = readEnvironmentVariable('SQL_ADMIN_GROUP_OBJECT_ID')

// Service principal of the GitHub workflows: may set Key Vault secrets.
param keyVaultWriterPrincipalId = readEnvironmentVariable('DEPLOYER_PRINCIPAL_ID', '')
param keyVaultWriterPrincipalType = 'ServicePrincipal'

// The workflow sets ASSIGN_ROLES=false (tenant policy). A person leaves it unset on the first deployment.
param assignRoles = bool(readEnvironmentVariable('ASSIGN_ROLES', 'true'))

param customDomain = readEnvironmentVariable('CUSTOM_DOMAIN', 'login-example.campus.cloud')
// none → validate (after the DNS records) → bind; infra.yml resolves "auto" to one of them
param customDomainMode = readEnvironmentVariable('CUSTOM_DOMAIN_MODE', 'none')

// Sign-in methods: the client id here, the client secret in the Key Vault under secretName.
// .github/workflows/secrets.yml fills the secrets from the GitHub secrets.
param identityProviders = [
  {
    envPrefix: 'ENTRA_UNIBE'
    clientId: '22c30b53-85f0-4da8-b68b-8c0c2340904a'
    secretName: 'entra-unibe-client-secret'
  }
  {
    envPrefix: 'MICROSOFT'
    clientId: 'b048dae9-05c7-4e86-a5c2-ac955c3c26bf'
    secretName: 'microsoft-client-secret'
  }
  {
    envPrefix: 'EXTERNAL_ID'
    clientId: '20bf5a5b-79a0-40e2-abcb-828224942804'
    secretName: 'external-id-client-secret'
  }
  // Add further providers after registering them (set the secret in the Key Vault first), e.g.:
  // { envPrefix: 'SWITCH', clientId: '…', secretName: 'switch-client-secret' }
  // { envPrefix: 'ORCID',  clientId: '…', secretName: 'orcid-client-secret' }
  // { envPrefix: 'GOOGLE', clientId: '…', secretName: 'google-client-secret' }
  // { envPrefix: 'GITHUB', clientId: '…', secretName: 'github-client-secret' }
]

param extraEnv = []
