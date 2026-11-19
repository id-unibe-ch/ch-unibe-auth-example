import type { AstroCookies } from 'astro';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n/ui';

/**
 * The viewer's language and theme, kept in two plain cookies so pages render
 * correctly on the server – no flash of the wrong theme, no JavaScript needed.
 * Neither cookie identifies anyone; both are preferences only.
 */

export type Theme = 'dark' | 'light';
export const LOCALE_COOKIE = 'lang';
export const THEME_COOKIE = 'theme';
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Cookie first, then the browser's Accept-Language, then German. */
export function resolveLocale(cookies: AstroCookies, acceptLanguage: string | null): Locale {
  const fromCookie = cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  for (const part of (acceptLanguage ?? '').split(',')) {
    const tag = part.split(';')[0]?.trim().slice(0, 2).toLowerCase();
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}

/** Dark by default (ADR-017). */
export function resolveTheme(cookies: AstroCookies): Theme {
  return cookies.get(THEME_COOKIE)?.value === 'light' ? 'light' : 'dark';
}

export function setPreference(cookies: AstroCookies, name: string, value: string, secure: boolean) {
  cookies.set(name, value, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax', httpOnly: true, secure });
}

/** Only same-site paths – never an open redirect. */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}
