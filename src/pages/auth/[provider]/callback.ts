import type { APIRoute } from 'astro';
import type { UiKey } from '../../../i18n/ui';
import { completeAuthorization, TX_MAX_AGE_MS } from '../../../lib/auth';
import { getProvider } from '../../../lib/providers';
import { store, type LinkResult } from '../../../lib/store';

const LINK_MESSAGES: Record<LinkResult, { kind: 'success' | 'info' | 'error'; key: UiKey }> = {
  linked: { kind: 'success', key: 'flash.linked' },
  'already-linked': { kind: 'info', key: 'flash.alreadyLinked' },
  conflict: { kind: 'error', key: 'flash.conflict' },
};

export const GET: APIRoute = async ({ params, url, locals, session, redirect }) => {
  const provider = getProvider(params.provider);
  const tx = await session?.get('authTx');
  session?.delete('authTx');

  const fail = (key: UiKey, to = '/') => {
    session?.set('flash', { kind: 'error', key, params: { provider: provider?.label ?? '' } });
    return redirect(to);
  };

  if (!provider) return new Response('Unknown provider', { status: 404 });
  if (!tx || tx.provider !== provider.id || Date.now() - tx.createdAt > TX_MAX_AGE_MS) {
    return fail('flash.expired');
  }

  const back = tx.intent === 'link' ? '/profile' : '/';

  // Cancelled or refused at the IdP (e.g. access_denied).
  const idpError = url.searchParams.get('error');
  if (idpError) {
    console.warn(`[auth] ${provider.id} returned an error: ${idpError}`, url.searchParams.get('error_description'));
    return fail('flash.cancelled', back);
  }

  let profile;
  try {
    profile = await completeAuthorization(provider, tx, url);
  } catch (err) {
    console.error(`[auth] callback from ${provider.id} failed`, err);
    return fail('flash.failed', back);
  }

  // --- Link: attach the identity to the signed-in user ---
  if (tx.intent === 'link') {
    if (!locals.user) return fail('flash.signInFirst');
    const result = await store.linkIdentity(locals.user.id, provider.id, profile);
    session?.set('flash', { ...LINK_MESSAGES[result], params: { provider: provider.label } });
    if (result === 'linked') session?.set('lastAuthAt', Date.now());
    return redirect('/profile');
  }

  // --- Sign-in: existing identity or a new user account ---
  let userId = await store.findUserIdByIdentity(profile.issuer, profile.subject);
  if (userId) {
    await store.recordLogin(provider.id, profile);
  } else {
    userId = (await store.createUser(provider.id, profile)).id;
  }

  // Prevent session fixation: a new session id after a successful sign-in.
  await session?.regenerate();
  session?.set('userId', userId);
  session?.set('lastAuthAt', Date.now());
  session?.set('currentIdentity', { issuer: profile.issuer, subject: profile.subject });
  return redirect('/profile');
};
