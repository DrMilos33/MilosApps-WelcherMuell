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
| Lokale DEV-URL | `http://127.0.0.1:4318/` |
| Healthcheck | `http://127.0.0.1:4318/healthz` |
| vorgeschlagene Portalroute | `/apps/waste-guide` |
| Vorschaubild | `/assets/preview.svg`, eigenes Werk dieses Repositorys |
| Anmeldung | keine |
| Shared-Abhängigkeiten | keine |
| Production | nicht freigegeben |

Die vollständigen maschinenlesbaren Angaben stehen in `meta.json`.

## Readiness-Vertrag

Portal und E2E dürfen den Dienst nicht anhand eines allgemeinen HTTP 200
erkennen. `/healthz` muss mindestens diese Identität liefern:

```json
{
  "status": "ok",
  "appKey": "waste-guide",
  "environment": "DEV",
  "contentVersion": "2026.07.30-1",
  "productionApproved": false
}
```

Der lokale Port ist fest auf 4318 reserviert. Bei einer fremden oder
uneindeutigen Belegung wird abgebrochen; kein fremder Prozess wird beendet.

## Portalstatus

Der lokale DEV-Vertrag und die Metadaten sind stabil. Eine unabhängige
öffentliche HTTPS-DEV-URL existiert noch nicht und wird nicht erfunden. Deshalb
darf die Portalroute noch nicht auf die lokale Loopback-Adresse zeigen.

Exakter externer Blocker:

- kein GitHub-Repository ist eingetragen;
- kein DEV-Hostingprojekt oder `.openai/hosting.json` ist vorhanden;
- keine externe DEV-Zielumgebung oder Zugangsdaten sind freigegeben;
- Sites-Deployments wären Production und sind ausdrücklich nicht freigegeben.

Nach Bereitstellung eines unabhängigen HTTPS-DEV-Ziels soll das Portal
`/apps/waste-guide` als Redirect anbinden, ohne Portal-Login vorauszusetzen.
Portal-Ausfall darf die direkt aufrufbare App nicht beeinträchtigen. Production
bleibt bis zu einer ausdrücklichen Freigabe unverändert.

## Codex-Projektstatus

Das Repository ist eigenständig, aber noch nicht als eigenes lokales
Codex-Projekt in der Desktop-UI registriert. Die Arbeit bleibt strikt auf dieses
Repository begrenzt. Später ist der Eigentümer-Task entweder direkt dem neuen
Projekt zuzuordnen oder an einen dort gebundenen Fortsetzungs-Task zu übergeben.
