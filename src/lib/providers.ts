import { env } from './config';

/**
 * Provider registry: one definition per sign-in method.
 * New IdPs are added here – routes and UI are generic.
 * Background and specifics: docs/03-identity-providers.md
 */

export type ProviderGroup = 'direct' | 'broker';
export type Protocol = 'oidc' | 'oauth2';

/**
 * available = implemented (active once client id and secret are set)
 * pending   = access still being clarified
 * deferred  = postponed for now
 */
export type ProviderStatus = 'available' | 'pending' | 'deferred';

/** Normalised user information, independent of the protocol. */
export interface ProviderProfile {
  /** Issuer as stored (tenant-specific for Entra). */
  issuer: string;
  /** Stable identity key within the issuer. */
  subject: string;
  displayName?: string;
  email?: string;
  emailVerified?: boolean;
  /** Selected claims for the profile's technical details. */
  claims: Record<string, unknown>;
}

export interface OAuth2Endpoints {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  /** Fetches the user information with the access token (there is no ID token). */
  fetchProfile: (accessToken: string) => Promise<ProviderProfile>;
}

/** Where the sign-in page lists a provider (grouped by audience, ADR-017). */
export type ProviderSection = 'primary' | 'academic' | 'other';

export interface ProviderDefinition {
  id: string;
  section: ProviderSection;
  /** Brand name, the same in every language. Descriptions live in src/i18n/ui.ts. */
  label: string;
  group: ProviderGroup;
  protocol: Protocol;
  status: ProviderStatus;
  /** Prefix of the environment variables: {PREFIX}_CLIENT_ID, {PREFIX}_CLIENT_SECRET */
  envPrefix: string;
  scope: string;
  /** OIDC: issuer URL for discovery (resolved at runtime). */
  issuer?: () => string | undefined;
  /** OAuth 2.0 without OIDC: endpoints and profile lookup. */
  oauth2?: OAuth2Endpoints;
  /** How the identity key is formed from the ID token's claims. */
  identity?: 'sub' | 'entra-oid';
  /** Additional parameters for the authorization request. */
  authParams?: Record<string, string>;
  /** Additional parameters when linking (e.g. force the account picker). */
  linkParams?: Record<string, string>;
}

const SNAPSHOT_CLAIMS = [
  'name',
  'given_name',
  'family_name',
  'preferred_username',
  'email',
  'email_verified',
  'tid',
  'idp',
  'hd',
  'amr',
  'acr',
  'auth_time',
  'locale',
] as const;

export function pickClaims(claims: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of SNAPSHOT_CLAIMS) {
    if (claims[key] !== undefined) out[key] = claims[key];
  }
  return out;
}

/** Tenant id of UniBE (unibe.ch). */
export const UNIBE_TENANT_ID = 'd400387a-212f-43ea-ac7f-77aa12d7977e';
/** Tenant id of the External ID directory unibeeid.onmicrosoft.com. */
export const EXTERNAL_ID_TENANT_ID = 'a791c572-76d6-4480-83df-b81dcdb92f69';

/** Tenant id of personal Microsoft accounts. */
export const MSA_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad';

async function fetchGitHubProfile(accessToken: string): Promise<ProviderProfile> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'unibe-auth-example',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const userRes = await fetch('https://api.github.com/user', { headers });
  if (!userRes.ok) throw new Error(`GitHub /user: ${userRes.status}`);
  const user = (await userRes.json()) as {
    id: number;
    login: string;
    name: string | null;
    html_url: string;
  };

  let email: string | undefined;
  let emailVerified: boolean | undefined;
  const mailRes = await fetch('https://api.github.com/user/emails', { headers });
  if (mailRes.ok) {
    const mails = (await mailRes.json()) as { email: string; primary: boolean; verified: boolean }[];
    const primary = mails.find((m) => m.primary) ?? mails[0];
    email = primary?.email;
    emailVerified = primary?.verified;
  }

  return {
    issuer: 'https://github.com',
    // The numeric id rather than the login – a login name can change.
    subject: String(user.id),
    displayName: user.name ?? user.login,
    email,
    emailVerified,
    claims: {
      id: user.id,
      login: user.login,
      name: user.name,
      profile: user.html_url,
      email,
      email_verified: emailVerified,
    },
  };
}

export const providers: ProviderDefinition[] = [
  {
    id: 'unibe',
    section: 'primary',
    label: 'UniBE',
    group: 'direct',
    protocol: 'oidc',
    status: 'available',
    envPrefix: 'ENTRA_UNIBE',
    scope: 'openid profile email',
    issuer: () => {
      const tid = env('ENTRA_UNIBE_TENANT_ID') ?? UNIBE_TENANT_ID;
      return `https://login.microsoftonline.com/${tid}/v2.0`;
    },
    identity: 'entra-oid',
    linkParams: { prompt: 'select_account' },
  },
  {
    id: 'microsoft',
    section: 'other',
    label: 'Microsoft',
    group: 'direct',
    protocol: 'oidc',
    status: 'available',
    envPrefix: 'MICROSOFT',
    scope: 'openid profile email',
    // For "{tenantid}", openid-client inserts the expected issuer URL from the tid claim.
    issuer: () => 'https://login.microsoftonline.com/common/v2.0',
    identity: 'entra-oid',
    authParams: { prompt: 'select_account' },
  },
  {
    id: 'switch',
    section: 'academic',
    label: 'SWITCH edu-ID',
    group: 'direct',
    protocol: 'oidc',
    status: 'available',
    envPrefix: 'SWITCH',
    scope: 'openid profile email',
    issuer: () => 'https://login.eduid.ch/',
  },
  {
    id: 'orcid',
    section: 'academic',
    label: 'ORCID',
    group: 'direct',
    protocol: 'oidc',
    status: 'available',
    envPrefix: 'ORCID',
    scope: 'openid',
    issuer: () => env('ORCID_ISSUER') ?? 'https://orcid.org',
  },
  {
    id: 'agov',
    section: 'other',
    label: 'AGOV',
    group: 'direct',
    protocol: 'oidc',
    status: 'pending',
    envPrefix: 'AGOV',
    scope: 'openid profile email',
    issuer: () => env('AGOV_ISSUER'),
  },
  {
    id: 'google',
    section: 'other',
    label: 'Google',
    group: 'direct',
    protocol: 'oidc',
    status: 'available',
    envPrefix: 'GOOGLE',
    scope: 'openid profile email',
    issuer: () => 'https://accounts.google.com',
    linkParams: { prompt: 'select_account' },
  },
  {
    id: 'apple',
    section: 'other',
    label: 'Apple',
    group: 'direct',
    protocol: 'oidc',
    status: 'deferred',
    envPrefix: 'APPLE',
    scope: 'openid name email',
    issuer: () => 'https://appleid.apple.com',
  },
  {
    id: 'github',
    section: 'other',
    label: 'GitHub',
    group: 'direct',
    protocol: 'oauth2',
    status: 'available',
    envPrefix: 'GITHUB',
    scope: 'read:user user:email',
    oauth2: {
      // GitHub sends iss=https://github.com/login/oauth in the callback (RFC 9207, since April 2026),
      // and openid-client checks it against this value. The stored identity keeps the issuer
      // https://github.com (fetchGitHubProfile), so existing links stay valid.
      issuer: 'https://github.com/login/oauth',
      authorizationEndpoint: 'https://github.com/login/oauth/authorize',
      tokenEndpoint: 'https://github.com/login/oauth/access_token',
      fetchProfile: fetchGitHubProfile,
    },
    linkParams: { prompt: 'select_account' },
  },
  {
    id: 'meta',
    section: 'other',
    label: 'Meta (Facebook)',
    group: 'direct',
    protocol: 'oauth2',
    status: 'deferred',
    envPrefix: 'META',
    scope: 'public_profile email',
  },
  {
    id: 'external-id',
    section: 'other',
    label: 'UniBE External ID',
    group: 'broker',
    protocol: 'oidc',
    status: 'available',
    envPrefix: 'EXTERNAL_ID',
    scope: 'openid profile email',
    // Discovery has to use the tenant-id host: the issuer is {tid}.ciamlogin.com,
    // not unibeeid.ciamlogin.com – otherwise the issuer check fails.
    issuer: () => {
      const tid = env('EXTERNAL_ID_TENANT_ID') ?? EXTERNAL_ID_TENANT_ID;
      return `https://${tid}.ciamlogin.com/${tid}/v2.0`;
    },
    identity: 'entra-oid',
    linkParams: { prompt: 'login' },
  },
];

export function getProvider(id: string | undefined): ProviderDefinition | undefined {
  return providers.find((p) => p.id === id);
}

export function clientCredentials(p: ProviderDefinition) {
  return {
    clientId: env(`${p.envPrefix}_CLIENT_ID`),
    clientSecret: env(`${p.envPrefix}_CLIENT_SECRET`),
  };
}

/** A provider is usable once it is implemented and fully configured. */
export function isEnabled(p: ProviderDefinition): boolean {
  if (p.status !== 'available') return false;
  const { clientId, clientSecret } = clientCredentials(p);
  if (!clientId || !clientSecret) return false;
  return p.protocol === 'oauth2' ? Boolean(p.oauth2) : Boolean(p.issuer?.());
}
