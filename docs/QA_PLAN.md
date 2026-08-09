# QA-Plan: Welcher Müll?

## Ziel und Testgrenze

Die QA prüft eine öffentliche, vollständig deutsch- und englischsprachige Nachschlage-App ohne Konto und
ohne gespeicherten Nutzungsverlauf. Nur bewusst abgeschickte
Ergebnisrückmeldungen gelangen in den app-eigenen Meldedienst. Fachliche Aussagen werden gegen den eingecheckten
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
3. Endgerätezugriff und Löschmigration
   - kein Cookie, kein neuer Region-/Suchverlauf-/Sprachwert in Web Storage;
   - fünf frühere optionale Schlüssel werden weder gelesen noch geschrieben
     und bleiben über die Website-Daten des Browsers entfernbar;
   - Region lebt nur bis Reload, Sprache bleibt sichtbar über `?lang=en`;
   - Offline-Registrierung und Cache entstehen erst nach ausdrücklicher Aktion;
   - frühere automatische Registrierung und zugehörige App-Caches werden
     entfernt; gesperrter Speicher beeinträchtigt die Kernfunktion nicht.
4. Browser-E2E
   - app-spezifische Readiness auf dem festen Port 4318;
   - Desktop, Smartphone Hoch-/Querformat, Tastatur und semantische Namen;
   - v2-Shell, vollständiges DE/EN und Reload-Persistenz;
   - kompakter CSS-first-Startzustand bis zur fachlichen Bereitschaft;
   - kein Scheinbanner bei No-Cookies, dauerhafter Datenschutzlink und
     maschinenlesbares Zweck-/Laufzeitinventar;
   - 360 × 800 bei echtem 200%-Textzoom, zusätzliches Reflow-Äquivalent,
     Dark Mode, langsames Netz und Konsolenfehler;
   - Reduced Motion, 44-px-Ziele und kein Leerraum unter dem Shell-Footer;
   - schnelle Rück-/Vorwärtsnavigation, Direkt-URL, Offline erst nach
     ausdrücklicher Aktivierung;
   - Teilen nativ, Clipboard-Fallback und Abbruch ohne gespeicherten
     Suchverlauf; kanonischer Ergebnislink und Quellenattribution;
   - Druckaufruf ohne gespeicherten Suchverlauf;
   - Ergebnismeldung mit grundabhängigem Hilfetext, ohne visuelle Trennlinie,
     genau einem Direktversand und ohne GitHub-/Login-Zwischenschritt;
   - strukturierter Prüfdatensatz, Fehlerzustand, keine Browserpersistenz und
     keine IP-/User-Agent-Felder im App-Datensatz.
5. Feedback-API und D1
   - erlaubte Origin, CORS-Preflight, Methode, MIME und Größenlimit;
   - kuratierte Gründe, kanonische Ergebnis-URL und idempotente Meldungs-ID;
   - Prepared Statement, Honeypot, Rate-Limit, nichtöffentlicher Leseweg;
   - Prüfstatus, Summary-View und 365-Tage-Löschung.
6. Online-Quellencheck
   - HTTPS-Erreichbarkeit aller 28 katalogisierten Primärquellen;
   - ein Netzwerkfehler wird wiederholt und als externer Befund dokumentiert;
   - 4xx, dauerhafte Umleitung oder inhaltliche Änderung erzwingen eine
     redaktionelle Prüfung.

## Verbindliche Nutzungsmatrix

| Bereich | Fälle |
| --- | --- |
| Smartphone | 390 × 844, Touch, Dark Mode, lange Eingabe, 44-px-Ziele |
| Smartphone quer | 844 × 390, Ergebnis und Aktionen bedienbar |
| Desktop | 1440 × 900, Maus, Direkt-URLs, Zurück/Vor, Dialog, DE/EN |
| 200 Prozent | 360 × 800 mit 200 % Root-Textzoom sowie 640 CSS-Pixel als Reflow-Äquivalent |
| Tastatur | Tab-Reihenfolge, Enter-Suche, Dialog schließen, Fokus nach Ergebnis |
| Screenreader-Nähe | Landmarken, Überschriften, Live-Status, eindeutige Namen |
| Suchstress | 1 Zeichen, 120 Zeichen, unbekannt, mehrdeutig, Umlaut, Plural |
| Sicherheitsfälle | Batterie, beschädigter Akku, Elektro, Medikamente, Gefahrstoff |
| Quellenfehler | fehlende und überfällige Quelle, live nicht erreichbare Quelle |
| Zustandswechsel | schnelle neue Suche, Zurück/Vor, flüchtige Region, Reload, Direktaufruf |
| Offline | kein Auto-Worker, explizite Aktivierung, warmer Cache, Offlinehinweis, Suche |
| Ausgabe | Teilen-Fallback, kanonischer Deep-Link, Druckaufruf und Print-CSS |

## Verbesserungsrunden

Nach dem ersten lauffähigen Stand werden mindestens zwei getrennte Runden
durchgeführt. Jede Runde beginnt mit Beobachtung, trennt Produktfehler von
Werkzeuggrenzen, behebt bestätigte Probleme, ergänzt Regressionstests und führt
die gesamte Matrix erneut aus. Ergebnisse stehen in `QA_REPORT.md`.
