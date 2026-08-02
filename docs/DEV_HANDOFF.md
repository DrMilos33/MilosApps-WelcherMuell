# DEV- und Portal-Übergabe

## App-Metadaten

| Feld | Wert |
| --- | --- |
| App-Key | `waste-guide` |
| Titel | Welcher Müll? |
| Kurzbeschreibung | Eine kurze, quellenbasierte Antwort auf „Wohin damit?“ – mit sichtbarer Unsicherheit bei örtlichen Unterschieden. |
| Sprache | `de-DE/en` |
| Status | DEV, öffentlich, ohne Anmeldung |
| Plattformen | Web, mobile/PWA, Desktop |
| Inhaltsstand | `2026.08.01-1`, 01.08.2026 |
| Gültigkeit | Private Haushalte in Deutschland; belegte Ergänzungen für Berlin, Hamburg und München |
| öffentliche DEV-URL | `https://drmilos33.github.io/MilosApps-WelcherMuell/` |
| Healthcheck | `https://drmilos33.github.io/MilosApps-WelcherMuell/healthz` |
| lokale DEV-URL | `http://127.0.0.1:4318/` |
| Portal-DEV-Route | `/apps/waste-guide`, cookie-los öffentlich validiert |
| Vorschaubild | `/assets/preview.svg`, eigenes Werk dieses Repositorys |
| Anmeldung | keine |
| Shared-Abhängigkeiten | `public-app-shell/v2.0.3` und `public-app-essentials/v1.0.0` vendort; keine Laufzeitabhängigkeit |
| Production | nicht freigegeben |

Die vollständigen maschinenlesbaren Angaben stehen in `meta.json`.

## Deployrevision

- GitHub-Repository:
  `https://github.com/DrMilos33/MilosApps-WelcherMuell`
- Quellbranch: `codex/waste-guide-dev`
- vollständig deployter Quellcommit:
  `aedb04669a3ea53d7cae96f3cf3863fb55eb36e1`
- Quellbaum: `035a5bf16942f990be011196507d75c5daad9e98`
- Artefaktbranch: `dev-pages`
- Pages-Artefaktcommit:
  `1387f040bb0d33fec5cbd1586772f403768550f6`
- GitHub-Pages-Build `1128207700`: Artefaktcommit `1387f04`, Status `built`
- Shell-Pin: `public-app-shell/v2.0.3`, Shared-Commit
  `ed898412306e22c6ae1b10ee8953df29f8acd627`, 5er-Lock verifiziert
- Essentials-Pin: `public-app-essentials/v1.0.0`, Shared-Commit
  `b09e09008ff05fe87f05bc647a7c4964ff13e6f6`, eigener 5er-Lock verifiziert
- Draft-PR für den Quellbranch:
  `https://github.com/DrMilos33/MilosApps-WelcherMuell/pull/1`

Der Pages-Artefaktbuild liest App-Shell, Logik, Assets und redaktionelle Daten
ausschließlich aus dem freigegebenen Quellcommit. Er passt nur den
Repository-Basispfad an und ergänzt externe DEV-Metadaten, Health- und
Artefaktnachweis.

## Readiness-Vertrag

Die absolute URL `/healthz` antwortete nach dem Pages-Build ohne Umleitung mit:

```json
{"status":"ok","appKey":"waste-guide","environment":"DEV","contentVersion":"2026.08.01-1","productionApproved":false,"sourceCommit":"aedb04669a3ea53d7cae96f3cf3863fb55eb36e1"}
```

Portal und E2E müssen mindestens App-Key, Umgebung, Inhaltsversion,
`productionApproved` und Quellcommit prüfen. Ein allgemeines HTTP 200 reicht
nicht. Bei GitHub Pages ist dies ein statischer, revisionsgebundener
Artefakthealthcheck und kein Prozessmonitor.

## Externe Verifikation

Am 01.08.2026 wurden nach terminalem Pages-Status `built` geprüft:

- HTTPS-Startseite ohne Redirect zu Portal oder Login;
- leerer Browserzustand ohne Cookies und gespeicherte Origins;
- direkter Aufruf `?item=battery`;
- Suche nach „alte Medikamente“ mit sichtbarer örtlicher Unsicherheit;
- Suche nach `GUmmiband` mit sofort sichtbarem, vorsichtigem Entsorgungsweg;
- Suche nach `Plastikblume` mit vorsichtigem Nichtverpackungsweg,
  Gelbe-Tonne-Warnung und lokaler Gültigkeitsgrenze;
- App-Key, Inhaltsversion, Quellcommit und Production-Grenze;
- `public-app-shell/v2.0.3`, vollständiger 5er-Lock und beide externen
  Same-Origin-Stylesheets;
- Deutsch/Englisch samt Reload-Persistenz;
- Smartphone 390 × 844 und 360 × 800 bei 200 % Textzoom, Dark Mode und kein
  horizontaler Überlauf;
- keine fehlgeschlagenen Ressourcen, Konsolenfehler oder Browserwarnungen.

Nach dem Essentials-Publish wurde die Matrix am 02.08.2026 in einem neuen
cookie- und speicherlosen Browserkontext für Source `aedb046` und Artefakt
`1387f04` erneut ausgeführt. Zusätzlich bestätigt sind:

- `public-app-essentials/v1.0.0` auf Shared-Commit `b09e090`, eigener
  vollständiger 5er-Lock und tatsächliche Web-Component-Registrierung;
- kompakter abgeschlossener Loader, wahrheitsgemäßer No-Cookies-Hinweis und
  gemeinsamer Clipboard-Share-Fallback;
- ein Medikamenten-Payload mit Ergebnis, Entsorgungsweg, amtlicher
  Quellenattribution und ausschließlich dem kanonischen `?item=medicine`-Link,
  ohne lokalen Verlauf;
- genau zwei externe Essentials-CSS-Dateien, keine Inline-Styles oder
  `data:`-Einbettung; CSS als `text/css` und JavaScript durch GitHub Pages als
  gültiges `application/javascript` ausgeliefert;
- No-Login, DE/EN samt Reload sowie 390 × 844 und 360 × 800 bei 200 Prozent
  Textzoom ohne Überlauf, fehlgeschlagene Ressource oder Konsolenfehler.

Native Freigabe, Clipboard-Fallback und Nutzerabbruch wurden im lokalen
Browsergate getrennt geprüft. Das Build-Gate verlangt beide CSS-Dateien
fail-closed als externe Same-Origin-Ressourcen.

Der lokale Browserlauf prüfte dieselbe Runtime zusätzlich mit dem exakten
Response-Header `style-src 'self'` und ohne Hash, Nonce oder `unsafe-inline`.
GitHub Pages bietet keinen app-eigenen Response-CSP-Header; der externe Lauf
prüfte deshalb die CSP-sichere Distributionsform, beide CSS-URLs, fehlende
Inline-Styles und das tatsächlich berechnete Layout. Deployment-Evidenz und
redaktioneller Quellenreview bleiben getrennt.

Reproduzierbarer Test:

```powershell
$env:WASTE_GUIDE_REMOTE_URL="https://drmilos33.github.io/MilosApps-WelcherMuell/"
$env:WASTE_GUIDE_EXPECTED_SOURCE_COMMIT="aedb04669a3ea53d7cae96f3cf3863fb55eb36e1"
pnpm test:remote:dev
```

## Portalstatus

Die unabhängige HTTPS-DEV-URL ist stabil und ohne Portal erreichbar. Portal &
Identity hat die öffentliche Redirectroute anschließend separat veröffentlicht
und am 01.08.2026 cookie-los validiert:

- Portal-DEV-Commit:
  `9643129b5688e4bd925b3ac198619ac260a61071`;
- GitHub-CI `30703116695`, Job `91377476515`: success;
- Railway-Staging-Deployment
  `f82ad853-1134-48cb-a67d-bb05bf754b99`: Active;
- `GET` und `HEAD` auf `https://dev.milos-apps.de/apps/waste-guide` antworten
  mit HTTP 302 und exakt
  `https://drmilos33.github.io/MilosApps-WelcherMuell/` als Ziel;
- Smartphone-QA bei 390 × 844 bestätigte v2.0.3, Grid-/Flexlayout, DE/EN mit
  44-Pixel-Zielen, fehlenden horizontalen Überlauf und null Konsolenfehler;
- `https://milos-apps.de/apps/waste-guide` bleibt HTTP 404; Production wurde
  nicht verändert.

Die App setzt weiterhin keinen Portal-Cookie und kein Milos-Konto voraus. Ihr
DEV-Lifecycle bleibt unabhängig von der Portalverfügbarkeit. Portal-Rollback
sind Commit `fea204d0f63bf9197ae06b4f29313df924199dee` und Deployment
`8d9b7ef6-60c1-450e-9348-155ce0cd645f`; Änderungen daran gehören
ausschließlich dem Portal-Task.

Nach Veröffentlichung der Inhaltsversion `2026.08.01-1` revalidierte Portal &
Identity die unveränderte Route erneut read-only. Aktiver Portal-DEV-Stand war
`811c01c06d715999c494d45a9ef1af485e343afc`, Railway-Staging-Deployment
`4ce30ff0-cc0e-4a31-8cfb-aa65f5d01d1d` meldete `SUCCESS`. Cookie-lose `GET`-
und `HEAD`-Aufrufe leiteten weiterhin exakt auf die App-DEV-URL um; App und
Health antworteten HTTP 200 mit Source `373f116`, während die Productionroute
HTTP 404 blieb. Diese Prüfung veränderte kein Repository und kein Deployment.

## Production- und Reviewgrenze

GitHub Pages ist in diesem Vertrag ausschließlich der öffentliche DEV-Host.
`productionApproved=false`; es gibt keine Production-URL und keine Änderung an
`milos-apps.de`.

Ein erfolgreicher Deploy oder Healthcheck erneuert kein redaktionelles
Prüfdatum. Nur der neue Kunststoff-Nichtverpackungsfall wurde am 01.08.2026
redaktionell ergänzt. Allgemeines Gültigkeitsgebiet, Lizenznachweise und die
Reviewtermine bestehender Einträge bleiben eigenständig; die früheste erneute
Prüfung ist weiterhin am 30.09.2026. Details stehen in
`SOURCES_AND_LICENSES.md`.

Aktueller gesunder DEV-Artefaktcommit ist `1387f04`; direkter Rollbackpunkt ist
`141231c` mit derselben Inhaltsversion ohne Essentials-Vertrag. Der letzte gesunde
vor-v2-Rollbackpunkt bleibt `8e8dfe0`. Der gestoppte v2.0.2-Zwischenstand ist
kein bezeichneter Rollbackpunkt.

## Codex-Projektstatus

Das Repository ist eigenständig, aber noch nicht als eigenes lokales
Codex-Projekt in der Desktop-UI registriert. Später ist der Eigentümer-Task
entweder direkt dem neuen Projekt zuzuordnen oder an einen dort gebundenen
Fortsetzungs-Task zu übergeben. Dies blockiert den unabhängigen DEV-Betrieb
nicht.
