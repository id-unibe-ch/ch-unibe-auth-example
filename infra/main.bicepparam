// Parameter für infra/main.bicep.
//
// Werte, die pro Umgebung verschieden sind oder nicht ins Repository gehören, kommen aus
// Umgebungsvariablen. .github/workflows/infra.yml füllt sie aus den gleichnamigen Repository-Variablen.
// Bei einem Deployment von Hand dieselben Variablen in der Shell setzen. Nichts hier ist geheim.
using './main.bicep'

param namePrefix = 'authex'
param location = 'switzerlandnorth'

// Phase 1: false · Phase 2 (nach dem Setzen der Secrets): true
param deployApp = bool(readEnvironmentVariable('DEPLOY_APP', 'false'))

// Der Workflow setzt das aktuell laufende Image ein, damit ein Infrastruktur-Deployment keine Version zurückdreht.
param containerImage = readEnvironmentVariable('CONTAINER_IMAGE', 'ghcr.io/id-unibe-ch/ch-unibe-auth-example:latest')

// Entra-Gruppe als SQL-Administrator (Anzeigename und Objekt-ID aus dem UniBE-Tenant)
param sqlAdminGroupName = readEnvironmentVariable('SQL_ADMIN_GROUP_NAME')
param sqlAdminGroupObjectId = readEnvironmentVariable('SQL_ADMIN_GROUP_OBJECT_ID')

// Service Principal der GitHub-Workflows: darf Secrets im Key Vault setzen.
param secretsOfficerPrincipalId = readEnvironmentVariable('DEPLOYER_PRINCIPAL_ID', '')
param secretsOfficerPrincipalType = 'ServicePrincipal'

// Der Workflow setzt ASSIGN_ROLES=false (Tenant-Policy). Eine Person lässt die Variable beim ersten Deployment weg.
param assignRoles = bool(readEnvironmentVariable('ASSIGN_ROLES', 'true'))

param customDomain = 'login-example.campus.cloud'
// none → validate (nach den DNS-Einträgen) → bind
param customDomainMode = readEnvironmentVariable('CUSTOM_DOMAIN_MODE', 'none')

// Anmeldemethoden: Client-ID hier, Client Secret im Key Vault unter secretName.
// Die Secrets füllt .github/workflows/secrets.yml aus den GitHub-Secrets.
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
  // Weitere Anbieter nach der Registrierung ergänzen (Secret vorher im Key Vault setzen), z. B.:
  // { envPrefix: 'SWITCH', clientId: '…', secretName: 'switch-client-secret' }
  // { envPrefix: 'ORCID',  clientId: '…', secretName: 'orcid-client-secret' }
  // { envPrefix: 'GOOGLE', clientId: '…', secretName: 'google-client-secret' }
  // { envPrefix: 'GITHUB', clientId: '…', secretName: 'github-client-secret' }
]

param extraEnv = []
