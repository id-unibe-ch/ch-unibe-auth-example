using './main.bicep'

// Phase 1: false · Phase 2 (nach dem Setzen der Secrets): true
param deployApp = false

param containerImage = 'ghcr.io/id-unibe-ch/ch-unibe-auth-example:latest'
// Für ein privates GHCR-Paket: registryServer/registryUsername setzen und registryPassword beim Deployment übergeben.
param registryServer = ''
param registryUsername = ''

// Entra-Gruppe als SQL-Administrator (Anzeigename und Objekt-ID aus dem UniBE-Tenant)
param sqlAdminGroupName = '<Name der Entra-Gruppe>'
param sqlAdminGroupObjectId = '<Objekt-ID der Entra-Gruppe>'

// Wer Secrets im Key Vault setzen darf (Person oder Gruppe)
param secretsOfficerPrincipalId = '<Objekt-ID>'
param secretsOfficerPrincipalType = 'Group'

param customDomain = 'login-example.campus.cloud'
// none → validate (nach DNS-Einträgen) → bind
param customDomainMode = 'none'

// Anmeldemethoden: Client-ID hier, Client Secret im Key Vault unter secretName
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
  // Weitere Anbieter nach der Registrierung ergänzen, z. B.:
  // { envPrefix: 'SWITCH', clientId: '…', secretName: 'switch-client-secret' }
  // { envPrefix: 'ORCID',  clientId: '…', secretName: 'orcid-client-secret' }
  // { envPrefix: 'GOOGLE', clientId: '…', secretName: 'google-client-secret' }
  // { envPrefix: 'GITHUB', clientId: '…', secretName: 'github-client-secret' }
]

param extraEnv = []
