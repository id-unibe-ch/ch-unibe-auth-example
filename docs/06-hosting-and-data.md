# 06 – Hosting und Datenhaltung (Azure)

Vorgabe: Hosting in Azure, möglichst kostengünstig. Status: **Vorschlag** ([ADR-011](02-decisions.md)).

> Die genannten Gratiskontingente und Preise entsprechen dem Stand bei der Erstellung und sind vor dem Entscheid im Azure-Preisrechner zu verifizieren.

## Vorschlag

| Baustein | Dienst | Begründung | Kosten (Richtwert) |
|---|---|---|---|
| App | **Azure Container Apps** (Consumption) | Node-Container, Scale-to-Zero, monatliches Gratiskontingent (vCPU-Sekunden, GiB-Sekunden, Requests) reicht für eine Demo-Seite, Custom Domain mit verwaltetem Zertifikat | ≈ 0 |
| Datenbank | **Azure SQL Database serverless – Free Offer** | Relational (Unique-Constraints für (Issuer, Subject) passen ideal), Auto-Pause, kostenloses Monatskontingent pro Datenbank | ≈ 0 |
| Secrets | **Azure Key Vault** (Standard) | Client Secrets, Apple-`.p8`-Key, Session-Secret; Zugriff via Managed Identity | wenige Rappen |
| Images | **GitHub Container Registry** oder Azure Container Registry (Basic) | GHCR ist kostenlos; ACR Basic kostet ca. CHF 5/Monat | 0–5 |
| Logs | **Log Analytics** mit tiefer Aufbewahrung / Tageslimit | Container-Apps-Umgebung benötigt einen Workspace | gering |
| Region | **Switzerland North** | Datenhaltung in der Schweiz | – |

**Erwartete Gesamtkosten:** im einstelligen Franken-Bereich pro Monat (zuzüglich Apple-Developer-Account, falls nicht vorhanden).

## Sessions

Sessions liegen in derselben Datenbank (Tabelle `SESSION`, siehe [04](04-account-linking.md)). Kein Redis nötig.

## Alternativen Datenhaltung

| Option | Vorteile | Nachteile |
|---|---|---|
| **Azure SQL Free Offer** (Vorschlag) | relational, Constraints, gängig in der UniBE, ORM-Unterstützung | Kaltstart nach Auto-Pause (bis ca. 1 Min.); bei Überschreitung des Kontingents pausiert die DB bis Monatsende oder wird kostenpflichtig (konfigurierbar) |
| **Azure Table Storage** | extrem günstig, kein Kaltstart; (Issuer, Subject) als PartitionKey/RowKey garantiert Eindeutigkeit | kein relationales Modell, Abfragen «alle Identitäten eines Users» erfordern zweite Tabelle/Index |
| **Cosmos DB Free Tier** | kein Kaltstart, Gratiskontingent | nur ein Free-Tier-Konto pro Subscription (evtl. schon belegt), Unique Keys nur pro Partition |
| **PostgreSQL Flexible Server (Burstable B1ms)** | volles Postgres, kein Kaltstart | ca. CHF 15–20/Monat |

## Alternativen App-Hosting

| Option | Bemerkung |
|---|---|
| **Container Apps** (Vorschlag) | Scale-to-Zero, sehr günstig; Kaltstart von wenigen Sekunden |
| App Service (Linux B1) | kein Kaltstart, ca. CHF 12–15/Monat; F1 (gratis) mit starken Einschränkungen |
| Static Web Apps | für SSR-Astro mit Node-Adapter nicht geeignet |

## Kaltstart

Scale-to-Zero (App) und Auto-Pause (DB) können sich addieren. Für eine Demo-Seite vertretbar; bei Präsentationen kann die Seite vorab «aufgeweckt» werden oder `minReplicas: 1` gesetzt werden (dann laufende Kosten).

## ORM / Datenzugriff

Offen: Prisma oder Kysely (mit `tedious`) für Azure SQL. Auswahl zusammen mit dem Datenbank-Entscheid.
