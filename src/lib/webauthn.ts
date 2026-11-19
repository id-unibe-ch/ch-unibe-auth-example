import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { baseUrl } from './config';
import type { NewPasskey, Passkey, User } from './store';

/**
 * The app's own passkeys (WebAuthn, ADR-009), with SimpleWebAuthn.
 *
 * The relying party id is the host of APP_BASE_URL: `localhost` in development,
 * `login-example.campus.cloud` in production. A passkey only works for the RP id it was
 * created for, so passkeys from one environment are not usable in another.
 */

export const CHALLENGE_MAX_AGE_MS = 5 * 60 * 1000;
const RP_NAME = 'UniBE Login Example';

export interface WebAuthnChallenge {
  challenge: string;
  purpose: 'register' | 'login';
  createdAt: number;
}

function rp() {
  const origin = new URL(baseUrl());
  return { rpID: origin.hostname, origin: origin.origin };
}

/** Options for navigator.credentials.create(): a discoverable passkey bound to this user. */
export async function registrationOptions(user: User, accountName: string) {
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rp().rpID,
    // The user handle is the account id; it is stored in the passkey and returned on sign-in.
    userID: new TextEncoder().encode(user.id),
    userName: accountName,
    userDisplayName: user.displayName ?? accountName,
    attestationType: 'none',
    excludeCredentials: user.passkeys.map((p) => ({ id: p.credentialId, transports: p.transports })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });
  return options;
}

/** Verifies the browser's answer to registrationOptions() and returns what to store. */
export async function verifyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string,
  name: string,
): Promise<NewPasskey | undefined> {
  const { rpID, origin } = rp();
  const result = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });
  if (!result.verified) return undefined;
  const info = result.registrationInfo;
  return {
    credentialId: info.credential.id,
    publicKey: info.credential.publicKey,
    counter: info.credential.counter,
    transports: info.credential.transports ?? [],
    deviceType: info.credentialDeviceType,
    backedUp: info.credentialBackedUp,
    name,
  };
}

/** Options for navigator.credentials.get(): no allow list, the browser offers the user's passkeys. */
export async function authenticationOptions() {
  return generateAuthenticationOptions({ rpID: rp().rpID, userVerification: 'required' });
}

/** Verifies a sign-in with a stored passkey; returns the new counter and backup state. */
export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  passkey: Passkey,
) {
  const { rpID, origin } = rp();
  const result = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: {
      id: passkey.credentialId,
      publicKey: passkey.publicKey,
      counter: passkey.counter,
      transports: passkey.transports,
    },
  });
  if (!result.verified) return undefined;
  return { counter: result.authenticationInfo.newCounter, backedUp: result.authenticationInfo.credentialBackedUp };
}

/** The challenge stored in the session, if it is for this purpose and still fresh. */
export function freshChallenge(stored: WebAuthnChallenge | undefined, purpose: WebAuthnChallenge['purpose']) {
  if (!stored || stored.purpose !== purpose || Date.now() - stored.createdAt > CHALLENGE_MAX_AGE_MS) return undefined;
  return stored.challenge;
}
