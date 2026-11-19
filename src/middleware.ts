import { defineMiddleware } from 'astro:middleware';
import { store } from './lib/store';

const PROTECTED = ['/profile', '/account'];

export const onRequest = defineMiddleware(async (context, next) => {
  const userId = await context.session?.get('userId');
  if (userId) {
    context.locals.user = await store.getUser(userId);
    // Session verweist auf gelöschten Benutzer (z. B. nach Neustart des In-Memory-Stores).
    if (!context.locals.user) context.session?.destroy();
  }

  const path = context.url.pathname;
  if (!context.locals.user && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    return context.redirect('/');
  }

  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
  return response;
});
