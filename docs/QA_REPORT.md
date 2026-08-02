# QA-Bericht zum DEV-Stand

## Ergebnis

Der DEV-Stand wurde nach dem ersten lauffähigen Meilenstein in zwei getrennten
Miteinander-Product-QA-Runden geprüft und verbessert. Der abschließende Stand
erreichte:

- 61 von 61 Unit-, Inhalts-, Quellen-, Such- und Speichertests;
- 22 von 22 Browser-E2E-Prüfungen;
- 20 von 20 erreichbare amtliche Quellen;
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

## QA-Erweiterung für Inhaltsversion 2026.07.30-2

Ausgangsstand war der vollständig grüne DEV-Commit `92aa572` mit 38/38
Unit-/Datenprüfungen und 18/18 Browser-E2E-Prüfungen. Die Nutzerprüfung zeigte
zwei neue Produktlücken: häufige Gummibegriffe wurden nicht gefunden, während
die große Region-/Speicherkarte Suche und Treffer aus dem ersten Sichtfeld
drängte.

### Verbesserungsrunde 1: Suchbreite und Informationshierarchie

- 11 neue redaktionelle Einträge und belastbare Synonyme für Gummi- und
  Alltagsgegenstände ergänzt;
- Auto- und Motorradreifen als eigenen Sicherheitsfall von kleinen
  Gummigegenständen getrennt;
- Suche, Beispiele und Entsorgungsweg deutlich vor Zusatzinformationen
  angeordnet;
- Region und lokale Speicherung in einen kompakten, stark gerundeten Dialog
  verschoben;
- Methodik und Vertrauenshinweise standardmäßig eingeklappt;
- Desktop, 390-px-Smartphone und Tastaturfluss visuell und automatisiert
  nachgeprüft.

Die erste Nachprüfung deckte auf dem Smartphone noch eine Mehrdeutigkeit für
den Tippfehler `Gummibnad` auf. Ursache war ein zu großzügiger Präfixbonus, der
den generischen Materialbegriff stärker als die konkrete Zusammensetzung
wertete.

### Verbesserungsrunde 2: Regressionen und kompakte Bedienung

- Präfixvergleiche berücksichtigen nun das Längenverhältnis, ohne die
  Tippfehlertoleranz für konkrete Begriffe zu schwächen;
- `Gummibnad` führt wieder eindeutig zum passenden Eintrag;
- Escape synchronisiert nach dem Schließen des Einstellungsdialogs auch
  `aria-expanded`;
- „Neue Suche“ bleibt auf schmalen Ergebniszeilen in einer Zeile;
- Browserregressionen sichern Suchpriorität, Dialoggröße/-rundung,
  Screenreaderstatus und den sofort sichtbaren Entsorgungsweg.

Abschluss: 61/61 Unit-/Datenprüfungen, 22/22 lokale Browser-E2E-Prüfungen und
20/20 Online-Quellenchecks bestanden. Die bestehende Matrix für Desktop,
Smartphone, Tastatur, Screenreader-Nähe, 200-Prozent-Reflow, kurze/lange/
mehrdeutige Eingaben, Umlaute, Singular/Plural, Sonderfälle, Quellenalter,
Rücknavigation, Offline, Teilen und Drucken wurde erneut vollständig
ausgeführt.

## Unabhängiger HTTPS-DEV-Smoke

Nach dem lokalen Abschluss wurde exakt Quellcommit
`9034b561dec88e33856697adac3877639f47006f` als Pages-Artefakt
`8e8dfe0f7742a8190a78564bb3a3d2e5b51e3e3c` veröffentlicht. Der
GitHub-Pages-Build `1123154848` endete mit Status `built`.

Der externe Smoke prüfte die echte HTTPS-URL in einem neuen Browserkontext ohne
Cookies oder gespeicherte Origins. Startseite, app-spezifisches `/healthz`,
Metadaten, direkter Batterie-Link, Medikamentensuche und die Suche nach
`GUmmiband` waren erfolgreich; Login-/Portalsteuerungen, fehlgeschlagene
Ressourcen und Konsolenfehler wurden nicht gefunden. Der mobile Remote-Smoke
bestätigte zusätzlich 390 × 844, Dark Mode, Inhaltsstand und überlauffreies
Layout.

Diese Deploymentprüfung erneuert keine fachliche Quellenprüfung. Inhaltsversion
und Reviewtermine bleiben unverändert.

## QA-Zwischenstand für public-app-shell/v2.0.2

Die Shell-Migration verändert Navigation, Sprache und Layout, aber nicht die
redaktionellen Entsorgungsaussagen. Der Vertrag ist lokal auf Shared-Commit
`97f695be3bdfcfdc51ad286c6ed231c4b9585295` vendort und per Lock verifiziert.

### Runde 1: Integration und vollständige Fachübersetzung

- gemeinsamer Header/Footer mit lokalem Inline-SVG, absoluten DEV-Links und
  sichtbarem DEV-Status integriert;
- sämtliche statischen und dynamischen Fachtexte auf DE/EN umgestellt,
  einschließlich Treffer, Warnungen, Integritätsfehler, Regionen, Quellen,
  Dialoge, Teilen und Fehlerzustände;
- Sprachwechsel und Reload-Persistenz sowie englische Suchnamen, Synonyme und
  Treffer als Regression ergänzt;
- ein zunächst lokaler CSP-Hashansatz als nicht appübergreifend tragfähig
  verworfen, nachdem die strikte Verbraucher-CSP den gemeinsamen Defekt belegte.

Der erste Browserlauf fand neben veralteten Testselektoren einen echten
Dark-Mode-Kontrastfehler: Die feste Shell-Farbe wurde in die dunkle
Fachoberfläche vererbt. App-eigene Dark-Theme-Tokens und eine gemessene
4,5:1-Kontrastregression beheben das.

### Runde 2: Smartphone, Grid und Textzoom

Die visuelle Smartphonekontrolle fand einen intern kollabierten Ergebnisweg,
obwohl kein Dokument-Overflow gemessen wurde. Die mobile Ergebnisstruktur ist
nun explizit einspaltig; eine Regression verlangt, dass der Ergebnisweg die
volle Kartenbreite einnimmt.

Der neue 360 × 800-Test mit 200 % Root-Textzoom fand anschließend zwei
app-eigene intrinsische Breiten: die Beispiel-Chips und lange Wörter im
eingeklappten Vertrauensbereich. Chips reflowen auf kleinen Viewports, weniger
wichtige Beispiele werden dort ausgeblendet und lange Texte brechen
kontrolliert um. Ein app-spezifischer Shell-Min-Width-Workaround wurde nicht
eingeführt.

Lokaler Abschluss vor Veröffentlichung:

- 65/65 Unit-, Inhalts-, Quellen-, Such-, Übersetzungs- und Speichertests;
- portabler Shared-Validator und SHA-256-Lock: PASS;
- 26/26 Browser-E2E-Prüfungen;
- 20/20 amtliche Quellen technisch erreichbar;
- 1440 × 900, 390 × 844, 844 × 390, 640-px-Reflow und
  360 × 800 bei 200 % Textzoom ohne horizontalen Überlauf;
- DE/EN samt Reload, Tastatur, sichtbarer Fokus, 44-px-Ziele, Reduced Motion,
  Offline, schnelle Navigation, Teilen/Drucken und Footerabschluss grün;
- keine Browser- oder Konsolenfehler.

Die Quellenprüfung bleibt getrennt: Der Online-Lauf bestätigt nur die
technische Erreichbarkeit. Inhaltsversion `2026.07.30-2`, Geltungsgebiet,
Lizenz, Attribution und bestehende Reviewtermine wurden durch die
Shell-Migration nicht erneuert.

## Finales CSP- und Reflow-Gate für public-app-shell/v2.0.3

Der unveränderliche Shared-Commit
`ed898412306e22c6ae1b10ee8953df29f8acd627` ersetzt den gestoppten
v2.0.2-Zwischenstand. Vendor und Lock wurden atomar neu erzeugt. Der portable
Validator prüft nun fünf Artefakte: Komponente, Komponenten-CSS, Bootstrap,
app-spezifische Theme-CSS und Validator.

Die Browserregression fordert exakt `style-src 'self'` ohne Hash, Nonce oder
`unsafe-inline`, prüft beide Stylesheets mit `text/css`, fehlende Inline-Styles,
das tatsächliche Grid-/Flexlayout, die Waste-Guide-Themefarbe, die feste
38-Pixel-Ikone und mindestens 44 Pixel große Shell-Ziele. DE/EN samt Reload,
Suche, Quellenlogik, lokale Speicherung, Tastatur, Fokus, Reduced Motion,
Offline, Smartphone und Desktop blieben unverändert grün.

Die visuelle Nachprüfung bei 360 × 800 und 200 % Textzoom fand trotz fehlendem
Dokument-Overflow ein nahezu kollabiertes Sucheingabefeld. Unter 23 rem reflowt
die Suchsteuerung nun einspaltig. Ein Regressionstest fordert mindestens
180 Pixel nutzbare Eingabebreite und sichert weiterhin null horizontalen
Überlauf sowie 44-Pixel-Ziele.

Lokaler Abschluss:

- portabler Shared-Validator und alle fünf SHA-256-Lockartefakte: PASS;
- 65/65 Unit-, Inhalts-, Quellen-, Such-, Übersetzungs- und Speichertests;
- 26/26 Browser-E2E-Prüfungen unter strikter CSP;
- 20/20 amtliche oder kommunale Quellen im Wiederholungslauf technisch
  erreichbar;
- 1440 × 900, 390 × 844 sowie 360 × 800 bei 200 % Textzoom visuell geprüft;
- keine Konsolen- oder CSP-Fehler.

Der erste Quellen-URL-Lauf hatte ausschließlich für die UBA-Lampenseite einen
transienten Fetch-Fehler; der unveränderte Wiederholungslauf erreichte alle 20
Quellen mit HTTP 200. Das ist ein technischer Erreichbarkeitsnachweis und kein
neuer redaktioneller Review. Inhaltsversion, Geltungsbereich, Lizenz,
Attribution und Prüffristen bleiben unverändert.

Nach dem Pages-Build `1126772460` (`built`) bestand derselbe Stand als
Artefaktcommit `2f1127fff2eb9b8c7fc673cffee0ca3b40e18e72` den frischen externen
Browser-Smoke. Der Lauf bestätigte Source `5e7b62d`, No-Login-Direktaufruf,
DE/EN samt Reload, `GUmmiband`, den vorsichtigen Medikamentenhinweis, beide
Same-Origin-CSS-Dateien, fehlende Inline-Styles, null Ressourcen-/Konsolenfehler
und 360 × 800 bei 200 % Textzoom. GitHub Pages selbst liefert keinen
app-eigenen CSP-Header; die exakte strikte Response-CSP bleibt deshalb ein
lokaler Browsernachweis am identischen Runtimeartefakt.

## Portal-DEV-Revalidierung

Portal & Identity veröffentlichte anschließend die öffentliche Redirect-
Korrektur als Portal-Commit
`9643129b5688e4bd925b3ac198619ac260a61071`. GitHub-CI-Lauf `30703116695`
und Railway-Staging-Deployment
`f82ad853-1134-48cb-a67d-bb05bf754b99` sind grün beziehungsweise aktiv.

Cookie-lose `GET`- und `HEAD`-Aufrufe von
`https://dev.milos-apps.de/apps/waste-guide` antworteten mit HTTP 302 und dem
exakten unabhängigen Waste-Guide-DEV-Ziel. Die sichtbare 390-mal-844-QA
bestätigte v2.0.3, Grid-/Flexlayout, DE/EN-Ziele von mindestens 44 Pixeln,
fehlenden horizontalen Überlauf und null Konsolenfehler. Die entsprechende
Productionroute blieb HTTP 404. Dieser Portalnachweis verändert weder das
App-Artefakt noch Inhaltsversion oder Quellenreview.

## QA-Erweiterung für Inhaltsversion 2026.08.01-1

### Runde 1: Suchbreite und Informationshierarchie

Der gemeldete Nulltreffer `Plastikblume` wurde zusammen mit Kunstblumen,
getrennten Komposita, Kunststoffschüsseln, Spielzeug und weiteren typischen
Haushaltsgegenständen reproduziert. Der neue Eintrag trennt Nichtverpackungen
von Verpackungen und priorisiert Elektronik beziehungsweise Batterien. Der
reine Materialbegriff `Plastik` bleibt absichtlich eine Auswahl.

Die Startseite wurde auf 60 rem begrenzt. Die Kontolos-/Standort-Zeile und der
redundante leere Ergebniszustand entfallen. Titel und Erklärung sind kürzer,
die Suche bleibt beim Scrollen durch lange Ergebnisse als Sticky-Dock
erreichbar, und der optionale Verlauf sitzt direkt unter Suche und Beispielen.
Der bisher getrennte Vertrauens- und Metabereich ist in eine einzige
eingeklappte Zeile überführt.

Erste Regression:

- 72/72 Unit-, Inhalts-, Such-, Übersetzungs- und Speichertests;
- 21/21 amtliche oder kommunale URLs technisch erreichbar;
- 26 Browserprüfungen, davon 14 grün und 12 Folgefehler nach einem veralteten
  Interaktionsschritt im nun progressiv offengelegten Quellenbereich.

Der erste Browserbericht zeigte keinen Laufzeitdefekt: Die englische Prüfung
suchte den Quellenknopf im geschlossenen `details`-Element. Dadurch blieb die
gemeinsam verwendete Desktopseite auf Englisch und erzeugte die folgenden
Timeouts. Der Test öffnet den Bereich nun wie ein Nutzer. Zusätzlich wurde der
bereits kompakte Hero noch einmal verkürzt.

### Runde 2: vollständige Regression und visuelle Kontrolle

- 74/74 Unit-, Inhalts-, Quellen-, Such-, DE/EN- und Speichertests;
- 26/26 Browser-E2E-Prüfungen;
- neue Suchfälle: `Plastikblume`, `Kunstblumen`, `Plastik Blume`,
  `Plastikschüssel`, `Kleiderbügel aus Plastik`, `Plastikspielzeug`,
  elektronisches Plastikspielzeug und Spielzeugauto mit Batterie;
- 1440 × 900, 390 × 844, Querformat, 640-px-Reflow und 360 × 800 bei
  200 % Textzoom ohne horizontalen Überlauf;
- Sticky-Suche nach Scroll bis zum Seitenende weiterhin im Sichtfeld;
- Tastatur, Fokus, Screenreader-Namen, Live-Status, 44-px-Ziele, Reduced
  Motion, Dark Mode, Offline, Rücknavigation, Teilen und Drucken grün;
- Dialoge sichtbar rund und kompakt; keine Konsolenfehler.

Die visuelle Kontrolle der erzeugten Desktop-, Smartphone-, Dark-Mode- und
200-%-Aufnahmen bestätigte die Informationshierarchie. Ein langes Wort im
Entsorgungsweg erhielt zusätzlich kontrollierten Umbruch, obwohl die
Dokumentbreitenmessung bereits grün war.

Die Quellenprüfung bleibt getrennt: Der Online-Check beweist Erreichbarkeit.
Nur der neue Kunststoff-Nichtverpackungsfall und seine regionalen Overrides
wurden fachlich am 01.08.2026 anhand von UBA, BSR, Stadtreinigung Hamburg und
AWM München redaktionell ergänzt. Bestehende Einträge behalten ihre eigenen
Reviewtermine; die früheste erneute Prüfung bleibt 30.09.2026.

### Externe DEV-Verifikation

Der non-force Quellpush veröffentlichte exakt
`373f1163293baf6aed285d82d13d8bf35b280cf5`. Das daraus reproduzierbar gebaute
25-Dateien-Artefakt mit Quellbaum
`849a77d936c1dad085ac9b6b33ec7dd57b0f55cd` wurde als
`141231c66f0e6131bc068e2ea5a4d954d32fd32e` auf `dev-pages` veröffentlicht;
GitHub Pages meldete anschließend `built`.

Der versionierte Remote-Smoke bestätigte an der echten HTTPS-URL App-Key,
DEV-Umgebung, Inhaltsversion `2026.08.01-1`, Source-SHA,
`productionApproved=false`, direkten Aufruf ohne Login, Portalunabhängigkeit,
Shell v2.0.3 und 200-%-Textzoom. Eine zusätzliche frische 390-mal-844-
Browserprüfung suchte `Plastikblume`, fand den Nichtverpackungsweg und die
Gelbe-Tonne-Warnung, maß null horizontalen Überlauf und hielt die Sticky-Suche
mit 3 Pixeln Abstand am oberen Rand. Der Kontext enthielt null Cookies und
meldete null Konsolenfehler.

Die exakte ausgelieferte Health-Antwort lautet:

```json
{"status":"ok","appKey":"waste-guide","environment":"DEV","contentVersion":"2026.08.01-1","productionApproved":false,"sourceCommit":"373f1163293baf6aed285d82d13d8bf35b280cf5"}
```

Diese Deployment-Evidenz erneuert keine bestehenden redaktionellen
Reviewtermine und ist vom neuen Kunststoffquellenreview getrennt.

Portal & Identity bestätigte anschließend read-only am aktiven Portal-DEV-Stand
`811c01c06d715999c494d45a9ef1af485e343afc` und Railway-Deployment
`4ce30ff0-cc0e-4a31-8cfb-aa65f5d01d1d`: Cookie-lose `GET`- und `HEAD`-Aufrufe
der bestehenden Route lieferten HTTP 302 exakt auf die App-URL; App und Health
lieferten HTTP 200 mit Inhaltsversion `2026.08.01-1` und Source `373f116`.
Die Productionroute blieb HTTP 404. Es erfolgte keine Portalmutation.

## QA-Erweiterung für public-app-essentials/v1.0.0

Die Migration übernimmt ausschließlich den festen Shared-Commit
`b09e09008ff05fe87f05bc647a7c4964ff13e6f6`. Loader,
No-Cookies-Datenschutzhinweis und Teilen sind aktiv; Datum und allgemeine
Ortssuche bleiben ausgeschaltet. Die optionale Entsorgungsregion, Inhaltsversion
`2026.08.01-1`, Geltungsgebiet, Lizenzen und redaktionelle Reviewtermine wurden
nicht verändert.

### Verbesserungsrunde 1: Vertragskomposition und Interaktionspfade

Der erste Shared-Validatorlauf fand eine zweite Dokumentüberschrift: Der
Loader-Beispieltitel war als `h1` eingebunden, während der Shell-Vertrag genau
eine Fach-`h1` verlangt. Da `data-milos-loading-title` tag-agnostisch ist,
verwendet die App nun einen Absatz. Beide Validatoren sind damit gleichzeitig
grün.

Die vorhandene Browsermatrix erreichte zunächst 24 von 26 Prüfungen. Die beiden
Fehler waren erwartbar veraltete Selektoren für den früheren app-eigenen
„Hinweis teilen“-Knopf. Die Regression wurde auf den gemeinsamen
`<milos-share-button>` umgestellt und um native Freigabe, Clipboard-Fallback,
Nutzerabbruch, Quellenattribution und die private Verlaufsgrenze erweitert.

### Verbesserungsrunde 2: lokale Löschwahrheit und visuelle QA

Die zweite Produktprüfung fand eine Konsistenzlücke: „Lokale Angaben löschen“
entfernte Region und Verlauf, aber noch nicht den lokalen Komfortwert für den
geschlossenen Datenschutzhinweis. Dieser Schlüssel wird nun ebenfalls entfernt;
beim nächsten Start erscheint der Hinweis wieder. Die Kernsuche bleibt auch bei
gesperrtem Speicher unverändert nutzbar.

Visuell geprüft wurden der 56-Pixel-Desktop- und 48-Pixel-Mobil-Loader, der
kompakte gerundete Datenschutzhinweis, Dark Mode, Desktop 1440 × 900,
Smartphone 390 × 844, Querformat und 360 × 800 bei 200 Prozent Textzoom. Der
Loader endet ausschließlich mit `milosapps:ready`; beide CSS-Dateien bleiben
externe Same-Origin-Ressourcen unter strikter `style-src 'self'`-CSP.

Lokaler Abschluss vor Veröffentlichung:

- public-app-shell- und public-app-essentials-Validator samt beiden 5er-Locks:
  PASS;
- 78/78 Unit-, Inhalts-, Quellen-, Such-, Übersetzungs-, Speicher- und
  Essentials-Prüfungen;
- 29/29 Browser-E2E-Prüfungen;
- 21/21 amtliche oder kommunale Quellen technisch erreichbar;
- DE/EN samt Reload, Tastatur, sichtbarer Fokus, 44-Pixel-Ziele, Reduced
  Motion, Offline und No-Login grün;
- null Browser-, Konsolen- oder CSP-Fehler und kein horizontaler Überlauf.

Der Online-Quellencheck ist weiterhin nur ein technischer
Erreichbarkeitsnachweis. Diese Shell-/Interaktionsmigration erneuert keinen
fachlichen Quellenreview.

GitHub Pages normalisiert die ausgelieferten `.js`-Dateien auf
`application/javascript; charset=utf-8`; der lokale strikte DEV-Server liefert
den Vertragswert `text/javascript; charset=utf-8`. Beide JavaScript-MIME-
Essenzen werden vom Browser als Module ausgeführt. Der externe Smoke akzeptiert
deshalb beide gültigen Providerformen, verlangt für beide CSS-Dateien weiterhin
`text/css`, prüft die tatsächliche Modulregistrierung und hält am lokalen
exakten MIME-Gate fest.

### Externe DEV-Verifikation

Der non-force Quellpush veröffentlichte exakt
`aedb04669a3ea53d7cae96f3cf3863fb55eb36e1`. Das daraus gebaute
32-Dateien-Artefakt mit Quellbaum
`035a5bf16942f990be011196507d75c5daad9e98` wurde als
`1387f040bb0d33fec5cbd1586772f403768550f6` auf `dev-pages`
veröffentlicht. Vor dem Push wurden alle in `deployment.json` genannten
SHA-256-Werte byteweise gegen den tatsächlichen Dateisatz geprüft. GitHub Pages
Build `1128207700` endete mit Status `built`.

Der frische externe Smoke bestand mit No-Login-Direktaufruf, Healthidentität,
DE/EN samt Reload, Shell v2.0.3, Essentials v1.0.0, beiden 5er-Locks,
No-Cookies-Hinweis, Share-Fallback mit Quellenattribution, fehlenden privaten
Verlaufswerten sowie 390 × 844 und 360 × 800 bei 200 Prozent Textzoom. Es gab
keine fehlgeschlagenen Ressourcen, Konsolenfehler, Inline-Styles oder
horizontalen Überlauf.

Die ausgelieferte Health-Antwort lautet:

```json
{"status":"ok","appKey":"waste-guide","environment":"DEV","contentVersion":"2026.08.01-1","productionApproved":false,"sourceCommit":"aedb04669a3ea53d7cae96f3cf3863fb55eb36e1"}
```

Der technische Publish erneuert weder Inhaltsversion noch Reviewtermine,
Gültigkeitsgebiet, Lizenz oder Attribution der redaktionellen Daten.

## Source-only LF-Regressionsschutz für Essentials

Ein enger Attributvertrag unter `vendor/milosapps-essentials/v1/.gitattributes`
erzwingt für den gesamten vendorten Essentials-Bestand `text eol=lf`. Der
Essentials-Pin, die fünf gelockten Laufzeitartefakte, App-Code, Inhaltsversion
und das veröffentlichte Pages-Artefakt bleiben unverändert.

Der Sync wurde erneut aus exakt Shared-Commit
`b09e09008ff05fe87f05bc647a7c4964ff13e6f6` ausgeführt. Der vendorte Prüfer
bestätigte danach alle fünf SHA-256-Werte. Ein zusätzlicher Vertragstest prüft
die enge `.gitattributes`-Datei und lehnt CRLF in jedem gelockten Artefakt ab.
Abschließend wird der Commit in einen frischen Windows-Checkout mit aktivem
`core.autocrlf=true` übernommen und dort erneut bytegenau verifiziert.

Dieser Nachweis ist bewusst source-only: kein Pages-Deploy, keine
Portalmutation und keine Productionänderung. Er erneuert insbesondere keinen
redaktionellen Quellenreview.
