import type { APIRoute } from 'astro';

/** Liveness-/Readiness-Probe für Container Apps. Fragt bewusst keine Datenbank ab. */
export const GET: APIRoute = () => new Response('ok', { headers: { 'Cache-Control': 'no-store' } });
