import type { APIRoute } from 'astro';
import { isLocale } from '../i18n/ui';
import { LOCALE_COOKIE, safeNext, setPreference, THEME_COOKIE } from '../lib/prefs';

/**
 * Switches the language (?lang=de|en) or the theme (?theme=dark|light) and returns
 * to ?next=. A plain link, so it works without JavaScript.
 */
export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const secure = url.protocol === 'https:';
  const lang = url.searchParams.get('lang');
  const theme = url.searchParams.get('theme');
  if (isLocale(lang)) setPreference(cookies, LOCALE_COOKIE, lang, secure);
  if (theme === 'dark' || theme === 'light') setPreference(cookies, THEME_COOKIE, theme, secure);
  return redirect(safeNext(url.searchParams.get('next')));
};
