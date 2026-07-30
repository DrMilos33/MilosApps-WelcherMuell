# QA-Bericht zum DEV-Stand

## Ergebnis

Der DEV-Stand wurde nach dem ersten lauffähigen Meilenstein in zwei getrennten
Miteinander-Product-QA-Runden geprüft und verbessert. Der abschließende Stand
erreichte:

- 38 von 38 Unit-, Inhalts-, Quellen-, Such- und Speichertests;
- 18 von 18 Browser-E2E-Prüfungen;
- 17 von 17 erreichbare amtliche Quellen im Wiederholungslauf;
- keine Konsolenfehler in Desktop- und Smartphone-Kontexten;
- keinen horizontalen Überlauf bei 390 px, 640 px und 1440 px Breite.

## Ausgangslage

`main` enthielt mit Commit `bb0973e` nur Produkt- und QA-Dokumentation. Der erste
lauffähige, quellengestützte Stand wurde auf `codex/waste-guide-dev` als
`9b6aaec` committed.

Bereits vor diesem Meilenstein wurden durch Regressionstests vier Fehler
gefunden und behoben:

- `Baterie` priorisierte durch ein gleich gewichtetes Keyword den beschädigten
  Akku; Namen und Synonyme erhielten höheres Gewicht.
- Eine lokale Variable überschrieb im Reset-Pfad die URL-Funktion.
- Ein generisches Batterie-Keyword machte die Rücknavigation mehrdeutig.
- Eine amtliche Berliner PDF-URL lieferte 404 und wurde durch eine aktuelle,
  stabile kommunale HTML-Quelle für den eng begrenzten Sicherheitsfall ersetzt.

## QA-Runde 1

Commit: `38c03e3`

Bestätigte Produktfehler:

- Auf dem Smartphone drängten sich Ergebnisüberschrift und „Neue Suche“ in
  dieselbe schmale Zeile.
- Der Footer-Link „App-Metadaten“ war nur rund 22 px hoch.

Änderungen:

- mobile Ergebniszeile unter 47 rem gestapelt;
- relevante Ergebnis-, Quellen- und Footer-Links auf mindestens 44 px erhöht;
- Browserregression für wichtige Smartphone-Zielgrößen ergänzt;
- Service-Worker-Cache angehoben.

Nachprüfung: 38/38 Unit-/Datenprüfungen, 17/17 E2E-Prüfungen und 17/17
Live-Quellenchecks bestanden. Die visuelle Kontrolle erfolgte zusätzlich im
Codex-In-App-Browser bei 390 × 844.

## QA-Runde 2

Commit: `9a17a2c`

Bestätigte Produktfehler:

- Mehrdeutige Treffer hatten für Screenreader mehrfach denselben
  Schaltflächennamen „Auswählen“.
- Nach einer kurzen oder unbekannten Suche blieb die Item-ID des vorherigen
  Ergebnisses in der URL. Reload und sichtbarer Zustand konnten dadurch
  auseinanderfallen.

Änderungen:

- Auswahl-Schaltflächen nennen nun den Gegenstand, etwa
  „Glasverpackung auswählen“;
- kurze, unbekannte und mehrdeutige Zustände entfernen einen veralteten
  Deep-Link; Zurück stellt den vorherigen konkreten Treffer wieder her;
- passende Accessibility- und Historienregressionen ergänzt;
- Service-Worker-Cache angehoben.

Nachprüfung: 38/38 Unit-/Datenprüfungen, 18/18 E2E-Prüfungen und 17/17
Live-Quellenchecks bestanden. Ein einzelner externer Fetch-Fehler der
UBA-Problemabfallseite verschwand im direkten Wiederholungslauf.

## Abgedeckte Matrix

| Bereich | Evidenz |
| --- | --- |
| Smartphone | 390 × 844, Touch, Dark Mode, 120-Zeichen-Grenze, 44-px-Ziele |
| Smartphone quer | 844 × 390, LED-Ergebnis und Aktionen erreichbar |
| Desktop | 1440 × 1000, Suche, Direkt-URL, Region, Verlauf, Dialog |
| 200 Prozent | 640 px Reflow-Äquivalent, visuell geprüft, kein Überlauf |
| Tastatur | Tab bis Suche, Eingabe/Enter, Dialog-Fokus und Schließen |
| Screenreader-Nähe | Landmarken, Überschriften, Live-Region, eindeutige Namen |
| Suchqualität | kurz, lang, unbekannt, Glas-Mehrdeutigkeit, Umlaute, Plural |
| Tippfehler | `Joghurbecher`, `Baterie`, Transpositionen |
| Sonderfälle | Batterie, beschädigter Akku, Elektro, Lampe, Medikamente |
| Quellenintegrität | fehlende und überfällige Quellen in Unit-Tests |
| Region | Deutschland, Berlin, Hamburg, München; Speichern und Löschen |
| Navigation | Direktaufruf, schnelle Suche, Zurück/Vor, Reload |
| Offline | App und Akkusuche nach vollständig geladenem Service-Worker-Cache |
| Teilen/Drucken | Clipboard-Fallback, kanonischer Link, Druckaufruf, Print-CSS |
| Netz/Fehler | langsame Requests, Desktop-/Mobil-Konsole ohne Fehler |
| Readiness | fester Port, App-Key/DEV/Production-Felder, Direkt-URL |

## Werkzeuggrenzen

Folgende Punkte wurden nicht als vollständig manuelle Betriebssystemprüfung
ausgegeben:

- Die tatsächliche Sprachausgabe von NVDA, JAWS oder VoiceOver wurde nicht
  abgehört. Geprüft wurden semantischer Baum, Namen, Landmarken, Fokus und
  Live-Status.
- Der In-App-Browser bietet keinen verlässlichen Browser-Chrome-Zoomregler.
  200 Prozent wurden als halbierte CSS-Breite eines 1280-px-Desktops sowie
  visuell bei 640 px geprüft.
- Native Betriebssystem-Dialoge für Web Share und Druckvorschau sind im
  Headless-Lauf nicht inspizierbar. Geprüft wurden Clipboard-Fallback,
  freigegebener Text/Link, `window.print()`-Aufruf und Print-CSS.
- Offline ist nach dem ersten vollständigen Aufruf zugesichert. Ein kalter
  Erstaufruf ohne Netz kann die redaktionellen Daten erwartungsgemäß nicht
  laden und wird in der UI entsprechend erklärt.

Diese Grenzen sind keine bestätigten Produktfehler. Für eine spätere
Releasefreigabe bleiben reale Screenreader-Sprachausgabe, Browserzoom und
native Share-/Druckdialoge sinnvolle manuelle Checks.
