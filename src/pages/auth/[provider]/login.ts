import type { APIRoute } from 'astro';
import { startAuthorization } from '../../../lib/auth';
import { getProvider, isEnabled } from '../../../lib/providers';

/** Startet Anmeldung (?intent=login) oder Verknüpfung (?intent=link) bei einem Provider. */
export const GET: APIRoute = async ({ params, url, locals, session, redirect }) => {
  const provider = getProvider(params.provider);
  if (!provider || !isEnabled(provider)) {
    return new Response('Unbekannter oder nicht konfigurierter Provider', { status: 404 });
  }

  const intent = url.searchParams.get('intent') === 'link' ? 'link' : 'login';
  if (intent === 'link' && !locals.user) return redirect('/');

  try {
    const { url: target, tx } = await startAuthorization(provider, intent);
    session?.set('authTx', tx);
    return redirect(target.href);
  } catch (err) {
    console.error(`[auth] Start bei ${provider.id} fehlgeschlagen`, err);
    session?.set('flash', {
      kind: 'error',
      message: `Die Anmeldung bei ${provider.label} konnte nicht gestartet werden.`,
    });
    return redirect(intent === 'link' ? '/profile' : '/');
  }
};
