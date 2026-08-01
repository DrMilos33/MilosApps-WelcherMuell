# Welcher Müll?

`waste-guide` ist eine eigenständige, öffentliche MilosApps-Nachschlage-App für
private Haushalte. Sie gibt kurze, quellenbasierte Entsorgungshinweise, erklärt
den Grund und kennzeichnet regionale Unsicherheit sichtbar. Konto, Standort und
Nutzerdatenbank sind nicht nötig.

## DEV-Stand

- Inhaltsversion: `2026.07.30-2`, Stand 30.07.2026
- 46 redaktionelle Einträge und 20 amtliche oder kommunale Quellen
- allgemeiner Geltungsbereich: private Haushalte in Deutschland
- belegte regionale Ergänzungen: Berlin, Hamburg und München
- Plattformen: Web, Smartphone/PWA und Desktop
- sichtbare Fachoberfläche: vollständig Deutsch und Englisch
- öffentlicher App-Rahmen: lokal vendortes `public-app-shell/v2.0.2`
- Production: nicht freigegeben

Der unabhängige öffentliche DEV-Stand ist ohne Portal und ohne Login erreichbar:

```text
App:         https://drmilos33.github.io/MilosApps-WelcherMuell/
Readiness:   https://drmilos33.github.io/MilosApps-WelcherMuell/healthz
Repository:  https://github.com/DrMilos33/MilosApps-WelcherMuell
```

Deploymentquelle ist
`9034b561dec88e33856697adac3877639f47006f`; der getrennte
Pages-Artefaktcommit ist `8e8dfe0f7742a8190a78564bb3a3d2e5b51e3e3c`.
GitHub Pages ist ausschließlich der DEV-Host. Production bleibt nicht
freigegeben.

Der lokale DEV- und E2E-Port bleibt fest auf `4318` reserviert:

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
pnpm test:shell
pnpm test:e2e
pnpm test:sources:online
$env:WASTE_GUIDE_SOURCE_COMMIT=(git rev-parse HEAD)
pnpm build:github-pages:dev
$env:WASTE_GUIDE_REMOTE_URL="https://drmilos33.github.io/MilosApps-WelcherMuell/"
$env:WASTE_GUIDE_EXPECTED_SOURCE_COMMIT=(git rev-parse HEAD)
pnpm test:remote:dev
pnpm test:all
```

`test` prüft Inhalt, Quellenvertrag, DE/EN, Suche, Synonyme, Tippfehler und lokale
Speicherung. `test:shell` prüft Manifest, Vendor-Hashes und Lock mit dem
portablen Shared-Validator. `test:e2e` nutzt ein lokal installiertes Chrome oder Edge auf Port
4318. `test:sources:online` ruft alle katalogisierten amtlichen Quellen live ab.
Screenshots aus E2E-Läufen landen ignoriert unter `test-results/qa/`.
Der Remote-Smoke prüft die echte HTTPS-URL in einem frischen Browserkontext
ohne Cookies, Portalzustand oder Milos-Login.

## Daten und Aufbau

- `public/data/waste-items.v1.json`: versionierbarer redaktioneller Bestand
- `public/data/sources.v1.json`: Quelle, Geltung, Prüfung, Lizenz, Attribution
- `public/data/regions.v1.json`: optionale grobe Regionen und belegte Overrides
- `public/data/locales/en.v1.json`: vollständige englische Fachübersetzung
- `src/search.js`: deutsche Normalisierung, gewichtete Suche und
  Tippfehlertoleranz
- `src/i18n.js`: sichtbare DE/EN-Oberfläche und lokalisierte Kataloge
- `src/storage.js`: datensparsame, optionale lokale Speicherung
- `milos-app.json` und `vendor/milosapps-shell/v2/`: exakt gepinnter,
  lokal ausführbarer App-Rahmen ohne CDN oder Runtimeimport
- `meta.json`: Portal- und DEV-Metadaten

Fehlt eine Quelle oder ist ihre erneute Prüfung fällig, wird der betroffene
Hinweis nicht als scheinbar sichere Tonnenregel ausgegeben. Standort bleibt
immer optional.

Die Suche deckt neben Materialbegriffen auch typische Alltagswörter und
Zusammensetzungen ab, etwa `Gummi`, `Gummiband`, `Haargummi`, `Radiergummi`,
`Staubsaugerbeutel`, `Katzenstreu` und `Kugelschreiber`. Sicherheitsrelevante
Abgrenzungen wie Auto- und Motorradreifen bleiben eigene, vorsichtige Treffer.

## Dokumentation

- [Produktbrief](docs/PRODUCT_BRIEF.md)
- [Architektur](docs/ARCHITECTURE.md)
- [Quellen und Lizenzen](docs/SOURCES_AND_LICENSES.md)
- [QA-Plan](docs/QA_PLAN.md)
- [QA-Bericht](docs/QA_REPORT.md)
- [DEV- und Portal-Übergabe](docs/DEV_HANDOFF.md)
- [DEV-Deployment und Rollback](docs/DEPLOYMENT.md)
- [Erkenntnisse](docs/LEARNINGS.md)
