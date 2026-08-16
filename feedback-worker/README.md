# App-eigener Feedbackdienst

Der dependency-freie Cloudflare-Worker nimmt ausschließlich bewusst
abgeschickte Ergebnisrückmeldungen von `waste-guide` an und legt sie strukturiert
in einer eigenen D1-Datenbank ab. Browser erhalten weder Datenbankzugang noch
Secrets. Es gibt keinen öffentlichen Lese-Endpunkt.

Gespeichert werden Meldungs-ID, Zeitpunkt, Umgebung, Inhaltsversion, Item-ID und
-Name, ausgewählter Grund, optionaler Kommentar, der auslösende Suchbegriff,
Sprache und die kanonische Ergebnis-URL. IP-Adresse, User-Agent, Cookies,
Kontaktdaten und lokale App-Einstellungen werden nicht in der Meldung
gespeichert. Freitext kann dennoch unbeabsichtigt personenbezogene Angaben
enthalten; die UI bittet deshalb ausdrücklich, keine Namen oder Kontaktdaten
einzutragen. Ein täglicher Cronjob löscht Meldungen nach 365 Tagen.

## Lokal prüfen

```powershell
pnpm feedback:migrate:local
pnpm feedback:dev
```

Die App selbst nutzt lokal ihren integrierten Testadapter auf `/api/feedback`.
Wrangler steht für eine echte lokale D1-Prüfung separat auf Port 4319 bereit.

## Aktuelles DEV-Ziel

- Worker: `milosapps-waste-guide-feedback-dev`
- HTTPS: `https://milosapps-waste-guide-feedback-dev.pascalcasiddu.workers.dev`
- D1: `milosapps-waste-guide-feedback-dev`, EU-Jurisdiktion
- Health: `/healthz`, `environment=DEV`, `productionApproved=false`

Der echte Cloudflare-Ressourcen-Identifier bleibt in der ignorierten Datei
`wrangler.deploy.jsonc`; sie enthält keine Secrets. Die versionierte Vorlage
bleibt portabel.

## Getrenntes Production-Ziel

- Worker: `milosapps-waste-guide-feedback-production`
- HTTPS: `https://milosapps-waste-guide-feedback-production.pascalcasiddu.workers.dev`
- D1: `milosapps-waste-guide-feedback-production`, EU-Jurisdiktion
- erlaubte Browser-Origin: ausschließlich `https://milos-apps.de`; zusätzlich
  wird der exakte Ergebnis-Pfad `/welcher-muell` geprüft
- erlaubter Ergebnispfad: ausschließlich `/`
- Health: `/healthz`, `environment=PRODUCTION`, `productionApproved=true`

Die versionierte Vorlage `wrangler.production.jsonc.example` wird lokal nach
`wrangler.production.jsonc` kopiert und ausschließlich mit der ID der
Production-D1 ergänzt. DEV- und Production-Ressourcen dürfen nicht dieselbe
Datenbank-ID verwenden.

## Einmalig für DEV bereitstellen

Cloudflare-Anmeldung und ein app-eigenes Ziel sind Voraussetzung:

```powershell
pnpm exec wrangler login
pnpm exec wrangler d1 create milosapps-waste-guide-feedback-dev
Copy-Item feedback-worker/wrangler.deploy.jsonc.example feedback-worker/wrangler.deploy.jsonc
# Die ausgegebene database_id ausschließlich in wrangler.deploy.jsonc einsetzen.
pnpm exec wrangler d1 migrations apply FEEDBACK_DB --remote --config feedback-worker/wrangler.deploy.jsonc
pnpm exec wrangler deploy --config feedback-worker/wrangler.deploy.jsonc
```

Danach werden Worker-Health und ein Testdatensatz geprüft. Erst dann wird die
App mit der absoluten HTTPS-Adresse gebaut:

```powershell
$env:WASTE_GUIDE_FEEDBACK_ENDPOINT='https://milosapps-waste-guide-feedback-dev.pascalcasiddu.workers.dev/v1/feedback'
$env:WASTE_GUIDE_SOURCE_COMMIT=(git rev-parse HEAD)
pnpm build:github-pages:dev
```

Die nicht eingecheckte `wrangler.deploy.jsonc` enthält nur die Cloudflare-
Ressourcen-ID, keine Secrets. Meldungen lassen sich im Cloudflare-Dashboard
unter D1 ansehen oder mit den Abfragen aus `queries/analysis.sql` auswerten.

## Rollback

Die bestehende App bleibt bis zum gesunden Worker- und D1-Nachweis auf ihrem
vorherigen DEV-Artefakt. Bei einem Fehler wird der App-Artefaktbranch auf den
letzten gesunden Stand zurückgesetzt; der Worker wird deaktiviert, ohne die D1-
Daten zu löschen. Eine Löschung der Datenbank ist ein gesonderter, destruktiver
Schritt.
