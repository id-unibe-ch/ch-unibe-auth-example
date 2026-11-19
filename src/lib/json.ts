import type { UiKey } from '../i18n/ui';

/** JSON responses for the passkey endpoints. An error carries a UI key the page translates. */
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const jsonError = (error: UiKey, status = 400) => json({ error }, status);

/**
 * These endpoints take JSON only. A cross-site page cannot send a JSON POST without a CORS
 * preflight, which this app never answers – that, and WebAuthn's own origin binding, is the
 * CSRF protection here (Astro's origin check covers form posts only).
 */
export async function readJson(request: Request): Promise<Record<string, unknown> | undefined> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) return undefined;
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}
