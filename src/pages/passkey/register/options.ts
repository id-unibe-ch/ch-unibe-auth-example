import type { APIRoute } from 'astro';
import { json, jsonError } from '../../../lib/json';
import { registrationOptions } from '../../../lib/webauthn';

/** Step 1 of adding a passkey: the options for navigator.credentials.create(). Signed-in users only. */
export const POST: APIRoute = async ({ locals, session }) => {
  const user = locals.user;
  if (!user) return jsonError('passkey.error.signIn', 401);
  // A name the authenticator shows next to the passkey: the first email, else the display name.
  const accountName = user.identities.find((i) => i.email)?.email ?? user.displayName ?? 'UniBE Login Example';
  const options = await registrationOptions(user, accountName);
  session?.set('webauthnChallenge', { challenge: options.challenge, purpose: 'register', createdAt: Date.now() });
  return json(options);
};
