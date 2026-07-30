# QA-Plan: Welcher Müll?

## Ziel und Testgrenze

Die QA prüft eine öffentliche, deutschsprachige Nachschlage-App ohne Konto und
ohne Serverdatenhaltung. Fachliche Aussagen werden gegen den eingecheckten
Quellenvertrag und zusätzlich durch einen Live-Erreichbarkeitscheck geprüft.
Eine erfolgreiche URL-Prüfung ersetzt keine redaktionelle Inhaltsprüfung.

## Automatisierte Schichten

1. Inhalts- und Quellenvertrag
   - eindeutige IDs und vollständige Pflichtfelder;
   - Quelle, Geltungsbereich, Prüfdatum, Review-Termin, Lizenz und Attribution;
   - keine kommunale Regel als bundesweite Regel;
   - fehlende oder fällige Quellen erzeugen sichtbare Unsicherheit.
2. Suchqualität
   - exakte Namen, Synonyme, Markenbegriffe, Singular und Plural;
   - Umlaute, `ß`, Bindestriche und häufige Tippfehler;
   - kurze, lange, unbekannte und mehrdeutige Eingaben;
   - Gefahrfälle verdrängen keine passenden sicheren Treffer und umgekehrt.
3. Lokale Speicherung
   - Suchverlauf standardmäßig aus;
   - höchstens fünf lokale Begriffe bei ausdrücklicher Aktivierung;
   - Ausschalten und „Lokale Angaben löschen“ entfernen die Daten;
   - gesperrter Browserspeicher beeinträchtigt die Kernfunktion nicht.
4. Browser-E2E
   - app-spezifische Readiness auf dem festen Port 4318;
   - Desktop, Smartphone Hoch-/Querformat, Tastatur und semantische Namen;
   - 200%-Reflow-Äquivalent, Dark Mode, langsames Netz und Konsolenfehler;
   - schnelle Rück-/Vorwärtsnavigation, Direkt-URL, Offline nach Erstaufruf;
   - Teilen-Fallback und Druckaufruf ohne gespeicherten Suchverlauf.
5. Online-Quellencheck
   - HTTPS-Erreichbarkeit aller 17 katalogisierten Primärquellen;
   - ein Netzwerkfehler wird wiederholt und als externer Befund dokumentiert;
   - 4xx, dauerhafte Umleitung oder inhaltliche Änderung erzwingen eine
     redaktionelle Prüfung.

## Verbindliche Nutzungsmatrix

| Bereich | Fälle |
| --- | --- |
| Smartphone | 390 × 844, Touch, Dark Mode, lange Eingabe, 44-px-Ziele |
| Smartphone quer | 844 × 390, Ergebnis und Aktionen bedienbar |
| Desktop | 1440 × 1000, Maus, Direkt-URLs, Verlauf, Dialog |
| 200 Prozent | 640 CSS-Pixel als Reflow-Äquivalent zu 1280 px bei 200 Prozent |
| Tastatur | Tab-Reihenfolge, Enter-Suche, Dialog schließen, Fokus nach Ergebnis |
| Screenreader-Nähe | Landmarken, Überschriften, Live-Status, eindeutige Namen |
| Suchstress | 1 Zeichen, 120 Zeichen, unbekannt, mehrdeutig, Umlaut, Plural |
| Sicherheitsfälle | Batterie, beschädigter Akku, Elektro, Medikamente, Gefahrstoff |
| Quellenfehler | fehlende und überfällige Quelle, live nicht erreichbare Quelle |
| Zustandswechsel | schnelle neue Suche, Zurück/Vor, Löschen, Reload, Direktaufruf |
| Offline | warmer Service-Worker-Cache, verständlicher Offlinehinweis, Suche |
| Ausgabe | Teilen-Fallback, kanonischer Deep-Link, Druckaufruf und Print-CSS |

## Verbesserungsrunden

Nach dem ersten lauffähigen Stand werden mindestens zwei getrennte Runden
durchgeführt. Jede Runde beginnt mit Beobachtung, trennt Produktfehler von
Werkzeuggrenzen, behebt bestätigte Probleme, ergänzt Regressionstests und führt
die gesamte Matrix erneut aus. Ergebnisse stehen in `QA_REPORT.md`.
