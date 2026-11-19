# 06 – Hosting und Datenhaltung (Azure)

Vorgabe: Hosting in Azure, möglichst kostengünstig, ohne Wartezeit beim ersten Aufruf. Status: **angenommen** ([ADR-011](02-decisions.md)).

> Preise: Azure-Retail-Preisliste in CHF für Switzerland North, Listenpreise ohne Rabatte, abgefragt am 19.11.2026. Die Sekundenpreise von Container Apps rundet die CHF-Liste auf 0; sie sind aus den USD-Listenpreisen umgerechnet und daher Richtwerte.

## Entscheid

| Baustein | Dienst | Konfiguration | Kosten/Monat (Richtwert) |
|---|---|---|---|
| App | **Azure Container Apps** (Consumption) | 0.25 vCPU / 0.5 GiB, `minReplicas: 1`, `maxReplicas: 1` (siehe Sessions) | ≈ CHF 4 (meist untätig), max. ≈ CHF 12 |
| Datenbank | **Azure SQL Database Basic** | 5 DTU, 2 GB, kein Auto-Pause | ≈ CHF 4.50 |
| Secrets | **Azure Key Vault** (Standard) | Client Secrets, Session-Secret; Zugriff via Managed Identity | wenige Rappen |
| Images | **GitHub Container Registry** | alternativ ACR Basic (≈ CHF 5) | 0 |
| Logs | **Log Analytics** | tiefe Aufbewahrung, Tageslimit | gering |
| Region | **Switzerland North** | Datenhaltung in der Schweiz | – |

**Erwartete Gesamtkosten: ca. CHF 9–17 pro Monat**, realistisch rund CHF 10.

### Warum ohne Scale-to-Zero

Die Seite wird vorgeführt; niemand soll auf das Aufwachen von App (einige Sekunden) und Datenbank (bis ca. 1 Minute) warten. Der Aufpreis gegenüber Scale-to-Zero beträgt nur rund CHF 10 pro Monat.

### Bemerkungen

- Container Apps verrechnet eine laufende, aber untätige Instanz zu einem stark reduzierten Satz. Bei einer Demo-Seite ist das der Normalfall.
- Das monatliche Gratiskontingent von Container Apps gilt pro Subscription. Ist es durch andere Apps aufgebraucht, kommen ca. CHF 3–4 dazu.
- Die Health-Probe (`/healthz`) fragt bewusst keine Datenbank ab.

## Sessions

- **Aktuell (Grundgerüst):** Astro Sessions mit dem Standardtreiber des Node-Adapters (Dateisystem im Container). Funktioniert nur mit genau einer Instanz; Sessions gehen bei Neustart/Deployment verloren.
- **Ziel:** eigener Astro-Session-Treiber auf Azure SQL (Tabelle `SESSION`, siehe [04](04-account-linking.md)). Danach sind mehrere Instanzen möglich. Kein Redis nötig.

## Verworfene Varianten

| Variante | Kosten/Monat | Grund |
|---|---|---|
| Alles mit Scale-to-Zero (Container Apps + SQL Free Offer mit Auto-Pause) | ≈ CHF 0–2 | Wartezeiten bis ca. 1 Minute beim ersten Aufruf |
| Azure SQL Free Offer ohne Auto-Pause | ≈ CHF 175 | Gratiskontingent nach rund einem Tag aufgebraucht, danach serverless-Stundenpreis (CHF 0.52 pro vCore-Stunde, min. 0.5 vCore) |
| Azure SQL Standard S0 | ≈ CHF 13.50 | Leistung von Basic genügt |
| App Service B1 Linux | ≈ CHF 12 | vergleichbar, aber Container Apps ist flexibler und im Leerlauf günstiger |
| Azure Table Storage | < CHF 1 | kein relationales Modell; SQL ist in der UniBE verbreiteter und als Beispiel übertragbarer |
| Cosmos DB Free Tier | 0 | nur ein Free-Tier-Konto pro Subscription, Unique Keys nur pro Partition |
| PostgreSQL Flexible Server B1ms | ≈ CHF 15–20 | teurer ohne Mehrwert für diesen Zweck |

## ORM / Datenzugriff

Offen: Prisma oder Kysely (mit `tedious`) für Azure SQL. Die Anwendung greift über die Schnittstelle `UserStore` (`src/lib/store.ts`) zu; die SQL-Implementierung ersetzt die heutige In-Memory-Variante.
