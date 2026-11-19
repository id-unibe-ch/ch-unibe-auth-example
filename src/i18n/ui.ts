/**
 * User interface strings, German and English (ADR-017).
 *
 * Every visible text lives here; components look it up with `t(locale, key, params)`.
 * `{name}` in a string is replaced by `params.name`.
 */

export const LOCALES = ['de', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'de';

const de = {
  'site.name': 'Login-Beispiel',
  'site.org': 'Universität Bern',
  'site.footer': 'Demo der Universität Bern – Identität & Zugriff',
  'site.privacy': 'Datenschutz',
  'site.source': 'Quellcode auf GitHub',
  'nav.home': 'Zur Startseite',
  'nav.language': 'Sprache',
  'nav.themeLight': 'Helles Design',
  'nav.themeDark': 'Dunkles Design',
  'nav.signOut': 'Abmelden',

  'login.title': 'Anmelden',
  'login.badge': 'Demo · OpenID Connect & OAuth 2.0',
  'login.heading1': 'Ein Konto.',
  'login.heading2': 'Viele Wege zur Anmeldung.',
  'login.intro':
    'Melde dich mit dem Konto an, das du schon hast. Danach kannst du weitere Konten verknüpfen und siehst genau, welche Daten jeder Anbieter liefert.',
  'login.feature.link.title': 'Konten verknüpfen',
  'login.feature.link.text': 'UniBE, edu-ID, ORCID, GitHub – alles in einem Profil.',
  'login.feature.transparent.title': 'Transparent',
  'login.feature.transparent.text': 'Issuer, Subject und Claims jeder Anmeldung einsehen.',
  'login.feature.passkeys.title': 'Passkeys',
  'login.feature.passkeys.text': 'Ohne Passwort anmelden – mit Fingerabdruck oder Gesicht.',
  'login.choose': 'Wähle, wie du dich anmelden möchtest.',
  'login.unsure': 'Unsicher?',
  'login.helpMeChoose': 'Hilf mir bei der Auswahl',
  'login.section.academic': 'Hochschule & Forschung',
  'login.section.other': 'Weitere Konten',
  'login.or': 'oder',
  'login.passkey': 'Mit Passkey anmelden',
  'login.passkeySoon': 'Mit Passkey anmelden – bald verfügbar',
  'login.comingSoon': 'Bald verfügbar:',
  'login.existing.title': 'Schon ein Konto?',
  'login.existing.text':
    'Melde dich wie gewohnt an und verknüpfe neue Anmeldemethoden in deinem Profil – sonst entsteht ein zweites Konto.',
  'login.signInWith': 'Mit {provider} anmelden',
  'login.notConfigured': 'Nicht konfiguriert',

  'choose.title': 'Anmeldemethode wählen',
  'choose.step1': 'Wer bist du?',
  'choose.step2': 'Anmeldemethode',
  'choose.heading': 'Wie möchtest du dich anmelden?',
  'choose.intro':
    'Wähle, was am besten auf dich zutrifft. Wir schlagen dir die passende Anmeldemethode vor – alle anderen bleiben verfügbar.',
  'choose.recommended': 'Empfohlen für dich',
  'choose.alternatives': 'Oder auch',
  'choose.all': 'Alle Anmeldemethoden anzeigen',
  'choose.pick': 'Wähle oben aus, was auf dich zutrifft.',
  'persona.unibe.title': 'Ich studiere oder arbeite an der Uni Bern',
  'persona.unibe.hint': 'Campus-Account',
  'persona.unibe.why':
    'Dein Campus-Account über den Entra-Tenant der Universität Bern – mit Passkey oder Authenticator.',
  'persona.academic.title': 'Ich bin an einer anderen Hochschule',
  'persona.academic.hint': 'Schweiz oder international',
  'persona.academic.why':
    'Die edu-ID ist die lebenslange Identität für Hochschulangehörige und verbindet sich mit deiner Heimorganisation.',
  'persona.research.title': 'Ich forsche und habe eine ORCID iD',
  'persona.research.hint': 'Forschende',
  'persona.research.why': 'ORCID identifiziert dich unabhängig von Institution und Arbeitgeber.',
  'persona.other.title': 'Keines davon',
  'persona.other.hint': 'Gäste und Öffentlichkeit',
  'persona.other.why':
    'Du bekommst einen Einmalcode per E-Mail. Alternativ mit einem bestehenden Google-, Microsoft- oder GitHub-Konto.',

  'profile.title': 'Profil',
  'profile.since': 'Benutzerkonto seit {date}',
  'profile.stat.accounts': 'verbundene Accounts',
  'profile.stat.account': 'verbundener Account',
  'profile.linked': 'Verbundene Accounts',
  'profile.current': 'Aktuelle Anmeldung',
  'profile.verified': 'verifiziert',
  'profile.unverified': 'nicht verifiziert',
  'profile.linkedAt': 'Verbunden {date}',
  'profile.lastLogin': 'zuletzt angemeldet {date}',
  'profile.unlink': 'Trennen',
  'profile.unlinkLast': 'Der letzte verbundene Account kann nicht getrennt werden.',
  'profile.details': 'Technische Details',
  'profile.protocol': 'Protokoll',
  'profile.path': 'Anbindung',
  'profile.path.direct': 'direkt – die App ist beim Anbieter registriert',
  'profile.path.broker': 'über Entra External ID (Broker) – die App kennt nur External ID',
  'profile.issuer': 'Issuer',
  'profile.subject': 'Subject',
  'profile.method': 'Methode (amr)',
  'profile.claims': 'Gespeicherte Claims',
  'profile.connect': 'Weiteren Account verbinden',
  'profile.connectText': 'Du meldest dich beim Anbieter an und bestätigst so, dass der Account dir gehört.',
  'profile.connectNone': 'Es sind keine weiteren Anbieter konfiguriert.',
  'profile.passkeys': 'Passkeys',
  'profile.passkeysSoon': 'Passkeys für diese Anwendung folgen in Kürze.',
  'profile.how': 'So lief deine Anmeldung',
  'profile.how.1': 'Weiterleitung zu {provider} mit state, nonce und PKCE',
  'profile.how.2': 'Anmeldung beim Anbieter',
  'profile.how.3oidc': 'Code gegen Tokens getauscht, ID-Token geprüft',
  'profile.how.3oauth': 'Code gegen ein Access-Token getauscht, Profil über die API geladen',
  'profile.how.4': 'Identität über Issuer + Subject gefunden',
  'profile.delete': 'Konto löschen',
  'profile.deleteText': 'Entfernt dein Benutzerkonto und alle verbundenen Accounts in dieser Anwendung.',

  'protocol.oidc': 'OpenID Connect (ID-Token)',
  'protocol.oauth2': 'OAuth 2.0 (Profil über API)',

  'provider.unibe.action': 'Mit UniBE-Konto anmelden',
  'provider.unibe.description': 'Mitarbeitende und Studierende',
  'provider.microsoft.description': 'Privat, Arbeit oder Schule',
  'provider.switch.description': 'Hochschulen CH & international',
  'provider.orcid.description': 'Für Forschende',
  'provider.agov.description': 'Staatliches Login der Schweiz',
  'provider.google.description': 'Google-Konto',
  'provider.apple.description': 'Apple-ID',
  'provider.github.description': 'Für Entwickler:innen',
  'provider.meta.description': 'Facebook-Konto',
  'provider.external-id.label': 'E-Mail & mehr',
  'provider.external-id.description': 'Einmalcode via External ID',

  'flash.linked': '{provider}-Account wurde verbunden.',
  'flash.alreadyLinked': 'Dieser {provider}-Account ist bereits verbunden.',
  'flash.conflict': 'Dieser {provider}-Account gehört bereits zu einem anderen Benutzerkonto und wurde nicht verbunden.',
  'flash.unlinked': 'Der Account wurde getrennt.',
  'flash.unlinkNotFound': 'Der Account wurde nicht gefunden.',
  'flash.unlinkLast': 'Der letzte verbundene Account kann nicht getrennt werden – sonst wäre keine Anmeldung mehr möglich.',
  'flash.expired': 'Die Anmeldung ist abgelaufen oder ungültig. Bitte erneut versuchen.',
  'flash.cancelled': '{provider}: Die Anmeldung wurde abgebrochen oder abgelehnt.',
  'flash.failed': 'Die Antwort von {provider} konnte nicht verarbeitet werden.',
  'flash.startFailed': 'Die Anmeldung bei {provider} konnte nicht gestartet werden.',
  'flash.signInFirst': 'Bitte zuerst anmelden.',
} as const;

export type UiKey = keyof typeof de;

const en: Record<UiKey, string> = {
  'site.name': 'Login Example',
  'site.org': 'University of Bern',
  'site.footer': 'A demo by the University of Bern – identity & access',
  'site.privacy': 'Privacy',
  'site.source': 'Source code on GitHub',
  'nav.home': 'To the start page',
  'nav.language': 'Language',
  'nav.themeLight': 'Light theme',
  'nav.themeDark': 'Dark theme',
  'nav.signOut': 'Sign out',

  'login.title': 'Sign in',
  'login.badge': 'Demo · OpenID Connect & OAuth 2.0',
  'login.heading1': 'One account.',
  'login.heading2': 'Many ways to sign in.',
  'login.intro':
    'Sign in with an account you already have. Then link further accounts and see exactly which data each provider sends.',
  'login.feature.link.title': 'Link accounts',
  'login.feature.link.text': 'UniBE, edu-ID, ORCID, GitHub – all in one profile.',
  'login.feature.transparent.title': 'Transparent',
  'login.feature.transparent.text': 'See the issuer, subject and claims of every sign-in.',
  'login.feature.passkeys.title': 'Passkeys',
  'login.feature.passkeys.text': 'Sign in without a password – with your fingerprint or face.',
  'login.choose': 'Choose how you want to sign in.',
  'login.unsure': 'Not sure?',
  'login.helpMeChoose': 'Help me choose',
  'login.section.academic': 'Universities & research',
  'login.section.other': 'Other accounts',
  'login.or': 'or',
  'login.passkey': 'Sign in with a passkey',
  'login.passkeySoon': 'Sign in with a passkey – coming soon',
  'login.comingSoon': 'Coming soon:',
  'login.existing.title': 'Already have an account?',
  'login.existing.text':
    'Sign in as usual and link new sign-in methods in your profile – otherwise a second account is created.',
  'login.signInWith': 'Sign in with {provider}',
  'login.notConfigured': 'Not configured',

  'choose.title': 'Choose a sign-in method',
  'choose.step1': 'Who are you?',
  'choose.step2': 'Sign-in method',
  'choose.heading': 'How would you like to sign in?',
  'choose.intro':
    'Pick what fits you best. We suggest the right sign-in method – all others stay available.',
  'choose.recommended': 'Recommended for you',
  'choose.alternatives': 'Or',
  'choose.all': 'Show all sign-in methods',
  'choose.pick': 'Pick what fits you above.',
  'persona.unibe.title': 'I study or work at the University of Bern',
  'persona.unibe.hint': 'Campus account',
  'persona.unibe.why':
    'Your campus account through the University of Bern’s Entra tenant – with a passkey or the Authenticator app.',
  'persona.academic.title': 'I am at another university',
  'persona.academic.hint': 'Switzerland or abroad',
  'persona.academic.why':
    'The edu-ID is the lifelong identity for members of universities and connects to your home organisation.',
  'persona.research.title': 'I do research and have an ORCID iD',
  'persona.research.hint': 'Researchers',
  'persona.research.why': 'ORCID identifies you independently of institution and employer.',
  'persona.other.title': 'None of these',
  'persona.other.hint': 'Guests and the public',
  'persona.other.why':
    'You get a one-time code by email. Or use an existing Google, Microsoft or GitHub account.',

  'profile.title': 'Profile',
  'profile.since': 'User account since {date}',
  'profile.stat.accounts': 'linked accounts',
  'profile.stat.account': 'linked account',
  'profile.linked': 'Linked accounts',
  'profile.current': 'Current sign-in',
  'profile.verified': 'verified',
  'profile.unverified': 'not verified',
  'profile.linkedAt': 'Linked {date}',
  'profile.lastLogin': 'last signed in {date}',
  'profile.unlink': 'Unlink',
  'profile.unlinkLast': 'The last linked account cannot be unlinked.',
  'profile.details': 'Technical details',
  'profile.protocol': 'Protocol',
  'profile.path': 'Connection',
  'profile.path.direct': 'direct – the app is registered with the provider',
  'profile.path.broker': 'via Entra External ID (broker) – the app only knows External ID',
  'profile.issuer': 'Issuer',
  'profile.subject': 'Subject',
  'profile.method': 'Method (amr)',
  'profile.claims': 'Stored claims',
  'profile.connect': 'Link another account',
  'profile.connectText': 'You sign in with the provider and thereby confirm that the account is yours.',
  'profile.connectNone': 'No further providers are configured.',
  'profile.passkeys': 'Passkeys',
  'profile.passkeysSoon': 'Passkeys for this application are coming soon.',
  'profile.how': 'How your sign-in went',
  'profile.how.1': 'Redirect to {provider} with state, nonce and PKCE',
  'profile.how.2': 'Sign-in at the provider',
  'profile.how.3oidc': 'Code exchanged for tokens, ID token validated',
  'profile.how.3oauth': 'Code exchanged for an access token, profile loaded from the API',
  'profile.how.4': 'Identity found by issuer + subject',
  'profile.delete': 'Delete account',
  'profile.deleteText': 'Removes your user account and all linked accounts in this application.',

  'protocol.oidc': 'OpenID Connect (ID token)',
  'protocol.oauth2': 'OAuth 2.0 (profile from the API)',

  'provider.unibe.action': 'Sign in with your UniBE account',
  'provider.unibe.description': 'Staff and students',
  'provider.microsoft.description': 'Personal, work or school',
  'provider.switch.description': 'Universities in Switzerland & abroad',
  'provider.orcid.description': 'For researchers',
  'provider.agov.description': 'The Swiss government login',
  'provider.google.description': 'Google account',
  'provider.apple.description': 'Apple ID',
  'provider.github.description': 'For developers',
  'provider.meta.description': 'Facebook account',
  'provider.external-id.label': 'Email & more',
  'provider.external-id.description': 'One-time code via External ID',

  'flash.linked': 'Your {provider} account has been linked.',
  'flash.alreadyLinked': 'This {provider} account is already linked.',
  'flash.conflict': 'This {provider} account already belongs to another user account and was not linked.',
  'flash.unlinked': 'The account has been unlinked.',
  'flash.unlinkNotFound': 'The account was not found.',
  'flash.unlinkLast': 'The last linked account cannot be unlinked – otherwise you could no longer sign in.',
  'flash.expired': 'The sign-in has expired or is invalid. Please try again.',
  'flash.cancelled': '{provider}: the sign-in was cancelled or refused.',
  'flash.failed': 'The response from {provider} could not be processed.',
  'flash.startFailed': 'The sign-in with {provider} could not be started.',
  'flash.signInFirst': 'Please sign in first.',
};

const dictionaries: Record<Locale, Record<UiKey, string>> = { de, en };

export function t(locale: Locale, key: UiKey, params: Record<string, string> = {}): string {
  const text = dictionaries[locale][key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => params[name] ?? `{${name}}`);
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** BCP 47 tag for date formatting. */
export function intlLocale(locale: Locale): string {
  return locale === 'de' ? 'de-CH' : 'en-GB';
}

/** A provider's display name: a translated label where one exists, else its brand name. */
export function providerLabel(locale: Locale, provider: { id: string; label: string }): string {
  const key = `provider.${provider.id}.label` as UiKey;
  return key in de ? t(locale, key) : provider.label;
}

/** A provider's one-line description. */
export function providerDescription(locale: Locale, provider: { id: string }): string {
  const key = `provider.${provider.id}.description` as UiKey;
  return key in de ? t(locale, key) : '';
}
