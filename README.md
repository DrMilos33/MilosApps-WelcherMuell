# Welcher Müll?

`waste-guide` ist eine eigenständige, öffentliche MilosApps-Nachschlage-App für
private Haushalte. Sie gibt kurze, quellenbasierte Entsorgungshinweise, erklärt
den Grund und kennzeichnet regionale Unsicherheit sichtbar. Konto, Standort und
eine Konto- oder Profildatenbank sind nicht nötig. Nur eine bewusst
abgeschickte Ergebnisrückmeldung wird im app-eigenen Feedbackdienst gespeichert.

## DEV-Stand

- Inhaltsversion: `2026.08.09-1`, Stand 09.08.2026
- 62 redaktionelle Einträge und 30 amtliche oder kommunale Quellen
- allgemeiner Geltungsbereich: private Haushalte in Deutschland
- belegte regionale Ergänzungen: Berlin, Hamburg und München
- Plattformen: Web, Smartphone/PWA und Desktop
- sichtbare Fachoberfläche: vollständig Deutsch und Englisch
- öffentlicher App-Rahmen: lokal vendortes `public-app-shell/v2.0.3`
- gemeinsame öffentliche Interaktionen: lokal vendortes
  `public-app-essentials/v1.1.5` für kompakten Start, ehrlichen
  Datenschutzhinweis und Teilen
- Production: durch Kampagne `public-app-production-launch-2026-08`
  freigegeben; getrennter Cloudflare-Pages-Kandidat noch nicht veröffentlicht

Der unabhängige öffentliche DEV-Stand ist ohne Portal und ohne Login erreichbar:

```text
App:         https://drmilos33.github.io/MilosApps-WelcherMuell/
Readiness:   https://drmilos33.github.io/MilosApps-WelcherMuell/healthz
Repository:  https://github.com/DrMilos33/MilosApps-WelcherMuell
```

Deploymentquelle ist
`5a5a0e272b39872ca66fc7d2ad41ccff73af5a7c`; der getrennte
Pages-Artefaktcommit ist `3e7d427eb9d4159791d741933d57e75e4e88ad8b`.
GitHub Pages bleibt ausschließlich der DEV-Host. Der getrennte
Cloudflare-Pages-Production-Kandidat besitzt bis zur Bestätigung von Project-ID
und URL keinen veröffentlichten Endpunkt. Seine Reproduktion steht unter
[Production-Kandidat](docs/PRODUCTION_CANDIDATE.md).

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

Voraussetzungen sind Node.js 22 oder neuer und pnpm:

```powershell
pnpm install
pnpm dev
```

Es gibt keinen Build-Schritt für die Fach-App. Der kleine Node-Server liefert
statische ES-Module, JSON-Daten, Manifest, Service Worker und einen
app-spezifischen Healthcheck aus. Für lokale Tests nimmt er
Ergebnisrückmeldungen unter `/api/feedback` in einem flüchtigen Testadapter an.
Der getrennte reale Meldedienst liegt unter `feedback-worker/`; seine
Cloudflare-/D1-Einrichtung ist in dessen README dokumentiert.

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

Der Production-Kandidat wird getrennt nach `dist/production` gebaut:

```powershell
$env:WASTE_GUIDE_SOURCE_COMMIT=(git rev-parse HEAD)
$env:WASTE_GUIDE_PRODUCTION_URL="https://milosapps-waste-guide-production.pages.dev/"
$env:WASTE_GUIDE_CLOUDFLARE_TARGET_CONFIRMED="0"
pnpm build:cloudflare:production
pnpm test:production:artifact
pnpm test:e2e:production
```

Die URL ist bis zur Cloudflare-Bestätigung nur die explizite Kandidaten-URL;
der Builder veröffentlicht nichts.

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
- `src/feedback.js`: minimierter, credential-freier Direktversand einer
  ausdrücklich abgeschickten Ergebnismeldung
- `feedback-worker/`: app-eigener Cloudflare-Worker, D1-Schema,
  Auswertungsabfragen, Missbrauchsgrenze und 365-Tage-Löschung
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
`Katzenstreu` und `Kugelschreiber`. Allgemeine Leitfäden für Eisen/Metall,
Holz, mineralischen Bauschutt, Leder, Kork, Wachs und Verbundmaterial liefern
auch dann einen sicheren nächsten Schritt, wenn der genaue Gegenstand fehlt.
Ein reiner Materialbegriff wie `Plastik` oder `Metall` trennt sichtbar zwischen
Verpackung und Gegenstand. Elektro-/Batteriemerkmale, Gas- und Druckbehälter,
Farbe, Chemikalien und andere Sicherheitsausnahmen sperren eine allgemeine
Materialroute vollständig.

Exakte und redaktionell modellierte Begriffe verdrängen schwächere Präfix-,
Teil- und Fuzzy-Kandidaten vollständig. Ein unscharfer Kandidat zeigt nur einen
bestätigbaren „Meintest du …?“-Vorschlag; erst nach Auswahl erscheint ein
Entsorgungsweg. So ist `Toast` als Lebensmittel erfasst und kann nicht zum
Elektroalias `Toaster` erweitert werden, während `Toiaster` sicher `Toaster`
vorschlägt, ohne die Eingabe stillschweigend umzudeuten.

## Dokumentation

- [Produktbrief](docs/PRODUCT_BRIEF.md)
- [Architektur](docs/ARCHITECTURE.md)
- [Quellen und Lizenzen](docs/SOURCES_AND_LICENSES.md)
- [QA-Plan](docs/QA_PLAN.md)
- [QA-Bericht](docs/QA_REPORT.md)
- [DEV- und Portal-Übergabe](docs/DEV_HANDOFF.md)
- [DEV-Deployment und Rollback](docs/DEPLOYMENT.md)
- [Production-Kandidat und Rollback](docs/PRODUCTION_CANDIDATE.md)
- [Erkenntnisse](docs/LEARNINGS.md)
