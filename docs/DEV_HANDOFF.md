# DEV- und Portal-Übergabe

## App-Metadaten

| Feld | Wert |
| --- | --- |
| App-Key | `waste-guide` |
| Titel | Welcher Müll? |
| Kurzbeschreibung | Eine kurze, quellenbasierte Antwort auf „Wohin damit?“ – mit sichtbarer Unsicherheit bei örtlichen Unterschieden. |
| Sprache | `de-DE` |
| Status | DEV, öffentlich, ohne Anmeldung |
| Plattformen | Web, mobile/PWA, Desktop |
| Inhaltsstand | `2026.07.30-1`, 30.07.2026 |
| Gültigkeit | Private Haushalte in Deutschland; belegte Ergänzungen für Berlin, Hamburg und München |
| öffentliche DEV-URL | `https://drmilos33.github.io/MilosApps-WelcherMuell/` |
| Healthcheck | `https://drmilos33.github.io/MilosApps-WelcherMuell/healthz` |
| lokale DEV-URL | `http://127.0.0.1:4318/` |
| vorgeschlagene Portalroute | `/apps/waste-guide` |
| Vorschaubild | `/assets/preview.svg`, eigenes Werk dieses Repositorys |
| Anmeldung | keine |
| Shared-Abhängigkeiten | keine |
| Production | nicht freigegeben |

Die vollständigen maschinenlesbaren Angaben stehen in `meta.json`.

## Deployrevision

- GitHub-Repository:
  `https://github.com/DrMilos33/MilosApps-WelcherMuell`
- Quellbranch: `codex/waste-guide-dev`
- vollständig deployter Quellcommit:
  `461732eef5b94b5e3f941fe5530030773cb02359`
- Quellbaum: `9cadc699807b6dbfd8d9428a77f3654daf96e192`
- Artefaktbranch: `dev-pages`
- Pages-Artefaktcommit:
  `d9e6e4506e3a07d35edd6d6787269fddb54b4f4d`
- GitHub-Pages-Build: `1122927971`, Status `built`
- Draft-PR für den Quellbranch:
  `https://github.com/DrMilos33/MilosApps-WelcherMuell/pull/1`

Der Pages-Artefaktbuild liest App-Shell, Logik, Assets und redaktionelle Daten
ausschließlich aus dem freigegebenen Quellcommit. Er passt nur den
Repository-Basispfad an und ergänzt externe DEV-Metadaten, Health- und
Artefaktnachweis.

## Readiness-Vertrag

Die absolute URL `/healthz` antwortete nach dem Pages-Build ohne Umleitung mit:

```json
{"status":"ok","appKey":"waste-guide","environment":"DEV","contentVersion":"2026.07.30-1","productionApproved":false,"sourceCommit":"461732eef5b94b5e3f941fe5530030773cb02359"}
```

Portal und E2E müssen mindestens App-Key, Umgebung, Inhaltsversion,
`productionApproved` und Quellcommit prüfen. Ein allgemeines HTTP 200 reicht
nicht. Bei GitHub Pages ist dies ein statischer, revisionsgebundener
Artefakthealthcheck und kein Prozessmonitor.

## Externe Verifikation

Am 30.07.2026 wurden nach terminalem Pages-Status `built` geprüft:

- HTTPS-Startseite ohne Redirect zu Portal oder Login;
- leerer Browserzustand ohne Cookies und gespeicherte Origins;
- direkter Aufruf `?item=battery`;
- Suche nach „alte Medikamente“ mit sichtbarer örtlicher Unsicherheit;
- App-Key, Inhaltsversion, Quellcommit und Production-Grenze;
- Smartphone 390 × 844, Dark Mode und kein horizontaler Überlauf;
- keine fehlgeschlagenen Ressourcen, Konsolenfehler oder Browserwarnungen.

Reproduzierbarer Test:

```powershell
$env:WASTE_GUIDE_REMOTE_URL="https://drmilos33.github.io/MilosApps-WelcherMuell/"
pnpm test:remote:dev
```

## Portalstatus

Die unabhängige HTTPS-DEV-URL ist stabil und ohne Portal erreichbar. Portal &
Identity kann `/apps/waste-guide` nach eigener Validierung als Redirect
einbinden. Die App setzt keinen Portal-Cookie, kein Milos-Konto und keine
Portalverfügbarkeit voraus. Änderungen am Portal bleiben ausschließlich beim
Portal-Task.

## Production- und Reviewgrenze

GitHub Pages ist in diesem Vertrag ausschließlich der öffentliche DEV-Host.
`productionApproved=false`; es gibt keine Production-URL und keine Änderung an
`milos-apps.de`.

Ein erfolgreicher Deploy oder Healthcheck erneuert kein redaktionelles
Prüfdatum. Inhaltsversion, Gültigkeitsgebiet, Lizenznachweis und früheste
erneute Prüfung am 30.09.2026 bleiben unverändert. Details stehen in
`SOURCES_AND_LICENSES.md`.

## Codex-Projektstatus

Das Repository ist eigenständig, aber noch nicht als eigenes lokales
Codex-Projekt in der Desktop-UI registriert. Später ist der Eigentümer-Task
entweder direkt dem neuen Projekt zuzuordnen oder an einen dort gebundenen
Fortsetzungs-Task zu übergeben. Dies blockiert den unabhängigen DEV-Betrieb
nicht.
