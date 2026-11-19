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

/** Maximale Dauer einer Anmeldung beim IdP. */
export const TX_MAX_AGE_MS = 10 * 60 * 1000;

const configCache = new Map<string, Promise<client.Configuration>>();

async function buildConfiguration(p: ProviderDefinition): Promise<client.Configuration> {
  const { clientId, clientSecret } = clientCredentials(p);
  if (!clientId || !clientSecret) throw new Error(`Provider ${p.id} ist nicht konfiguriert`);

  if (p.protocol === 'oauth2') {
    if (!p.oauth2) throw new Error(`Provider ${p.id}: OAuth-2.0-Endpunkte fehlen`);
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
  if (!issuer) throw new Error(`Provider ${p.id}: Issuer fehlt`);
  const url = new URL(issuer);
  // Nur für lokale Tests gegen einen Mock-IdP: HTTP auf localhost erlauben.
  const isLocal = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  return client.discovery(url, clientId, clientSecret, undefined, {
    execute: isLocal && import.meta.env.DEV ? [client.allowInsecureRequests] : [],
  });
}

function getConfiguration(p: ProviderDefinition): Promise<client.Configuration> {
  let cfg = configCache.get(p.id);
  if (!cfg) {
    cfg = buildConfiguration(p);
    // Fehlgeschlagene Discovery nicht dauerhaft cachen.
    cfg.catch(() => configCache.delete(p.id));
    configCache.set(p.id, cfg);
  }
  return cfg;
}

/** Erzeugt die Transaktion und die URL, zu der der Browser umgeleitet wird. */
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
 * Verarbeitet den Callback: tauscht den Code, validiert das ID-Token (OIDC)
 * bzw. holt das Profil über die API (OAuth 2.0) und normalisiert das Ergebnis.
 */
export async function completeAuthorization(
  p: ProviderDefinition,
  tx: AuthTransaction,
  requestUrl: URL,
): Promise<ProviderProfile> {
  const config = await getConfiguration(p);

  // Hinter dem Ingress von Container Apps kommt die Anfrage intern per HTTP an.
  // Für die Prüfung muss die URL der registrierten Redirect-URI entsprechen.
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
  if (!claims) throw new Error(`Provider ${p.id}: kein ID-Token erhalten`);
  const c = claims as Record<string, unknown>;

  let subject = claims.sub;
  if (p.identity === 'entra-oid') {
    // Entra: oid ist über alle Apps eines Tenants stabil, sub ist pro App paarweise.
    if (typeof c.oid !== 'string') throw new Error(`Provider ${p.id}: oid-Claim fehlt`);
    subject = c.oid;
  }

  return {
    // Bei Entra (common) ist claims.iss bereits die tenant-spezifische, validierte Issuer-URL.
    issuer: claims.iss,
    subject,
    displayName: (c.name as string | undefined) ?? (c.preferred_username as string | undefined),
    email: c.email as string | undefined,
    emailVerified: typeof c.email_verified === 'boolean' ? c.email_verified : undefined,
    claims: pickClaims(c),
  };
}
