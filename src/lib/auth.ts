import * as client from 'openid-client';
import { baseUrl, redirectUri } from './config';
import {
  clientCredentials,
  pickClaims,
  type ProviderDefinition,
  type ProviderProfile,
} from './providers';

export interface AuthTransaction {
  provider: string;
  intent: 'login' | 'link';
  state: string;
  nonce?: string;
  codeVerifier: string;
  createdAt: number;
}

/** Maximum duration of a sign-in at the IdP. */
export const TX_MAX_AGE_MS = 10 * 60 * 1000;

const configCache = new Map<string, Promise<client.Configuration>>();

async function buildConfiguration(p: ProviderDefinition): Promise<client.Configuration> {
  const { clientId, clientSecret } = clientCredentials(p);
  if (!clientId || !clientSecret) throw new Error(`Provider ${p.id} is not configured`);

  if (p.protocol === 'oauth2') {
    if (!p.oauth2) throw new Error(`Provider ${p.id}: OAuth 2.0 endpoints missing`);
    return new client.Configuration(
      {
        issuer: p.oauth2.issuer,
        authorization_endpoint: p.oauth2.authorizationEndpoint,
        token_endpoint: p.oauth2.tokenEndpoint,
      },
      clientId,
      clientSecret,
    );
  }

  const issuer = p.issuer?.();
  if (!issuer) throw new Error(`Provider ${p.id}: issuer missing`);
  const url = new URL(issuer);
  // Local tests against a mock IdP only: allow HTTP on localhost.
  const isLocal = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  return client.discovery(url, clientId, clientSecret, undefined, {
    execute: isLocal && import.meta.env.DEV ? [client.allowInsecureRequests] : [],
  });
}

function getConfiguration(p: ProviderDefinition): Promise<client.Configuration> {
  let cfg = configCache.get(p.id);
  if (!cfg) {
    cfg = buildConfiguration(p);
    // Do not cache a failed discovery.
    cfg.catch(() => configCache.delete(p.id));
    configCache.set(p.id, cfg);
  }
  return cfg;
}

/** Creates the transaction and the URL the browser is redirected to. */
export async function startAuthorization(
  p: ProviderDefinition,
  intent: AuthTransaction['intent'],
): Promise<{ url: URL; tx: AuthTransaction }> {
  const config = await getConfiguration(p);
  const codeVerifier = client.randomPKCECodeVerifier();
  const tx: AuthTransaction = {
    provider: p.id,
    intent,
    state: client.randomState(),
    nonce: p.protocol === 'oidc' ? client.randomNonce() : undefined,
    codeVerifier,
    createdAt: Date.now(),
  };

  const params: Record<string, string> = {
    redirect_uri: redirectUri(p.id),
    scope: p.scope,
    state: tx.state,
    code_challenge: await client.calculatePKCECodeChallenge(codeVerifier),
    code_challenge_method: 'S256',
    ...p.authParams,
    ...(intent === 'link' ? p.linkParams : {}),
  };
  if (tx.nonce) params.nonce = tx.nonce;

  return { url: client.buildAuthorizationUrl(config, params), tx };
}

/**
 * Processes the callback: exchanges the code, validates the ID token (OIDC)
 * or fetches the profile from the API (OAuth 2.0), and normalises the result.
 */
export async function completeAuthorization(
  p: ProviderDefinition,
  tx: AuthTransaction,
  requestUrl: URL,
): Promise<ProviderProfile> {
  const config = await getConfiguration(p);

  // Behind the Container Apps ingress the request arrives over plain HTTP.
  // For the check, the URL has to match the registered redirect URI.
  const currentUrl = new URL(requestUrl.pathname + requestUrl.search, baseUrl());

  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: tx.codeVerifier,
    expectedState: tx.state,
    expectedNonce: tx.nonce,
    idTokenExpected: p.protocol === 'oidc',
  });

  if (p.protocol === 'oauth2') {
    return p.oauth2!.fetchProfile(tokens.access_token);
  }

  const claims = tokens.claims();
  if (!claims) throw new Error(`Provider ${p.id}: no ID token received`);
  const c = claims as Record<string, unknown>;

  let subject = claims.sub;
  if (p.identity === 'entra-oid') {
    // Entra: oid is stable across all apps of a tenant, sub is pairwise per app.
    if (typeof c.oid !== 'string') throw new Error(`Provider ${p.id}: oid claim missing`);
    subject = c.oid;
  }

  return {
    // For Entra (common), claims.iss already is the tenant-specific, validated issuer URL.
    issuer: claims.iss,
    subject,
    displayName: (c.name as string | undefined) ?? (c.preferred_username as string | undefined),
    email: c.email as string | undefined,
    emailVerified: typeof c.email_verified === 'boolean' ? c.email_verified : undefined,
    claims: pickClaims(c),
  };
}
