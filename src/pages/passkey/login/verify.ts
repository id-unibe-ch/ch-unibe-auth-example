import type { APIRoute } from 'astro';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { json, jsonError, readJson } from '../../../lib/json';
import { store } from '../../../lib/store';
import { freshChallenge, verifyAuthentication } from '../../../lib/webauthn';

/** Step 2 of signing in with a passkey: verify the signature with the stored public key. */
export const POST: APIRoute = async ({ request, session }) => {
  const body = await readJson(request);
  const challenge = freshChallenge(await session?.get('webauthnChallenge'), 'login');
  session?.delete('webauthnChallenge');
  const response = body?.response as AuthenticationResponseJSON | undefined;
  if (!response?.id || !challenge) return jsonError('passkey.error.expired');

  // The credential id identifies the passkey and thereby the account.
  const found = await store.findPasskey(response.id);
  if (!found) return jsonError('passkey.error.unknown');

  let result;
  try {
    result = await verifyAuthentication(response, challenge, found.passkey);
  } catch (err) {
    console.error('[passkey] sign-in failed', err);
    return jsonError('passkey.error.failed');
  }
  if (!result) return jsonError('passkey.error.failed');
  await store.recordPasskeyUse(found.passkey.id, result.counter, result.backedUp);

  // Prevent session fixation: a new session id after a successful sign-in.
  await session?.regenerate();
  session?.set('userId', found.userId);
  session?.set('lastAuthAt', Date.now());
  session?.set('currentPasskey', found.passkey.id);
  session?.delete('currentIdentity');
  return json({ ok: true, redirect: '/profile' });
};
