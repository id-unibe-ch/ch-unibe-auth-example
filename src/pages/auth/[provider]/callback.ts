import type { APIRoute } from 'astro';
import { completeAuthorization, TX_MAX_AGE_MS } from '../../../lib/auth';
import { getProvider } from '../../../lib/providers';
import { store } from '../../../lib/store';

export const GET: APIRoute = async ({ params, url, locals, session, redirect }) => {
  const provider = getProvider(params.provider);
  const tx = await session?.get('authTx');
  session?.delete('authTx');

  const fail = (message: string, to = '/') => {
    session?.set('flash', { kind: 'error', message });
    return redirect(to);
  };

  if (!provider) return new Response('Unbekannter Provider', { status: 404 });
  if (!tx || tx.provider !== provider.id || Date.now() - tx.createdAt > TX_MAX_AGE_MS) {
    return fail('Die Anmeldung ist abgelaufen oder ungültig. Bitte erneut versuchen.');
  }

  const back = tx.intent === 'link' ? '/profile' : '/';

  // Abbruch oder Fehler beim IdP (z. B. access_denied).
  const idpError = url.searchParams.get('error');
  if (idpError) {
    console.warn(`[auth] ${provider.id} meldet Fehler: ${idpError}`, url.searchParams.get('error_description'));
    return fail(`${provider.label}: Die Anmeldung wurde abgebrochen oder abgelehnt.`, back);
  }

  let profile;
  try {
    profile = await completeAuthorization(provider, tx, url);
  } catch (err) {
    console.error(`[auth] Callback von ${provider.id} fehlgeschlagen`, err);
    return fail(`Die Antwort von ${provider.label} konnte nicht verarbeitet werden.`, back);
  }

  // --- Verknüpfen: Identität dem eingeloggten Benutzer zuordnen ---
  if (tx.intent === 'link') {
    if (!locals.user) return fail('Bitte zuerst anmelden.');
    const result = await store.linkIdentity(locals.user.id, provider.id, profile);
    const messages = {
      linked: { kind: 'success', message: `${provider.label}-Account wurde verbunden.` },
      'already-linked': { kind: 'info', message: `Dieser ${provider.label}-Account ist bereits verbunden.` },
      conflict: {
        kind: 'error',
        message: `Dieser ${provider.label}-Account gehört bereits zu einem anderen Benutzerkonto und wurde nicht verbunden.`,
      },
    } as const;
    session?.set('flash', messages[result]);
    if (result === 'linked') session?.set('lastAuthAt', Date.now());
    return redirect('/profile');
  }

  // --- Anmelden: bestehende Identität oder neues Benutzerkonto ---
  let userId = await store.findUserIdByIdentity(profile.issuer, profile.subject);
  if (userId) {
    await store.recordLogin(provider.id, profile);
  } else {
    userId = (await store.createUser(provider.id, profile)).id;
  }

  // Session-Fixation verhindern: neue Session-ID nach erfolgreicher Anmeldung.
  await session?.regenerate();
  session?.set('userId', userId);
  session?.set('lastAuthAt', Date.now());
  return redirect('/profile');
};
