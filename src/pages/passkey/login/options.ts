import type { APIRoute } from 'astro';
import { json } from '../../../lib/json';
import { authenticationOptions } from '../../../lib/webauthn';

/** Step 1 of signing in with a passkey: a challenge for navigator.credentials.get(). */
export const POST: APIRoute = async ({ session }) => {
  const options = await authenticationOptions();
  session?.set('webauthnChallenge', { challenge: options.challenge, purpose: 'login', createdAt: Date.now() });
  return json(options);
};
