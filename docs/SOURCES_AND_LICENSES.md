# Quellen, Gültigkeit und Rechte

## Inhaltsstand

- Inhaltsversion: `2026.08.01-1`
- redaktionell erweitert: 01.08.2026
- Umfang: 47 Entsorgungseinträge, 21 Quellen
- früheste erneute Prüfung: 30.09.2026
- allgemeine Geltung: private Haushalte in Deutschland
- regionale Ergänzungen: Berlin, Hamburg und München

Der maschinenlesbare Nachweis in `public/data/sources.v1.json` ist verbindlich.
Er enthält je Quelle URL, Herausgeber, fachliches Gültigkeitsgebiet,
Quellenstand soweit ausgewiesen, Prüfdatum, nächsten Review-Termin,
Lizenzbewertung und konkrete Attribution. `public/data/waste-items.v1.json`
verknüpft jeden Hinweis mit diesen Quellen.

## Verwendete Primärquellen

Fachliche Aussagen stammen ausschließlich von:

- Umweltbundesamt;
- Bundesministerium für Gesundheit;
- geltendem Gesetzestext bei `gesetze-im-internet.de`;
- Berliner Stadtreinigungsbetrieben;
- Stadtreinigung Hamburg;
- Abfallwirtschaftsbetrieb München;
- Stadt Köln, Gesundheitsamt, für den verletzungssicheren Umgang mit
  gebrauchten Spritzen.

UBA- und BMG-Rechteseiten sind zusätzlich als Lizenznachweis katalogisiert.
Am 01.08.2026 beantworteten alle 21 URLs den automatisierten Live-Check mit
HTTP 200. Für die Erweiterung um kleine Gummi- und Alltagsgegenstände wurden
insbesondere das Abfalllexikon des Abfallwirtschaftsbetriebs München sowie die
UBA-Hinweise zu Haushaltsabfällen geprüft. Autoreifen sind anhand der eigenen
UBA-Fachseite ausdrücklich vom gewöhnlichen Haus- und Sperrmüllfall getrennt.

Für Kunststoffgegenstände ohne Verpackungsfunktion belegen vier getrennte
amtliche Quellen die Gültigkeitsgrenze: Das UBA ordnet Gelbe Tonne und Gelben
Sack grundsätzlich Verpackungen zu; Berlin nennt Kunststoff-Haushaltsartikel
in der Wertstofftonne; Hamburg beschreibt stoffgleiche Nichtverpackungen in der
Wertstoffsammlung; der AWM München führt die Kunststoff-Gießkanne zum
Wertstoffhof. Daraus wird bewusst keine bundesweit einheitliche Tonne abgeleitet.

## Lizenz und Attribution

Die App übernimmt keinen fremden Datensatz, keine Logos, Fotografien,
Illustrationen oder längeren Textpassagen.

- UBA: Die offizielle Rechteseite nennt für Webinhalte grundsätzlich
  CC BY-NC-ND 4.0, sofern nicht anders gekennzeichnet, und beschreibt die
  Datennutzung. Die App verwendet ausschließlich eigenständig formulierte
  Tatsachenzusammenfassungen mit Quellenlink und Attribution.
- BMG und kommunale Seiten: Es wurde keine offene Lizenz zur Datenübernahme
  angenommen. Deshalb werden keine Texte oder Bilder kopiert. Verwendet werden
  kurze, eigenständig formulierte Tatsachen und Links zum amtlichen Prüfschritt.
- Gesetzestext: Die aktuelle amtliche Fassung wird verlinkt; die Rechtsfolge
  wird knapp in eigenen Worten wiedergegeben.
- App-Icon und Vorschaubild: eigene SVG-Werke dieses Repositorys, ohne
  Fremdassets, Logos oder Fotografien.

Das Repository enthält derzeit keine allgemeine Lizenzfreigabe für App-Code
oder redaktionelle Inhalte. Aus der Quellenlizenz folgt keine Lizenz für dieses
Repository.

## Regionale Gültigkeit

Bundesweite Grundsätze werden nicht mit kommunalen Sammelsystemen vermischt.
Berlin, Hamburg und München besitzen eigene, klar abgegrenzte Regionsprofile.
Münchens Wertstoffinsel ist ausdrücklich als Systemstand 2026 dokumentiert und
wird nicht auf andere Gemeinden übertragen. Für alle anderen Orte bleibt die
Region optional; die App verweist bei Unsicherheit auf das amtliche Abfall-ABC
der zuständigen Stadt oder des Landkreises.

Die Route `non-packaging-plastic` wird nur in Berlin, Hamburg und München
überschrieben. Ohne gewählte Region bleibt der sichere lokale Prüfschritt
sichtbar. Elektronik, Batterien und Schadstoffanhaftungen haben Vorrang vor der
Materialroute.

Die Kölner Quelle zu Spritzen begründet ausschließlich vorsichtige
Sicherheitsgrundsätze. Sie wird nicht als bundesweit einheitliche Tonnenregel
interpretiert.

## Redaktioneller Pflegeablauf

1. Nur eine offizielle Bundes-, Landes-, Kommunal- oder Gesetzesquelle
   recherchieren.
2. Geltungsgebiet und Zeitpunkt der Aussage festhalten.
3. Lizenz-/Nutzungsstatus prüfen; ohne offene Lizenz nur eigene
   Tatsachenzusammenfassung und Link verwenden.
4. Quelle in `sources.v1.json` versionieren und dem Item explizit zuordnen.
5. Bei einer kommunalen Abweichung nur das passende Regionsprofil ändern.
6. Inhaltsversion, Prüfdatum, Review-Termin und Service-Worker-Cache anheben.
7. Unit-/Daten-, Such-, E2E- und Online-Quellenchecks vollständig ausführen.

Eine nicht erreichbare, fehlende oder fällige Quelle wird nicht stillschweigend
ignoriert. Bis zur erneuten Prüfung ist sichtbare Unsicherheit der sichere
Standard.
