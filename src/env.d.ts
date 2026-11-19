declare namespace App {
  interface Locals {
    user?: import('./lib/store').User;
  }
  interface SessionData {
    userId: string;
    /** Time of the last successful sign-in (ms), for re-authentication before sensitive actions. */
    lastAuthAt: number;
    /** The sign-in or linking transaction in progress. */
    authTx: import('./lib/auth').AuthTransaction;
    /** A one-time message for the next page (UI text, German). */
    flash: { kind: 'success' | 'info' | 'error'; message: string };
  }
}
