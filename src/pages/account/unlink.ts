import type { APIRoute } from 'astro';
import { store } from '../../lib/store';

export const POST: APIRoute = async ({ request, locals, session, redirect }) => {
  if (!locals.user) return redirect('/');
  const form = await request.formData();
  const identityId = String(form.get('identityId') ?? '');

  const result = await store.unlinkIdentity(locals.user.id, identityId);
  const messages = {
    unlinked: { kind: 'success', message: 'Der Account wurde getrennt.' },
    'not-found': { kind: 'error', message: 'Der Account wurde nicht gefunden.' },
    'last-identity': {
      kind: 'error',
      message: 'Der letzte verbundene Account kann nicht getrennt werden – sonst wäre keine Anmeldung mehr möglich.',
    },
  } as const;
  session?.set('flash', messages[result]);
  return redirect('/profile');
};
