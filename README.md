# Welcher Müll?

`waste-guide` ist eine eigenständige, öffentliche MilosApps-Nachschlage-App für
private Haushalte. Sie gibt kurze, quellenbasierte Entsorgungshinweise, erklärt
den Grund und kennzeichnet regionale Unsicherheit sichtbar. Konto, Standort und
Nutzerdatenbank sind nicht nötig.

## DEV-Stand

- Inhaltsversion: `2026.08.03-1`, Stand 03.08.2026
- 49 redaktionelle Einträge und 22 amtliche oder kommunale Quellen
- allgemeiner Geltungsbereich: private Haushalte in Deutschland
- belegte regionale Ergänzungen: Berlin, Hamburg und München
- Plattformen: Web, Smartphone/PWA und Desktop
- sichtbare Fachoberfläche: vollständig Deutsch und Englisch
- öffentlicher App-Rahmen: lokal vendortes `public-app-shell/v2.0.3`
- gemeinsame öffentliche Interaktionen: lokal vendortes
  `public-app-essentials/v1.1.2` für kompakten Start, ehrlichen
  Datenschutzhinweis und Teilen
- Production: nicht freigegeben

Der unabhängige öffentliche DEV-Stand ist ohne Portal und ohne Login erreichbar:

```text
App:         https://drmilos33.github.io/MilosApps-WelcherMuell/
Readiness:   https://drmilos33.github.io/MilosApps-WelcherMuell/healthz
Repository:  https://github.com/DrMilos33/MilosApps-WelcherMuell
```

Deploymentquelle ist
`f6837bb593e3b4e8fbd24a99be5e8ebd42c20dd5`; der getrennte
Pages-Artefaktcommit ist `6075041b44acbd734530ea665a0c51d9961bfa40`.
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
pnpm test:essentials
pnpm test:e2e
pnpm test:sources:online
$env:WASTE_GUIDE_SOURCE_COMMIT=(git rev-parse HEAD)
pnpm build:github-pages:dev
$env:WASTE_GUIDE_REMOTE_URL="https://drmilos33.github.io/MilosApps-WelcherMuell/"
$env:WASTE_GUIDE_EXPECTED_SOURCE_COMMIT=(git rev-parse HEAD)
pnpm test:remote:dev
pnpm test:all
```

`test` prüft Inhalt, Quellenvertrag, DE/EN, Suche, Synonyme, Tippfehler,
flüchtige Einstellungen, Endgeräteinventar und die app-spezifische
Essentials-Konfiguration. `test:shell` und
`test:essentials` prüfen Manifest, Vendor-Hashes und Lock mit den portablen
Shared-Validatoren. `test:e2e` nutzt ein lokal installiertes Chrome oder Edge
auf Port 4318. `test:sources:online` ruft alle katalogisierten amtlichen Quellen
live ab.
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
- `src/shell-session.js`: DE/EN-Reloadzustand über die sichtbare URL, ohne
  Web Storage
- `offline-sw.js`: Offline-Cache erst nach ausdrücklicher Aktivierung;
  `sw.js` entfernt die frühere automatische Registrierung
- `docs/DEVICE_STORAGE_INVENTORY.json`: Zweck, Trigger und Laufzeit aller
  Endgerätezugriffe
- `milos-app.json` und `vendor/milosapps-shell/v2/`: exakt gepinnter,
  lokal ausführbarer App-Rahmen ohne CDN oder Runtimeimport
- `milos-essentials.json` und `vendor/milosapps-essentials/v1/`: exakt
  gepinnte lokale Loader-, Datenschutz- und Teilen-Runtime mit 6er-Lock
- `meta.json`: Portal- und DEV-Metadaten

Fehlt eine Quelle oder ist ihre erneute Prüfung fällig, wird der betroffene
Hinweis nicht als scheinbar sichere Tonnenregel ausgegeben. Standort bleibt
immer optional.

Jede Trefferkarte beginnt mit einer kompakten Sofortantwort: erkannter
Gegenstand beziehungsweise Material, sichtbares Symbol und konkreter
Entsorgungsweg. Grund, Schritte, regionale Grenze, Ausnahmen und Quellen folgen
danach. Symbole tragen nie allein die Bedeutung; insbesondere erscheint eine
Tonne nur bei einem tatsächlichen Restmüllweg.

Die Suche deckt neben Materialbegriffen auch typische Alltagswörter und
Zusammensetzungen ab, etwa `Gummi`, `Gummiband`, `Haargummi`, `Radiergummi`,
`Plastikblume`, `Kunstblumen`, `Plastikschüssel`, `Staubsaugerbeutel`,
`Katzenstreu` und `Kugelschreiber`. Ein reiner Materialbegriff wie `Plastik`
bleibt eine Auswahl zwischen Verpackung und Gegenstand. Sicherheitsrelevante
Abgrenzungen wie Auto- und Motorradreifen sowie elektrische Spielsachen bleiben
eigene, vorsichtige Treffer.

## Dokumentation

- [Produktbrief](docs/PRODUCT_BRIEF.md)
- [Architektur](docs/ARCHITECTURE.md)
- [Quellen und Lizenzen](docs/SOURCES_AND_LICENSES.md)
- [QA-Plan](docs/QA_PLAN.md)
- [QA-Bericht](docs/QA_REPORT.md)
- [DEV- und Portal-Übergabe](docs/DEV_HANDOFF.md)
- [DEV-Deployment und Rollback](docs/DEPLOYMENT.md)
- [Erkenntnisse](docs/LEARNINGS.md)
