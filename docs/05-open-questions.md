# 05 – Offene Fragen

| # | Thema | Frage | Verantwortlich | Status |
|---|---|---|---|---|
| 1 | AGOV | Zugang, Onboarding-Prozess und Vertrag mit dem Bund; welche Attribute und Vertrauensstufen (LoA) stehen zur Verfügung? Gibt es eine Testumgebung? | – | offen |
| 2 | External ID | Welche Provider aktivieren wir im Directory `unibeeid` für die Demo (Google, E-Mail-OTP, Passkeys)? Apple und Facebook entfallen vorerst (kein Developer- bzw. Business-Account). | – | offen |
| 3 | SWITCH | Bestehende OIDC-Anbindung wiederverwenden oder eigene Ressource registrieren? Welche Attribute werden freigegeben? Getrennte Buttons für edu-ID und SWITCHaai nötig? | – | offen |
| 4 | GitHub | OAuth App oder GitHub App, unter welcher Organisation? | – | offen |
| 5 | Entra UniBE | Soll die Profilansicht Rollen/Affiliations zeigen (Mitarbeitende vs. Studierende)? Falls ja: über welche Claims bzw. Gruppen? | – | offen |
| 6 | Linking | Konflikt: Was passiert, wenn ein zu verbindender Account bereits zu einem anderen Benutzerkonto gehört? Vorschlag: ablehnen mit Hinweis, sich mit jenem Konto anzumelden und es zu löschen bzw. dort zu trennen. Alternative: geführte Kontozusammenführung mit Besitznachweis beider Konten. | – | Vorschlag «ablehnen» umgesetzt, zu bestätigen |
| 7 | Linking | Sollen bei der Anmeldung mit einem neuen Provider Hinweise erscheinen («Haben Sie schon ein Konto? Dann melden Sie sich zuerst an und verbinden Sie diesen Account im Profil»)? | – | Hinweis auf Login-Seite umgesetzt, zu bestätigen |
| 8 | Datenschutz | Welche Claims dürfen gespeichert werden; Aufbewahrungsdauer; automatische Löschung inaktiver Demo-Konten (z. B. nach 90 Tagen); Datenschutzhinweis auf der Seite. | – | offen |
| 9 | Zielgruppe | Ist die Seite öffentlich (jede:r kann sich anmelden) oder nur intern erreichbar? | – | offen |
| 10 | Sprache | Nur Deutsch oder auch Englisch (i18n)? | – | offen |
| 11 | Apple/Meta | Wer könnte einen Apple-Developer- bzw. Meta-Business-Account für die UniBE beantragen, falls diese Methoden später gezeigt werden sollen? | – | offen |

## Erledigt

| Thema | Ergebnis |
|---|---|
| eduGAIN | Nicht nötig, über SWITCHaai/OIDC abgedeckt ([ADR-007](02-decisions.md)) |
| Automatischer Merge | Entfällt, nur manuelles Verknüpfen ([ADR-005](02-decisions.md)) |
| Microsoft-Tenants | Alle Tenants plus persönliche Konten ([ADR-006](02-decisions.md)) |
| Zusätzliche IdPs | ORCID und Apple aufgenommen (Apple zurückgestellt), Passkeys werden umgesetzt ([ADR-008](02-decisions.md), [ADR-009](02-decisions.md)) |
| Direkt vs. Broker | Beide Wege werden gezeigt ([ADR-003](02-decisions.md)) |
| External ID | Directory `unibeeid.onmicrosoft.com` (`a791c572-76d6-4480-83df-b81dcdb92f69`), App-Registrierungen erlaubt |
| Apple | Zurückgestellt – kein Apple-Developer-Account ([ADR-008](02-decisions.md)) |
| Meta | Zurückgestellt – kein Meta-Business-Account ([ADR-012](02-decisions.md)) |
| Domain | `login-example.campus.cloud` ([ADR-013](02-decisions.md)) |
| Hosting/Kosten | Container Apps immer an + Azure SQL Basic, ca. CHF 10/Monat ([ADR-011](02-decisions.md)) |
| Datenzugriff | `mssql` mit SQL-Migrationen, ohne ORM ([ADR-014](02-decisions.md)) |
| Infrastructure as Code | Bicep ([08](08-deployment.md)) |
| CI/CD | GitHub Actions mit OIDC-Federation, Image in GHCR, Key Vault aus GitHub-Secrets ([08](08-deployment.md)) |
