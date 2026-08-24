# Cloudflare-Pages-Same-host-Kandidat

## Freigabe und unveränderte Fachgrenze

Die Kampagne `public-app-production-launch-2026-08` gibt den Refresh der
bereits veröffentlichten App frei. Autoritative Runtime-Basis ist
`e573e7711e69f5b59603f611e64adc9f29c490e3`; Inhaltsversion
`2026.08.09-1`, Quellenreview, Lizenzen, Geltungsgebiet und frühester
Reviewtermin 30.09.2026 werden durch den technischen Production-Build nicht
erneuert.

Cloudflare Pages liefert die statische App ohne Functions aus dem Projekt
`milosapps-waste-guide-production`. Der neue Owner-Kandidat setzt als
kanonische Adresse `https://milos-apps.de/welcher-muell`; das Portal soll den
öffentlichen Prefix serverseitig auf den Root dieses statischen Artefakts
abbilden. Bis der gemeinsame Originvertrag bestätigt ist, werden weder Pages,
Feedback-Worker noch Portal verändert. GitHub Pages, `dev-pages` und DEV-Daten
bleiben unverändert.

Die bisherige Adresse `https://welcher-muell.milos-apps.de/` und
`/apps/waste-guide` werden erst im gemeinsamen Portal-/Edge-Fenster permanente
Legacyweiterleitungen. Der App-Kandidat erzeugt diese fremden Routen bewusst
nicht selbst.

Ergebnisrückmeldungen gehen ausschließlich an den getrennten Worker
`milosapps-waste-guide-feedback-production` und dessen getrennte EU-D1-
Datenbank `milosapps-waste-guide-feedback-production`. Production liest und
beschreibt nie die DEV-Datenbank.

## Reproduzierbarer Build

```powershell
$env:WASTE_GUIDE_SOURCE_COMMIT=(git rev-parse HEAD)
$env:WASTE_GUIDE_PRODUCTION_URL="https://milos-apps.de/welcher-muell"
$env:WASTE_GUIDE_CLOUDFLARE_TARGET_CONFIRMED="1"
$env:WASTE_GUIDE_PRODUCTION_SOURCE_BRANCH="codex/waste-guide-same-host-production"
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
- `/welcher-muell/healthz` und `deployment.json` binden App-Key, Source-SHA,
  Inhaltsversion, Datei-Hashes und Gesamtdigest.
- `_headers` setzt eine strikte CSP ohne Inline-Ausnahmen; `connect-src`
  erlaubt neben Same-Origin genau den Production-Feedback-Origin.
- Canonical, Open-Graph-URL/-Bild, Manifest, Assets und Module sind auf
  `/welcher-muell` festgelegt. `robots.txt` verweist auf das App-Sitemap unter
  diesem Prefix; die autoritative Root-robots-/Root-sitemap-Einbindung bleibt
  Aufgabe des gemeinsamen Portalvertrags. `sitemap.xml` und initiales
  statisches Erklär-/Quellenmarkup sind crawlbar.
- `adsEnabled=false`; es werden weder AdSense-Script noch `ads.txt`
  ausgeliefert, solange keine AdSense-Freigabe und Publisher-ID existieren.
- Der Production-Offlinecache besitzt einen app-eigenen Namen und einen auf
  `/welcher-muell` begrenzten Scope. Die Altbereinigung vergleicht den exakten
  app-eigenen `sw.js`-Pfad und kann keine Service Worker anderer Same-host-Apps
  entfernen.
- Feedback-CORS erlaubt ausschließlich die Browser-Origin
  `https://milos-apps.de`; zusätzlich muss die Ergebnis-URL exakt den Pfad
  `/welcher-muell` besitzen. Die bisherige Subdomain wird nicht parallel
  freigegeben.
- Es gibt keine Client-Telemetrie, kein Ads-/CMP-Script und kein Tracking. Die
  gewünschte Zugriffszählung liegt ausschließlich serverseitig beim Portal.
- Keine Functions, Runtime-CDNs oder Shared-Datenbanken werden verwendet.

## Publikations-Hold – am 24.08.2026 erfüllt

Der Commit und sein Artefakt durften vor der bestätigten Portal-Originroute
nicht deployt werden. Vor Umschaltung mussten Portal und App gemeinsam belegen:

1. `/welcher-muell` und alle Prefix-Assets werden ohne HTML-Fallback für
   fehlende Dateien auf den Pages-Origin abgebildet;
2. Health, Manifest, Module, MIME, CSP und `Service-Worker-Allowed` bleiben
   beim Reverse-Proxy erhalten;
3. der Production-Feedback-Worker wird atomar auf Origin
   `https://milos-apps.de` und Ergebnispfad `/welcher-muell` umgestellt;
4. erst nach grünem Same-host-Smoke werden alte Subdomain und
   `/apps/waste-guide` als 308 aktiviert.

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

## Production-verifiziert am 17.08.2026

- Source: `4979aa479a9e06470464b51606aa27abe3e3794f`
- Source-Tree: `ac67e12d7f5615e1d7026bd3529c8a125dcc3646`
- Artefaktdigest: `d3f82047366492abfa02f2be67960e8cec47c75fecc0ca8f16384dace92df129`
  über 41 statische Dateien
- GitHub Actions: Run `31975577262`, vollständig erfolgreich
- Cloudflare Pages: Deployment
  `f43504a6-a9b4-47af-9316-920f0e5e33e6`, Production/main, Source
  `4979aa4`
- Worker: Version `a13e7598-a8d1-4c35-b647-405bfcc506f3`
- D1: `milosapps-waste-guide-feedback-production`, EU-Jurisdiktion,
  Migration `0001_feedback.sql`

`/healthz` antwortet mit HTTP 200 und exakt App-Key `waste-guide`, Umgebung
`PRODUCTION`, Inhaltsversion `2026.08.09-1`, `productionApproved=true` und dem
vollständigen Source-SHA. Root, `deployment.json`, `robots.txt` und
`sitemap.xml` liefern HTTP 200; CSP, Securityheader, Canonical, MIME und
`adsEnabled=false` sind extern belegt.

Die frische Browser-QA bestätigte No-Login/null Cookies, DE/EN, Loader 32 px,
Shell-Icon 38 px, 390 × 844 und 360 × 800 ohne horizontalen Überlauf sowie
null Browserwarnungen. Das Linux-CI-Gate prüfte zusätzlich den
360-×-800-Zustand bei 200 Prozent Textzoom. Live-Suchen nach `Öl`, `Toiaster`,
`Toast`, `Poster`, `Pizzareste`, `nasse Farbe`, `Werkzeug`, `Eisen` und
`Plastik` lieferten die vorgesehenen sicheren Treffer, Vorschläge oder
Entscheidungsbäume.

Worker-Health und CORS waren grün. Ein klar markierter Production-QA-Datensatz
wurde per HTTP 201 angenommen, als `review_state=new` aus D1 gelesen und
anschließend gezielt gelöscht; die Kontrollabfrage ergab null verbleibende
QA-Zeilen. Das bestätigt den direkten Meldungsweg, ohne Testdaten dauerhaft
aufzubewahren.

## Kanonische Umschaltung am 24.08.2026

Nach der extern bestätigten Portalroute liefert die App weiterhin aus der
revisionsgebundenen, beaconfreien Preview
`https://7bd3fbc3.milosapps-waste-guide-production.pages.dev`. Der
Production-Branch desselben Pages-Projekts wird getrennt als minimales
Legacyredirect-Artefakt gebaut:

```powershell
$env:WASTE_GUIDE_SOURCE_COMMIT=(git rev-parse HEAD)
$env:WASTE_GUIDE_LEGACY_REDIRECT_SOURCE_BRANCH="codex/waste-guide-canonical-cutover"
pnpm build:cloudflare:legacy-redirect
pnpm test:production:legacy-redirect
```

Das Artefakt enthält weder App-HTML noch Functions oder `_worker.js`. Seine
einzige Pages-Regel leitet jeden Pfad mit HTTP 308 auf denselben Suffix unter
`https://milos-apps.de/welcher-muell/` weiter; die externe Cloudflare-Prüfung
belegt zusätzlich die unveränderte Query. Dadurch werden sowohl
`welcher-muell.milos-apps.de` als auch die Production-`pages.dev`-Adresse zu
Legacywegen, ohne den Portal-Origin zu verändern.

Parallel akzeptiert der Feedback-Worker nach der Umschaltung ausschließlich
das gepaarte Ergebnisziel `https://milos-apps.de/welcher-muell`. Die alte
Subdomain, Kreuzkombinationen und fremde Same-host-Pfade bleiben fail-closed.
D1-Schema und gespeicherte Meldungen werden nicht verändert.

Der unmittelbare Cutover-Rollback aktiviert das letzte App-Deployment
`62bb90b0-9ebe-4d04-b6c1-a6ead5656eee` und die Worker-Übergangsversion
`833300f9-1c49-4af7-9e99-5f25843f472f` erneut.

## Historischer App-Rollback

Letzte gesunde Cloudflare-Pages-Revision vor dem Refresh ist Deployment
`0a065c1a-003d-4226-a4fb-02d8aee75ca7` mit Source
`6628fd743cfda96da4f2788281f12b6b81831077`, Inhaltsversion `2026.08.03-4`
und Artefaktdigest
`ca6305cbb313f964f9ca39f438d313c3cdf9ae42e87ed7c5a2ee428d51956906`.
Sie bleibt unter
`https://0a065c1a.milosapps-waste-guide-production.pages.dev/` erreichbar.

Bei einem App-Fehler wird genau dieses Pages-Deployment wieder aktiviert. Der
Production-Feedback-Worker wurde in diesem Refresh erstmals angelegt; sein
Rollback besteht im Deaktivieren des Workers, während die D1-Datenbank erhalten
bleibt. Die aktuell gesunde Worker-Version ist
`a13e7598-a8d1-4c35-b647-405bfcc506f3`. Kein Force-Push, keine Portalmutation
und keine Änderung am DEV-Lifecycle gehören zum Rollback.
