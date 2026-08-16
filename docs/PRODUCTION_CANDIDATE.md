# Cloudflare-Pages-Production-Refresh

## Freigabe und unveränderte Fachgrenze

Die Kampagne `public-app-production-launch-2026-08` gibt den Refresh der
bereits veröffentlichten App frei. Autoritative Runtime-Basis ist
`e573e7711e69f5b59603f611e64adc9f29c490e3`; Inhaltsversion
`2026.08.09-1`, Quellenreview, Lizenzen, Geltungsgebiet und frühester
Reviewtermin 30.09.2026 werden durch den technischen Production-Build nicht
erneuert.

Cloudflare Pages liefert die statische App ohne Functions aus dem Projekt
`milosapps-waste-guide-production` unter der kanonischen Adresse
`https://welcher-muell.milos-apps.de/`. GitHub Pages, `dev-pages`, Portalroute
und DEV-Daten bleiben unverändert.

Ergebnisrückmeldungen gehen ausschließlich an den getrennten Worker
`milosapps-waste-guide-feedback-production` und dessen getrennte EU-D1-
Datenbank `milosapps-waste-guide-feedback-production`. Production liest und
beschreibt nie die DEV-Datenbank.

## Reproduzierbarer Build

```powershell
$env:WASTE_GUIDE_SOURCE_COMMIT=(git rev-parse HEAD)
$env:WASTE_GUIDE_PRODUCTION_URL="https://welcher-muell.milos-apps.de/"
$env:WASTE_GUIDE_CLOUDFLARE_TARGET_CONFIRMED="1"
$env:WASTE_GUIDE_PRODUCTION_SOURCE_BRANCH="codex/waste-guide-production-refresh"
$env:WASTE_GUIDE_FEEDBACK_ENDPOINT="https://milosapps-waste-guide-feedback-production.pascalcasiddu.workers.dev/v1/feedback"
pnpm build:cloudflare:production
pnpm test:production:artifact
pnpm test:e2e:production
```

Der Builder liest nur einen vollständigen eingecheckten SHA, prüft dessen
Abstammung von der Runtime-Basis und schreibt ausschließlich nach
`dist/production`. URL, Feedback-Endpunkt und Branch werden fail-closed gegen
die bestätigten Production-Ziele geprüft.

## Artefakt- und Sicherheitsvertrag

- App-, Shell- und Essentials-Verträge weisen `production` und
  `productionApproved=true` aus; Pins bleiben unverändert.
- `/healthz` und `deployment.json` binden App-Key, Source-SHA,
  Inhaltsversion, Datei-Hashes und Gesamtdigest.
- `_headers` setzt eine strikte CSP ohne Inline-Ausnahmen; `connect-src`
  erlaubt neben Same-Origin genau den Production-Feedback-Origin.
- `robots.txt`, `sitemap.xml`, Canonical und initiales statisches
  Erklär-/Quellenmarkup sind crawlbar.
- `adsEnabled=false`; es werden weder AdSense-Script noch `ads.txt`
  ausgeliefert, solange keine AdSense-Freigabe und Publisher-ID existieren.
- Der Production-Offlinecache ist von DEV getrennt. Keine Functions,
  Runtime-CDNs oder Shared-Datenbanken werden verwendet.

## Full Gate

```powershell
pnpm test:shell
pnpm test:essentials
pnpm test
pnpm test:e2e
pnpm test:sources:online
pnpm build:cloudflare:production
pnpm test:production:artifact
pnpm test:e2e:production
```

Kann ausschließlich ein externer Transport-, Rate-Limit- oder 5xx-Fehler den
Onlinecheck blockieren, darf CI nur die an Commit `742b99a…`, den unveränderten
`public/data`-Tree und die dokumentierte 30/30-HTTP-200-Matrix gebundene
Evidenz prüfen. Ein endgültiger 4xx-Fehler oder jede Datenänderung verbietet
diese Wiederverwendung fail-closed.

Zusätzlich werden der Production-Worker samt D1-Migration, Health, CORS und
einem wieder gelöschten QA-Datensatz geprüft. Ein frischer Windows-Recheckout
mit `core.autocrlf=true` wiederholt den Build und die Vertrags-/Hashgates.
Nach dem Upload folgen externe No-Login-, DE/EN-, Responsive-, Offline-, CSP-,
Canonical-/robots-/sitemap- und Feedback-Smokes.

## Rollback

Letzte gesunde Cloudflare-Pages-Revision vor dem Refresh ist Deployment
`0a065c1a-003d-4226-a4fb-02d8aee75ca7` mit Source
`6628fd743cfda96da4f2788281f12b6b81831077`, Inhaltsversion `2026.08.03-4`
und Artefaktdigest
`ca6305cbb313f964f9ca39f438d313c3cdf9ae42e87ed7c5a2ee428d51956906`.
Sie bleibt unter
`https://0a065c1a.milosapps-waste-guide-production.pages.dev/` erreichbar.

Bei einem App-Fehler wird genau dieses Pages-Deployment wieder aktiviert. Der
Production-Feedback-Worker wird separat auf seine letzte gesunde Version
zurückgesetzt; die D1-Datenbank wird dabei nicht gelöscht. Kein Force-Push,
keine Portalmutation und keine Änderung am DEV-Lifecycle gehören zum Rollback.
