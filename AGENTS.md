# Welcher Müll? Repository-Regeln

## Zuständigkeit

Dieses Repository enthält ausschließlich `Welcher Müll?` mit dem App-Key
`waste-guide`. Fachlogik anderer MilosApps gehört nicht hierher.

## Portfolio-Verträge

- App-Klasse: `öffentlich`
- Plattformen: `Web, mobil und Desktop`
- Datenhaltung: `redaktionelle App-Daten; optionale grobe Region und letzte Suche lokal; keine Nutzerdatenbank`
- Deployment: `eigener GitHub-Pages-DEV-Dienst; Production ausschließlich über die freigegebene Kampagne public-app-production-launch-2026-08 auf getrenntem Cloudflare-Pages-Ziel`
- Gemeinsame Abhängigkeiten: `keine`

Wenn der lokale MilosApps Workspace verfügbar ist, vor appübergreifenden
Änderungen die Register-, Portfolio-, Identity- und
`docs/PORTFOLIO_LEARNINGS.md`-Dokumente dort lesen.

## Arbeitsgrenzen

- Nur Dateien dieses Repositorys ändern.
- Entsorgungsaussagen mit belastbaren Quellen, Gültigkeitsbereich und
  Aktualisierungsdatum dokumentieren.
- Regionale Regeln nicht verallgemeinern und Unsicherheit offen anzeigen.
- Keine Datenbank, Cookies, Secrets oder Quellcode mit anderen Apps teilen.
- DEV und Production strikt trennen. Die Production-Freigabe vom 04.08.2026
  gilt ausschließlich für den kampagnengebundenen Cloudflare-Pages-Lifecycle;
  ohne bestätigte Project-ID und URL wird nicht veröffentlicht.

## Qualität

- Such-, Synonym-, Tippfehler-, Inhalts- und End-to-End-Tests aufbauen.
- Nach dem ersten lauffähigen Stand mindestens zwei QA-/Verbesserungsrunden
  durchführen.
- Smartphone, Desktop, Tastatur, Screenreader, hohen Zoom und langsames Netz
  prüfen.
- Quellenpflege und veraltete Einträge als testbare Zustände behandeln.
- Allgemeine Erkenntnisse in `docs/LEARNINGS.md` festhalten und zurückmelden.
