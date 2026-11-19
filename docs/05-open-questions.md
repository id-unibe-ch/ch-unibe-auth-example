# 05 – Offene Fragen

| # | Thema | Frage | Verantwortlich | Status |
|---|---|---|---|---|
| 1 | AGOV | Zugang, Onboarding-Prozess und Vertrag mit dem Bund; welche Attribute und Vertrauensstufen (LoA) stehen zur Verfügung? Gibt es eine Testumgebung? | – | offen |
| 2 | External ID | Welches bestehende Directory genau (External Tenant / CIAM)? Wer administriert es? Dürfen wir dort eine App-Registrierung und User Flows für die Demo anlegen? | – | offen |
| 3 | External ID | Sind Apple, Facebook und Passkeys im bestehenden Directory verfügbar bzw. aktivierbar? | – | offen |
| 4 | SWITCH | Bestehende OIDC-Anbindung wiederverwenden oder eigene Ressource registrieren? Welche Attribute werden freigegeben? Getrennte Buttons für edu-ID und SWITCHaai nötig? | – | offen |
| 5 | Apple | Gibt es einen Apple-Developer-Account der UniBE, unter dem die Services ID angelegt werden kann? | – | offen |
| 6 | Meta | Meta-App unter welchem Business-Account? Ist eine Business-Verifizierung bzw. ein App-Review nötig? | – | offen |
| 7 | GitHub | OAuth App oder GitHub App, unter welcher Organisation? | – | offen |
| 8 | Entra UniBE | Soll die Profilansicht Rollen/Affiliations zeigen (Mitarbeitende vs. Studierende)? Falls ja: über welche Claims bzw. Gruppen? | – | offen |
| 9 | Linking | Konflikt: Was passiert, wenn ein zu verbindender Account bereits zu einem anderen Benutzerkonto gehört? Vorschlag: ablehnen mit Hinweis, sich mit jenem Konto anzumelden und es zu löschen bzw. dort zu trennen. Alternative: geführte Kontozusammenführung mit Besitznachweis beider Konten. | – | offen |
| 10 | Linking | Sollen bei der Anmeldung mit einem neuen Provider Hinweise erscheinen («Haben Sie schon ein Konto? Dann melden Sie sich zuerst an und verbinden Sie diesen Account im Profil»)? | – | offen |
| 11 | Domain | Produktive Domain (wichtig für Redirect-URIs, Apple-Domainverifizierung, Passkey-RP-ID)? | – | offen |
| 12 | Datenschutz | Welche Claims dürfen gespeichert werden; Aufbewahrungsdauer; automatische Löschung inaktiver Demo-Konten (z. B. nach 90 Tagen); Datenschutzhinweis auf der Seite. | – | offen |
| 13 | Zielgruppe | Ist die Seite öffentlich (jede:r kann sich anmelden) oder nur intern erreichbar? | – | offen |
| 14 | Sprache | Nur Deutsch oder auch Englisch (i18n)? | – | offen |
| 15 | Betrieb | Infrastructure as Code (Bicep vs. Terraform)? CI/CD über GitHub Actions mit OIDC-Federation nach Azure? | – | offen |
| 16 | Kosten | Kaltstart durch Scale-to-Zero und Auto-Pause der DB akzeptabel? Siehe [06](06-hosting-and-data.md). | – | offen |

## Erledigt

| Thema | Ergebnis |
|---|---|
| eduGAIN | Nicht nötig, über SWITCHaai/OIDC abgedeckt ([ADR-007](02-decisions.md)) |
| Automatischer Merge | Entfällt, nur manuelles Verknüpfen ([ADR-005](02-decisions.md)) |
| Microsoft-Tenants | Alle Tenants plus persönliche Konten ([ADR-006](02-decisions.md)) |
| Zusätzliche IdPs | ORCID und Apple aufgenommen, Passkeys umgesetzt ([ADR-008](02-decisions.md), [ADR-009](02-decisions.md)) |
| Direkt vs. Broker | Beide Wege werden gezeigt ([ADR-003](02-decisions.md)) |
