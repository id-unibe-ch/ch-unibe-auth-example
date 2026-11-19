import type { APIRoute } from 'astro';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { json, jsonError, readJson } from '../../../lib/json';
import { store } from '../../../lib/store';
import { freshChallenge, verifyRegistration } from '../../../lib/webauthn';

/** Step 2 of adding a passkey: verify the authenticator's answer and store the public key. */
export const POST: APIRoute = async ({ request, locals, session }) => {
  const user = locals.user;
  if (!user) return jsonError('passkey.error.signIn', 401);
  const body = await readJson(request);
  const challenge = freshChallenge(await session?.get('webauthnChallenge'), 'register');
  session?.delete('webauthnChallenge');
  if (!body?.response || !challenge) return jsonError('passkey.error.expired');

  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 100) : 'Passkey';
  try {
    const passkey = await verifyRegistration(body.response as RegistrationResponseJSON, challenge, name);
    if (!passkey) return jsonError('passkey.error.failed');
    if (await store.findPasskey(passkey.credentialId)) return jsonError('passkey.error.exists');
    await store.addPasskey(user.id, passkey);
  } catch (err) {
    console.error('[passkey] registration failed', err);
    return jsonError('passkey.error.failed');
  }
  session?.set('flash', { kind: 'success', key: 'flash.passkeyAdded', params: { name } });
  return json({ ok: true, redirect: '/profile' });
};
