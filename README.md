# Welcher Müll?

`waste-guide` ist eine eigenständige, öffentliche MilosApps-Nachschlage-App für
private Haushalte. Sie gibt kurze, quellenbasierte Entsorgungshinweise, erklärt
den Grund und kennzeichnet regionale Unsicherheit sichtbar. Konto, Standort und
Nutzerdatenbank sind nicht nötig.

## DEV-Stand

- Inhaltsversion: `2026.07.30-1`, Stand 30.07.2026
- 35 redaktionelle Einträge und 17 amtliche oder kommunale Quellen
- allgemeiner Geltungsbereich: private Haushalte in Deutschland
- belegte regionale Ergänzungen: Berlin, Hamburg und München
- Plattformen: Web, Smartphone/PWA und Desktop
- Production: nicht freigegeben

Der lokale DEV- und E2E-Port ist fest auf `4318` reserviert:

```text
App:         http://127.0.0.1:4318/
Readiness:   http://127.0.0.1:4318/healthz
```

Der Start bricht bei einer Portkollision ab. E2E darf einen bestehenden Dienst
nur wiederverwenden, wenn `/healthz` vorher exakt `appKey: "waste-guide"`,
`environment: "DEV"` und `productionApproved: false` bestätigt. Ein bloßes
HTTP 200 genügt nicht; fremde Server werden nie beendet.

## Lokal starten

Voraussetzungen sind Node.js 20 oder neuer und pnpm:

```powershell
pnpm install
pnpm dev
```

Es gibt keinen Build-Schritt und keine Laufzeitabhängigkeit. Der kleine
Node-Server liefert statische ES-Module, JSON-Daten, Manifest, Service Worker
und einen app-spezifischen Healthcheck aus.

## Prüfen

```powershell
pnpm test
pnpm test:e2e
pnpm test:sources:online
pnpm test:all
```

`test` prüft Inhalt, Quellenvertrag, Suche, Synonyme, Tippfehler und lokale
Speicherung. `test:e2e` nutzt ein lokal installiertes Chrome oder Edge auf Port
4318. `test:sources:online` ruft alle katalogisierten amtlichen Quellen live ab.
Screenshots aus E2E-Läufen landen ignoriert unter `test-results/qa/`.

## Daten und Aufbau

- `public/data/waste-items.v1.json`: versionierbarer redaktioneller Bestand
- `public/data/sources.v1.json`: Quelle, Geltung, Prüfung, Lizenz, Attribution
- `public/data/regions.v1.json`: optionale grobe Regionen und belegte Overrides
- `src/search.js`: deutsche Normalisierung, gewichtete Suche und
  Tippfehlertoleranz
- `src/storage.js`: datensparsame, optionale lokale Speicherung
- `meta.json`: Portal- und DEV-Metadaten

Fehlt eine Quelle oder ist ihre erneute Prüfung fällig, wird der betroffene
Hinweis nicht als scheinbar sichere Tonnenregel ausgegeben. Standort bleibt
immer optional.

## Dokumentation

- [Produktbrief](docs/PRODUCT_BRIEF.md)
- [Architektur](docs/ARCHITECTURE.md)
- [Quellen und Lizenzen](docs/SOURCES_AND_LICENSES.md)
- [QA-Plan](docs/QA_PLAN.md)
- [QA-Bericht](docs/QA_REPORT.md)
- [DEV- und Portal-Übergabe](docs/DEV_HANDOFF.md)
- [Erkenntnisse](docs/LEARNINGS.md)
