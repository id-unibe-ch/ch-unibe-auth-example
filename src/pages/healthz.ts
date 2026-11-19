import type { APIRoute } from 'astro';

/** Liveness and readiness probe for Container Apps. Deliberately does not query the database. */
export const GET: APIRoute = () => new Response('ok', { headers: { 'Cache-Control': 'no-store' } });
