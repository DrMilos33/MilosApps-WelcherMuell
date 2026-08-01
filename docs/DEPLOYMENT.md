# Unabhängiges DEV-Deployment

## Vertrag

`waste-guide` läuft als öffentliche statische DEV-App auf GitHub Pages:

- URL: `https://drmilos33.github.io/MilosApps-WelcherMuell/`
- Health: `https://drmilos33.github.io/MilosApps-WelcherMuell/healthz`
- Repository: `DrMilos33/MilosApps-WelcherMuell`
- Quellcommit: `5e7b62db0be2bbf58f1ba4b07e781cddafb78a1f`
- Inhaltsversion: `2026.07.30-2`
- Artefaktbranch: `dev-pages`
- gesunder Artefaktcommit:
  `2f1127fff2eb9b8c7fc673cffee0ca3b40e18e72`
- Pages-Build: `1126772460`, Status `built`
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
`2f1127fff2eb9b8c7fc673cffee0ca3b40e18e72`. Der letzte gesunde
vor-v2-Rollbackpunkt ist
`8e8dfe0f7742a8190a78564bb3a3d2e5b51e3e3c`.

Rollback bedeutet ausschließlich, den Remote-Ref `dev-pages` auf einen zuvor
verifizierten gesunden Artefaktcommit zurückzusetzen. Danach wird der
Pages-Buildstatus abgewartet und `/healthz` samt Remote-Smoke erneut geprüft.
Quellbranch, Portal und Production werden dabei nicht verändert.

Der gestoppte v2.0.2-Zwischenstand `991132f` bleibt historisch erhalten, ist
wegen des zentralen CSP-Defekts aber kein bezeichneter Rollbackpunkt. Der
gesunde Rollback `8e8dfe0` enthält wie der aktuelle Stand Inhaltsversion
`2026.07.30-2`; deren Reviewtermine bleiben eigenständig.

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
