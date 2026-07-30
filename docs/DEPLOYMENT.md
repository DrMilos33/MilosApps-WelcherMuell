# Unabhängiges DEV-Deployment

## Vertrag

`waste-guide` läuft als öffentliche statische DEV-App auf GitHub Pages:

- URL: `https://drmilos33.github.io/MilosApps-WelcherMuell/`
- Health: `https://drmilos33.github.io/MilosApps-WelcherMuell/healthz`
- Repository: `DrMilos33/MilosApps-WelcherMuell`
- Quellcommit: `461732eef5b94b5e3f941fe5530030773cb02359`
- Inhaltsversion: `2026.07.30-1`
- Artefaktbranch: `dev-pages`
- gesunder Artefaktcommit:
  `d9e6e4506e3a07d35edd6d6787269fddb54b4f4d`
- Production-Freigabe: `false`

Portal, Shared, Nutzerkonto und Datenbank sind keine Laufzeitabhängigkeiten.

## Reproduzierbarer Build

```powershell
pnpm build:github-pages:dev
```

`scripts/build-github-pages-dev.mjs` ist absichtlich auf den freigegebenen
Quellcommit und die Inhaltsversion festgelegt. Es liest deploybare Dateien über
Git direkt aus diesem Commit, schreibt den Repository-Basispfad für GitHub
Pages um und erzeugt:

- `/healthz` mit revisionsgebundener DEV-Identität;
- `deployment.json` mit Quellbaum und SHA-256 je Artefaktdatei;
- externe `meta.json`;
- `.nojekyll`.

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
4. Builder-Pin bewusst auf den freigegebenen vollständigen SHA anheben;
5. Artefakt erzeugen, Hashmanifest prüfen und erst dann `dev-pages` bewegen;
6. Pages-Status `built`, Remote-Smoke und Browser-Direktaufruf prüfen.

## Rollback

Letzte gesunde DEV-Revision ist
`d9e6e4506e3a07d35edd6d6787269fddb54b4f4d`.

Rollback bedeutet ausschließlich, den Remote-Ref `dev-pages` auf einen zuvor
verifizierten gesunden Artefaktcommit zurückzusetzen. Danach wird der
Pages-Buildstatus abgewartet und `/healthz` samt Remote-Smoke erneut geprüft.
Quellbranch, Portal und Production werden dabei nicht verändert.

Beim ersten Deployment ist die aktuelle Revision zugleich die einzige gesunde
Rollbackbasis. Spätere Deployments müssen den vorherigen gesunden
Artefaktcommit vor dem Verschieben des Branches hier ergänzen.

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
