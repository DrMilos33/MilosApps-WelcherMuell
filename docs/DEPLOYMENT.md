# Unabhängiges DEV-Deployment

## Vertrag

`waste-guide` läuft als öffentliche statische DEV-App auf GitHub Pages:

- URL: `https://drmilos33.github.io/MilosApps-WelcherMuell/`
- Health: `https://drmilos33.github.io/MilosApps-WelcherMuell/healthz`
- Repository: `DrMilos33/MilosApps-WelcherMuell`
- Quellcommit: `3541de9dcdd63471f6ad78a12b6895b943821c8e`
- Inhaltsversion: `2026.08.03-2`
- Artefaktbranch: `dev-pages`
- gesunder Artefaktcommit:
  `864243c99c361993e66d83978eae937b83dea013`
- Pages-Actions-Run `30820395425`, Artefaktcommit `864243c`, Status
  `built`/`success` am 03.08.2026
- Shell: vendortes `public-app-shell/v2.0.3`, Shared-Commit
  `ed898412306e22c6ae1b10ee8953df29f8acd627`
- Production-Freigabe: `false`

Portal, Shared, Nutzerkonto und Datenbank sind keine Laufzeitabhängigkeiten.

## Reproduzierbarer Build

```powershell
$env:WASTE_GUIDE_SOURCE_COMMIT=(git rev-parse HEAD)
pnpm build:github-pages:dev
```

`scripts/build-github-pages-dev.mjs` verlangt absichtlich den vollständigen,
freigegebenen Quellcommit und bleibt auf die Inhaltsversion festgelegt. Es liest deploybare Dateien über
Git direkt aus diesem Commit, schreibt den Repository-Basispfad für GitHub
Pages um und erzeugt:

- `/healthz` mit revisionsgebundener DEV-Identität;
- `deployment.json` mit Quellbaum und SHA-256 je Artefaktdatei;
- externe `meta.json`;
- `.nojekyll`.

Zur deploybaren Shell gehören `milos-app.json` und die lokal vendorten,
per `shell-lock.json` verifizierten Dateien. Der 5er-Lock umfasst Komponente,
Komponenten-CSS, Bootstrap, app-spezifische Theme-CSS und Validator. Shared
oder ein CDN werden zur Laufzeit nicht benötigt.

Zusätzlich gehören `milos-essentials.json` und die lokal vendorten Dateien aus
`vendor/milosapps-essentials/v1/` zum Artefakt. Deren eigener 6er-Lock umfasst
Runtime, Runtime-CSS, Bootstrap, app-spezifische Theme-CSS, Validator und das
Manifest-Schema. Der
Builder bricht ab, wenn eines dieser Artefakte fehlt, wenn die beiden CSS-Links
im gebauten HTML nicht jeweils genau einmal extern erhalten bleiben oder wenn
eine `data:`-Einbettung auftaucht. Der feste Vertrag ist
`public-app-essentials/v1.1.5` auf Shared-Commit
`2942132ad3bf6cf39edc9f52ed918de6a230be23`.

`dist/` bleibt ein ignoriertes Buildartefakt und wird nicht in den Quellbranch
eingecheckt.

## Veröffentlichung

Der Inhalt von `dist/MilosApps-WelcherMuell` wird als eigener Commit auf
`dev-pages` gepusht. GitHub Pages baut ausschließlich den Wurzelpfad dieses
Branches. Quell- und Artefaktbranch können deshalb unabhängig geprüft und
zurückgesetzt werden.

Vor einer Aktualisierung gelten zwingend:

1. neuer App-Stand ausdrücklich als DEV freigegeben;
2. vollständige lokale Unit-/Inhalts-/E2E-Matrix grün;
3. redaktionelle Versions- und Quellenprüfung separat dokumentiert;
4. den freigegebenen vollständigen SHA explizit an den Builder übergeben;
5. Artefakt erzeugen, Hashmanifest prüfen und erst dann `dev-pages` bewegen;
6. Pages-Status `built`, Remote-Smoke und Browser-Direktaufruf prüfen.

## Rollback

Aktuelle gesunde DEV-Revision ist
`864243c99c361993e66d83978eae937b83dea013`. Direkter Rollback vor der
Poster-Suchkorrektur ist `f90ecb3f621d5c6f1b0494fc92890a0ebf0d5de1`; der
bezeichnende Rollbackpunkt vor Essentials v1.1.5 ist
`cefdd80d2d3a33b205ff1b15cea5be3f57213302`; der letzte gesunde vor-v2-Punkt ist
`8e8dfe0f7742a8190a78564bb3a3d2e5b51e3e3c`.

Rollback bedeutet ausschließlich, den Remote-Ref `dev-pages` auf einen zuvor
verifizierten gesunden Artefaktcommit zurückzusetzen. Danach wird der
Pages-Buildstatus abgewartet und `/healthz` samt Remote-Smoke erneut geprüft.
Quellbranch, Portal und Production werden dabei nicht verändert.

Der gestoppte v2.0.2-Zwischenstand `991132f` bleibt historisch erhalten, ist
wegen des zentralen CSP-Defekts aber kein bezeichneter Rollbackpunkt. Der
direkte Rollback `141231c` enthält dieselbe Inhaltsversion `2026.08.01-1`, aber
noch nicht `public-app-essentials/v1.0.0`.

Der Suchkandidat `6bd8b1c` bleibt ebenfalls historisch erhalten, ist wegen des
erst in der externen Ergebnis-Zoomprüfung belegten Überlaufs aber kein
bezeichneter Rollbackpunkt.

## Deployment ist kein Quellenreview

Der Pages-Build kopiert den versionierten redaktionellen Bestand bytegleich aus
dem Quellcommit. Technische Erreichbarkeit, Artefaktintegrität und fachliche
Aktualität sind getrennte Signale:

- Pages `built` bestätigt nur den technischen Deploy;
- `/healthz` bestätigt Identität und Revision;
- `test:remote:dev` bestätigt den ausgelieferten Browserfluss;
- `test:sources:online` bestätigt nur die Erreichbarkeit amtlicher URLs;
- der manuelle redaktionelle Review bestätigt Inhalt, Geltung, Lizenz und
  Attribution.

Ein Deploy verändert deshalb weder `reviewedAt` noch `reviewDue`.

## Production-Grenze

Dieses Hosting ist explizit DEV. Nicht erlaubt sind ohne neue ausdrückliche
Freigabe:

- eine Production-URL oder ein Production-Branch;
- Änderungen an `milos-apps.de`;
- OpenAI-Sites-Deployments;
- automatische Portaländerungen;
- stilles Anheben von Inhalts- oder Quellenständen.
