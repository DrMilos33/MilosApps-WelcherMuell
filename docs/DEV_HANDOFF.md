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
| Inhaltsstand | `2026.08.03-3`, 03.08.2026 |
| Gültigkeit | Private Haushalte in Deutschland; belegte Ergänzungen für Berlin, Hamburg und München |
| öffentliche DEV-URL | `https://drmilos33.github.io/MilosApps-WelcherMuell/` |
| Healthcheck | `https://drmilos33.github.io/MilosApps-WelcherMuell/healthz` |
| lokale DEV-URL | `http://127.0.0.1:4318/` |
| Portal-DEV-Route | `/apps/waste-guide`, cookie-los öffentlich validiert |
| Vorschaubild | `/assets/preview.svg`, eigenes Werk dieses Repositorys |
| Anmeldung | keine |
| Shared-Abhängigkeiten | `public-app-shell/v2.0.3` und `public-app-essentials/v1.1.5` vendort; keine Laufzeitabhängigkeit |
| Production | nicht freigegeben |

Die vollständigen maschinenlesbaren Angaben stehen in `meta.json`.

## Deployrevision

- GitHub-Repository:
  `https://github.com/DrMilos33/MilosApps-WelcherMuell`
- Quellbranch: `codex/waste-guide-dev`
- vollständig deployter Quellcommit:
  `2d5957b2ec2d8a3afeffc79b0a41eeb38d80cfe8`
- Quellbaum: `8382794be198d581ce35fe4e6ccc9d37b98370c3`
- Artefaktbranch: `dev-pages`
- Pages-Artefaktcommit:
  `d6c9deea4eb87899106b0eeb4a94d0a3a6c37822`
- GitHub-Pages-Actions-Run `30823264583`: Artefaktcommit `d6c9dee`,
  Status `built`/`success`
- Shell-Pin: `public-app-shell/v2.0.3`, Shared-Commit
  `ed898412306e22c6ae1b10ee8953df29f8acd627`, 5er-Lock verifiziert
- Essentials-Pin: `public-app-essentials/v1.1.5`, Shared-Commit
  `2942132ad3bf6cf39edc9f52ed918de6a230be23`, eigener 6er-Lock verifiziert
- Draft-PR für den Quellbranch:
  `https://github.com/DrMilos33/MilosApps-WelcherMuell/pull/1`

Der Pages-Artefaktbuild liest App-Shell, Logik, Assets und redaktionelle Daten
ausschließlich aus dem freigegebenen Quellcommit. Er passt nur den
Repository-Basispfad an und ergänzt externe DEV-Metadaten, Health- und
Artefaktnachweis.

## Readiness-Vertrag

Die absolute URL `/healthz` antwortete nach dem Pages-Build ohne Umleitung mit:

```json
{"status":"ok","appKey":"waste-guide","environment":"DEV","contentVersion":"2026.08.03-3","productionApproved":false,"sourceCommit":"2d5957b2ec2d8a3afeffc79b0a41eeb38d80cfe8"}
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

Am 03.08.2026 wurde der aktuelle Sofortantwort-/Datenschutzstand aus Source
`eab33ee0dd788d37394c63ccd8a40d45c13dcdbb` und Artefakt
`83de25132465053d177f43698ff32302fe77618c` erneut extern geprüft. Bestätigt
sind `public-app-essentials/v1.1.2` mit Shared-Pin `b14aac6`, der vollständige
6er-Lock, ein dauerhaft sichtbarer Datenschutzlink ohne Banner, null
Web-Storage-Aufrufe, explizites Offline, DE/EN über die URL sowie die direkt
sichtbare Gummiband-Antwort. Das Loader-Icon antwortete mit HTTP 200 und
`image/svg+xml`; sein SHA-256-Wert
`d315cb0fd21d4c98aac50cefd7857e231aa30f7d5f1d01ce76cfab5834e709d1`
war identisch zur Source. 390 × 844 und 360 × 800 bei 200 Prozent Textzoom
blieben ohne horizontalen Überlauf, fehlgeschlagene Ressource oder
Konsolenfehler.

Der anschließende Ergebnis-Kopf-Patch wurde aus Source `f6837bb` als
`6075041` veröffentlicht. Der externe Browser bestätigte rechts am Gummiband
exakt die zwei hervorgehobenen Begriffe `Restmüll` und `örtlich prüfen`, keine
doppelte Hilfs- oder Statuszeile sowie weiterhin vollständiges DE/EN,
No-Login, speicherfreien Start, explizites Offline und 360 × 800 bei
200 Prozent Textzoom. GitHub Pages Build `1129645835` und Actions-Run
`30793628420` waren erfolgreich. Fachinhalte und Inhaltsversion blieben
unverändert.

Der Suchqualitätsstand wurde anschließend aus Source `be6b4c95` als
Artefakt `163dec7` veröffentlicht. Pages-Build `1129765751` und Actions-Run
`30799681176` endeten erfolgreich. Ein frischer cookie-loser Browserkontext
bestätigte `Ölgemälde`, `Ölgemäde`, `Kinderriegel` und `Schokolade`, einen
sinnvollen Haupttreffer für `Plastik` mit genau einer kuratierten
Verpackungsalternative und ohne Elektro-Raten sowie `Karten` ohne
Pizzakarton-Vorschlag. Eine unbekannte Eingabe bietet sichere
Eingrenzungsaktionen, ohne eine Tonne zu erfinden. Bei 390 Pixeln sowie
360 × 800 und 200 Prozent Textzoom waren `clientWidth` und `scrollWidth`
jeweils identisch; es gab null Clipping, Cookies, Web-Storage-Aufrufe,
fehlgeschlagene Ressourcen oder Konsolenfehler.

Die anschließende atomare Loader-Migration wurde aus Source `c7af103d` als
Artefakt `9c4959a` veröffentlicht. Pages-Build `1129793087` und Actions-Run
`30801330326` endeten erfolgreich. `public-app-essentials/v1.1.3` ist exakt
auf Shared-Commit `babe74a0` gepinnt; alle sechs Verbraucherartefakte und die
enge LF-Policy wurden auch in einem frischen Windows-Checkout mit
`core.autocrlf=true` verifiziert. Ein frischer externer 390-×-844-Lauf mit um
900 ms verzögerten Fachdaten maß das sichtbare Loader-Icon einschließlich
Maximalgröße exakt mit 32 × 32 Pixeln, die kompakte Karte mit 320 × 191 Pixeln
und `clientWidth=scrollWidth=390`. Bei 360 × 800 und 200 Prozent Textzoom blieb
auch der geöffnete Plastik-Ergebniszustand bei `clientWidth=scrollWidth=360`.
No-Login, null Cookies, null Web-Storage-Aufrufe, externe Same-Origin-Runtimes,
CSP-Verteilung und null Konsolenfehler blieben erhalten. Die Suchfälle
`Ölgemälde`, `Ölgemäde`, `Kinderriegel`, `Schokolade`, `Plastik` und `Karten`
wurden gegen diesen endgültigen Live-Stand erneut bestätigt.

Reproduzierbarer Test:

```powershell
$env:WASTE_GUIDE_REMOTE_URL="https://drmilos33.github.io/MilosApps-WelcherMuell/"
$env:WASTE_GUIDE_EXPECTED_SOURCE_COMMIT="2d5957b2ec2d8a3afeffc79b0a41eeb38d80cfe8"
pnpm test:remote:dev
```

Der Poster-Suchstand wurde am 03.08.2026 aus Source `3541de9` als Artefakt
`864243c` veröffentlicht; GitHub-Pages-Run `30820395425` endete erfolgreich.
Ein frischer Browserkontext bestätigte `Poster oder Plakat` ohne
Elektroergebnis sowie für `Polster` den sicheren unbekannten Zustand. Health,
No-Login, DE/EN, Teilen, explizites Offline, 200-Prozent-Reflow und
`productionApproved=false` blieben grün. Cookie-lose `GET`- und `HEAD`-Aufrufe
der unveränderten Portalroute antworteten weiterhin mit 302 auf die App-URL;
die Productionroute blieb HTTP 404.

Der bestätigbare Tippfehlerstand wurde anschließend aus Source `2d5957b` als
Artefakt `d6c9dee` veröffentlicht; GitHub-Pages-Run `30823264583` endete
erfolgreich. Der externe Browser bestätigte `Toiaster` zunächst ausschließlich
als „Meintest du Toaster?“ ohne Item-ID und Entsorgungsweg und öffnete erst
nach Auswahl die exakte Toaster-Antwort. `TOast` blieb dagegen ein Lebensmittel
mit Biotonne-Hinweis und ohne Elektrotext. Health meldete Inhaltsversion
`2026.08.03-3` und `productionApproved=false`; No-Login, DE/EN, Share,
Offline-Opt-in sowie 360 × 800 bei 200 Prozent Textzoom blieben grün.

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
Prüfdatum. Die neuen Kunststoff-, Lebensmittel-/Verpackungs- und Gemäldewege
wurden am 03.08.2026 separat aus amtlichen Quellen redaktionell geprüft.
Allgemeines Gültigkeitsgebiet, Lizenznachweise und die Reviewtermine
bestehender Einträge bleiben eigenständig; die früheste erneute Prüfung ist
weiterhin am 30.09.2026. Details stehen in
`SOURCES_AND_LICENSES.md`.

Aktueller gesunder DEV-Artefaktcommit ist `d6c9dee`; direkter Rollback vor der
bestätigbaren Tippfehlerkorrektur ist `864243c`. Der Rollback vor der
Poster-Suchkorrektur ist `f90ecb3`. Bezeichneter Rollbackpunkt vor der
Loader-Migration ist `163dec7` auf Source `be6b4c95`.
Der Zwischenstand `6bd8b1c` ist wegen des erst extern gefundenen
Ergebnis-Zoomfehlers kein Rollbackpunkt.
Der letzte gesunde vor-v2-Punkt bleibt `8e8dfe0`. Der gestoppte
v2.0.2-Zwischenstand ist ebenfalls kein bezeichneter Rollbackpunkt.

## Codex-Projektstatus

Das Repository ist eigenständig, aber noch nicht als eigenes lokales
Codex-Projekt in der Desktop-UI registriert. Später ist der Eigentümer-Task
entweder direkt dem neuen Projekt zuzuordnen oder an einen dort gebundenen
Fortsetzungs-Task zu übergeben. Dies blockiert den unabhängigen DEV-Betrieb
nicht.
