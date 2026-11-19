declare namespace App {
  interface Locals {
    user?: import('./lib/store').User;
    locale: import('./i18n/ui').Locale;
    theme: import('./lib/prefs').Theme;
  }
  interface SessionData {
    userId: string;
    /** Time of the last successful sign-in (ms), for re-authentication before sensitive actions. */
    lastAuthAt: number;
    /** Issuer and subject of the identity used for the current sign-in. */
    currentIdentity: { issuer: string; subject: string };
    /** Id of the passkey used for the current sign-in, if it was one. */
    currentPasskey: string;
    /** The WebAuthn challenge in progress (registration or sign-in). */
    webauthnChallenge: import('./lib/webauthn').WebAuthnChallenge;
    /** The sign-in or linking transaction in progress. */
    authTx: import('./lib/auth').AuthTransaction;
    /** A one-time message for the next page, as a UI key so it renders in the viewer's language. */
    flash: {
      kind: 'success' | 'info' | 'error';
      key: import('./i18n/ui').UiKey;
      params?: Record<string, string>;
    };
  }
}
