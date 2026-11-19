# 05 – Open questions

| # | Topic | Question | Owner | Status |
|---|---|---|---|---|
| 1 | AGOV | Access, onboarding process and agreement with the federal administration; which attributes and levels of assurance are available? Is there a test environment? | – | open |
| 2 | External ID | Which providers do we enable in the `unibeeid` directory for the demo (Google, email one-time passcode, passkeys)? Apple and Facebook are out for now (no Developer or Business account). | – | open |
| 3 | SWITCH | Reuse the existing OIDC connection or register a resource of our own? Which attributes are released? Separate buttons for edu-ID and SWITCHaai? | – | open |
| 4 | GitHub | OAuth App or GitHub App, under which organisation? | – | open |
| 5 | Entra UniBE | Should the profile show roles or affiliations (staff vs. students)? If so, from which claims or groups? | – | open |
| 6 | Linking | Conflict: what happens when the account being linked already belongs to another user account? Proposal: refuse, and tell the user to sign in with that account and delete it or unlink it there. Alternative: a guided merge with proof of ownership of both accounts. | – | "refuse" implemented, to be confirmed |
| 7 | Linking | Should signing in with a new provider show a hint ("Already have an account? Sign in first and link this account in your profile")? | – | hint on the sign-in page implemented, to be confirmed |
| 8 | Data protection | Which claims may be stored; retention period; automatic deletion of inactive demo accounts (e.g. after 90 days); privacy notice on the site. | – | open |
| 9 | Audience | Is the site public (anyone can sign in) or reachable internally only? | – | open |
| 10 | Language | Is the user interface German only, or bilingual German/English (i18n)? | – | open |
| 11 | Apple/Meta | Who could apply for an Apple Developer or Meta Business account for UniBE, should these methods be shown later? | – | open |

## Resolved

| Topic | Outcome |
|---|---|
| eduGAIN | Not needed, covered by SWITCHaai/OIDC ([ADR-007](02-decisions.md)) |
| Automatic merge | Dropped, manual linking only ([ADR-005](02-decisions.md)) |
| Microsoft tenants | All tenants plus personal accounts ([ADR-006](02-decisions.md)) |
| Additional IdPs | ORCID and Apple added (Apple deferred), passkeys to be implemented ([ADR-008](02-decisions.md), [ADR-009](02-decisions.md)) |
| Direct vs. broker | Both paths are shown ([ADR-003](02-decisions.md)) |
| External ID | Directory `unibeeid.onmicrosoft.com` (`a791c572-76d6-4480-83df-b81dcdb92f69`), app registrations allowed |
| Apple | Deferred – no Apple Developer account ([ADR-008](02-decisions.md)) |
| Meta | Deferred – no Meta Business account ([ADR-012](02-decisions.md)) |
| Domain | `login-example.campus.cloud` ([ADR-013](02-decisions.md)) |
| Hosting and costs | Container Apps always on + Azure SQL Basic, about CHF 10/month ([ADR-011](02-decisions.md)) |
| Data access | `mssql` with SQL migrations, no ORM ([ADR-014](02-decisions.md)) |
| Infrastructure and CI/CD | Bicep, GitHub Actions with OIDC federation, image in GHCR, Key Vault filled from GitHub secrets ([ADR-015](02-decisions.md), [08](08-deployment.md)) |
| Repository language | English throughout, UI German for now ([ADR-016](02-decisions.md)) |
