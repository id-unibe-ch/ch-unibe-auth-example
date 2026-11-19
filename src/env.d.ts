declare namespace App {
  interface Locals {
    user?: import('./lib/store').User;
  }
  interface SessionData {
    userId: string;
    /** Zeitpunkt der letzten erfolgreichen Anmeldung (ms), für Re-Auth vor sensiblen Aktionen. */
    lastAuthAt: number;
    /** Laufende Anmelde- bzw. Verknüpfungstransaktion. */
    authTx: import('./lib/auth').AuthTransaction;
    /** Einmalige Meldung für die nächste Seite. */
    flash: { kind: 'success' | 'info' | 'error'; message: string };
  }
}
