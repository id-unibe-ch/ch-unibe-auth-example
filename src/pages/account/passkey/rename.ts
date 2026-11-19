import type { APIRoute } from 'astro';
import { store } from '../../../lib/store';

export const POST: APIRoute = async ({ request, locals, session, redirect }) => {
  if (!locals.user) return redirect('/');
  const form = await request.formData();
  const id = String(form.get('passkeyId') ?? '');
  const name = String(form.get('name') ?? '').trim().slice(0, 100);
  if (name && (await store.renamePasskey(locals.user.id, id, name))) {
    session?.set('flash', { kind: 'success', key: 'flash.passkeyRenamed', params: { name } });
  }
  return redirect('/profile');
};
