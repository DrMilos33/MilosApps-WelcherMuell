# Cloudflare-Pages-Production-Kandidat

## Freigabe und Grenze

Die Kampagne `public-app-production-launch-2026-08` gibt `waste-guide` für
Production frei. Autoritative Runtime-Basis ist
`5a5a0e272b39872ca66fc7d2ad41ccff73af5a7c`; Inhaltsversion
`2026.08.03-4`, Quellenreview, Lizenzen, Gültigkeitsgebiet und frühester
Reviewtermin 30.09.2026 werden durch den technischen Build nicht verändert.

Der Production-Provider ist Cloudflare Pages ohne Functions. Vorgesehener
Projektname ist `milosapps-waste-guide-production`. Project-ID und öffentliche
URL sind noch extern zu bestätigen. Bis dahin ist jeder Upload gesperrt;
dieses Repository enthält bewusst keinen Publish-Befehl.

GitHub Pages, `dev-pages`, DEV-URL, DEV-Health und Portalroute bleiben
unverändert.

## Reproduzierbarer Build

Der Builder liest ausschließlich einen vollständigen eingecheckten SHA, prüft
dessen Abstammung von der Runtime-Basis und schreibt nur nach
`dist/production`. Repo-Root und GitHub-Unterpfad sind keine Ausgabeziele.

```powershell
$env:WASTE_GUIDE_SOURCE_COMMIT=(git rev-parse HEAD)
$env:WASTE_GUIDE_PRODUCTION_URL="https://milosapps-waste-guide-production.pages.dev/"
$env:WASTE_GUIDE_CLOUDFLARE_TARGET_CONFIRMED="0"
$env:WASTE_GUIDE_PRODUCTION_SOURCE_BRANCH="codex/waste-guide-production-launch"
pnpm build:cloudflare:production
pnpm test:production:artifact
```

Die Kandidaten-URL wird nicht als bestätigt ausgegeben:
`deployment.json.targetConfirmed=false`. Nach externer Bestätigung wird mit
demselben Source-SHA, der bestätigten URL und
`WASTE_GUIDE_CLOUDFLARE_TARGET_CONFIRMED=1` neu gebaut und vollständig
verifiziert, bevor ein separater Publish-Schritt überhaupt zulässig ist.

## Production-Artefaktvertrag

Der Output enthält:

- Shell- und Essentials-Manifeste sowie beide Bootstrap-Dateien mit
  `production` und `productionApproved=true`;
- neu berechnete Shell-/Essentials-Locks, ohne veränderten Shared-Pin;
- Production-Marker und den kanonischen Datenschutzlink im HTML;
- `/healthz` mit App-Key, Inhaltsversion, Source-SHA und Production-Freigabe;
- `deployment.json` mit Source-Tree, Datei-Hashes und Gesamtdigest;
- `device-storage-inventory.json` mit dem tatsächlichen Production-Cache;
- einen eigenen Production-Service-Worker-Cache;
- `_headers` mit strikter Same-Origin-CSP, Securityheadern, JSON-/JavaScript-
  MIME und `no-store` für Health- und Deploymentidentität.

Es gibt keine Functions, keine Datenbank, keine Secrets, kein CDN und keinen
Runtimeimport aus einem anderen Repository.

## Full Gate vor Veröffentlichung

Einmalig auf dem finalen eingecheckten Kandidaten-SHA:

```powershell
pnpm test
pnpm test:shell
pnpm test:essentials
pnpm test:e2e
pnpm test:sources:online
pnpm build:cloudflare:production
pnpm test:production:artifact
pnpm test:e2e:production
```

Zusätzlich läuft derselbe Production-Build samt beiden Artefakt-Validatoren in
einem frischen Windows-Recheckout mit `core.autocrlf=true`. Der Browserlauf
deckt Desktop, 390 × 844, 360 × 800 bei 200 Prozent, DE/EN, Tastatur-/Zielgröße,
No-Login/No-Storage, explizites Offline, Production-Shell, Privacy, CSP und MIME
ab. Ein Cloudflare-Publish und externe Production-Smokes folgen erst nach
bestätigtem Ziel.

## Lokaler Release-Nachweis

Der technische Full-Gate bestand 115/115 Unit-, Inhalts-, Such-, Speicher- und
DE/EN-Tests, 34/34 bestehende Browser-E2E-Prüfungen, den fokussierten
Loader-/Shell-Übergang, beide vendorten Vertragsverifier und 28/28 amtliche
Quellen mit HTTP 200. Ein erster Quellenabruf war transient fehlgeschlagen;
der direkte Wiederholungsabruf und die anschließende vollständige
Quellenmatrix waren grün.

Der Production-Browserlauf bestand Desktop, 390 × 844 sowie 360 × 800 bei
200 Prozent inklusive DE/EN, No-Login, No-Storage, Offline, Privacy, CSP, MIME,
44-Pixel-Zielen und ohne horizontalen Überlauf. Ein frischer
Windows-Recheckout mit `core.autocrlf=true` bestand den Production-Build,
beide Verifier und die bytegenauen Vendor-/Lockgrenzen.

Bis Project-ID und tatsächliche Pages-URL extern bestätigt sind, bleibt
`targetConfirmed=false` und es erfolgt kein Upload. Der exakte Source- und
Artefakt-SHA wird bei jedem Build in `dist/production/deployment.json`
festgehalten.

## Rollback

Vor der ersten Veröffentlichung gibt es keine gesunde Production-Revision.
Ein fehlerhafter Erststand wird deshalb am Cloudflare-Ziel deaktiviert; die
Production-Portalroute bleibt beziehungsweise wird wieder 404. DEV bleibt auf
dem gesunden `dev-pages`-Artefakt
`3e7d427eb9d4159791d741933d57e75e4e88ad8b` und wird nicht bewegt.

Nach dem ersten gesunden Production-Stand wird ausschließlich eine zuvor
verifizierte Cloudflare-Deploymentrevision erneut aktiviert beziehungsweise
vorwärts veröffentlicht. Source- und Artefakthistorie werden nie per Force
umgeschrieben. Portalrollback und DNS gehören den jeweiligen Eigentümern.
