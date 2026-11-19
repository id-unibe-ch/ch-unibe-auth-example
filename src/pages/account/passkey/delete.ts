import type { APIRoute } from 'astro';
import type { UiKey } from '../../../i18n/ui';
import { store, type UnlinkResult } from '../../../lib/store';

const MESSAGES: Record<UnlinkResult, { kind: 'success' | 'error'; key: UiKey }> = {
  unlinked: { kind: 'success', key: 'flash.passkeyDeleted' },
  'not-found': { kind: 'error', key: 'flash.unlinkNotFound' },
  'last-identity': { kind: 'error', key: 'flash.unlinkLast' },
};

export const POST: APIRoute = async ({ request, locals, session, redirect }) => {
  if (!locals.user) return redirect('/');
  const form = await request.formData();
  const result = await store.deletePasskey(locals.user.id, String(form.get('passkeyId') ?? ''));
  session?.set('flash', MESSAGES[result]);
  return redirect('/profile');
};
