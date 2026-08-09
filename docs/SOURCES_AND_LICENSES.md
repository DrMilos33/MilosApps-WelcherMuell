# Quellen, Gültigkeit und Rechte

## Inhaltsstand

- Inhaltsversion: `2026.08.09-1`
- redaktionell erweitert: 09.08.2026
- Umfang: 62 Entsorgungseinträge, 30 Quellen
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
Für die Erweiterung um kleine Gummi- und Alltagsgegenstände wurden
insbesondere das Abfalllexikon des Abfallwirtschaftsbetriebs München sowie die
UBA-Hinweise zu Haushaltsabfällen geprüft. Autoreifen sind anhand der eigenen
UBA-Fachseite ausdrücklich vom gewöhnlichen Haus- und Sperrmüllfall getrennt.

Für Poster und Plakate trennt der UBA-Papierleitfaden normales, verwertbares
Papier von beschichteten und nassfesten Papieren. Die App macht daraus keinen
pauschalen Tonnenrat: Ein sauberes Papierposter folgt dem Altpapierweg;
Laminierung, Folie, selbstklebende Rückseite oder nassfestes Außenmaterial
führen zum Restmüll beziehungsweise bei großen oder unbekannten Formaten zum
örtlichen Prüfschritt.

Für Schokolade, Riegel und andere Lebensmittelreste werden die UBA-Regeln zu
Bioabfall und restentleerten Verpackungen gemeinsam ausgewertet: Inhalt und
Hülle werden getrennt, der Verpackungsweg richtet sich nach dem tatsächlichen
Material und die kommunale Biotonnenregel bleibt sichtbar. Für Gemälde belegt
die allgemeine UBA-Abfallhierarchie die Weiterverwendung und den örtlichen
Prüfschritt; die neue AWM-Detailseite zu Bilderrahmen zeigt eng für München,
dass Rahmenmaterial und Größe unterschiedliche Wege auslösen. Daraus wird
keine bundesweite Rahmentonne abgeleitet.

Mit Inhaltsversion `2026.08.03-3` wurden `Toast`, `Toastbrot`, `Brot` und
`Brotrest` als weitere Alltagssynonyme desselben belegten Lebensmittelwegs
ergänzt. Das ist keine neue Entsorgungsregel und kein erneuertes Quellenreview:
Lebensmittelrest und gegebenenfalls vorhandene Verpackung bleiben getrennt;
die kommunale Biotonnenregel ist weiterhin sichtbar zu prüfen.

Für Kunststoffgegenstände ohne Verpackungsfunktion belegen vier getrennte
amtliche Quellen die Gültigkeitsgrenze: Das UBA ordnet Gelbe Tonne und Gelben
Sack grundsätzlich Verpackungen zu; Berlin nennt Kunststoff-Haushaltsartikel
in der Wertstofftonne; Hamburg beschreibt stoffgleiche Nichtverpackungen in der
Wertstoffsammlung; der AWM München führt die Kunststoff-Gießkanne zum
Wertstoffhof. Daraus wird bewusst keine bundesweit einheitliche Tonne abgeleitet.

Mit Inhaltsversion `2026.08.03-4` wurde dieselbe Trennung als allgemeine
Materialschicht erweitert. Das UBA belegt Metallverpackungen in der
Leichtverpackungssammlung und begrenzt Nichtverpackungen auf Kommunen mit
Wertstofftonne. Hamburg bestätigt eine breite kommunale Annahme vieler
Metall-Nichtverpackungen; München verweist Metallteile auf den Wertstoffhof.
Eigene AWM-Detailseiten belegen außerdem eng die örtlichen Grenzen für Holz,
Bauschutt und Leder; Hamburgs Recyclinghofseite ergänzt kommunale Annahme- und
Mengenhinweise. Kork, Wachs und Verbundmaterial bleiben mangels bundesweit
einheitlicher Sammlung bewusst beim belegten örtlichen Prüfschritt. Aus keinem
dieser kommunalen Beispiele wird eine Deutschland-Tonne abgeleitet.

Mit Inhaltsversion `2026.08.09-1` wurden Lebensmittelreste, Speiseöl, Altöl,
unbekannte Öle, flüssige Farbe und verunreinigte Werkzeuge als getrennte
Entscheidungsfälle ergänzt. Der bundesweite Altölweg folgt § 8 AltölV. Für
Speiseöl werden die unterschiedlichen amtlichen Wege in München und Hamburg
bewusst nicht verallgemeinert: Das Ergebnis verlangt einen örtlichen
Prüfschritt und verbietet den Ausguss in Spüle oder Toilette. Flüssige oder
nicht sicher eingetrocknete Farbe wird nie über den Trockentreffer entsorgt.
Die neuen AWM- und Stadtreinigung-Hamburg-Seiten sind mit Geltungsgebiet,
Prüfdatum, Lizenzstatus und Attribution im Quellenkatalog erfasst.
Am 09.08.2026 beantworteten alle 30 katalogisierten amtlichen und kommunalen
URLs den automatisierten Live-Check mit HTTP 200.

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
