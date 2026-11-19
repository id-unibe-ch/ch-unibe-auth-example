import type { APIRoute } from 'astro';
import { store } from '../../lib/store';

export const POST: APIRoute = async ({ locals, session, redirect }) => {
  if (locals.user) await store.deleteUser(locals.user.id);
  session?.destroy();
  return redirect('/');
};
