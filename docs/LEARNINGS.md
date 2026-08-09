# Welcher-Müll-Erkenntnisse

## 03.08.2026 · Suchqualität braucht Begriffsebenen statt immer mehr Fuzzy

Ein einzelner Ähnlichkeitswert vermischt vier verschiedene Dinge: einen echten
Gegenstand, ein Synonym, einen Tippfehler und ein zufällig enthaltenes
Teilwort. Dadurch konnte `Plastik` über zusammengesetzte Aliaswörter bis zum
Elektrogerät streuen; `Karten` zog über ein unscharfes Keyword den
Pizzakarton nach. Die Suche trennt diese Ebenen nun: Namen und Synonyme bleiben
stark, Tippfehler gelten nur für Namen/Synonyme, Keywords werden nicht unscharf
erweitert und natürlichsprachliche Treffer brauchen ganze Wortgruppen.

Für wenige fachlich stabile Kombinationen ergänzt der Datenbestand explizite
Suchabsichten, etwa Kunststoff + Verpackungsform oder Elektronikmerkmal. So
führt `Plastikflasche` zur bedingten Verpackungsantwort,
`kaputte Plastikgabel` zum vorsichtigen Kunststoffgegenstand und
`Batteriespielzeug` zu Elektro. Ein breites `Plastik` zeigt sofort den
allgemeinen Nichtverpackungsfall; die Kunststoffverpackung steht direkt nach
der Kurzantwort als kuratierte Alternative. Unbekannte Wörter erzeugen keinen
geratenen Tonnenweg, sondern eine kurze material- und funktionsbasierte
Eingrenzung.

Evidenz: 91/91 Unit-/Inhalts-/Such-/Vertragstests, 31/31 Browser-E2E,
22/22 erreichbare amtliche Quellen sowie visuelle QA bei 1440 × 900,
390 × 844 und 360 × 800 bei 200 Prozent. Positive Regressionen umfassen
`Ölgemälde`, `Ölgemäde`, `Kinderriegel`, `Schokolade`,
`Plastikflasche`, `Plastik`, `Karten` und sachfremde Teilworttreffer.

Gültigkeitsgrenze: Eine gute Suche ersetzt keinen redaktionellen Bestand.
Gemälde und Lebensmittel wurden deshalb als belegte Fachfälle ergänzt; für
wirklich unbekannte Gegenstände bleibt ein sicherer nächster Prüfschritt besser
als ein statistisch ähnlicher, aber falscher Treffer.

## 03.08.2026 · Schlüsselbegriffe statt doppelter Statuszeilen

Eine Sofortantwort wird nicht klarer, wenn Gegenstand, Kategorie, Weg und
Sicherheitsstatus jeweils noch ein eigenes Label erhalten. Sobald der Weg
selbst bereits „örtlich prüfen“ sagt, ist ein gleichlautendes Badge darunter
reine Wiederholung. Waste Guide zeigt deshalb links nur Symbol und Gegenstand
mit Materialkategorie; rechts werden konkrete, ausgeschriebene Wege wie
`Restmüll`, `örtlich prüfen` oder `örtliche Wertstoffsammlung` hervorgehoben.
Der allgemeine Geltungssatz steht erst bei den Details.

Evidenz: zwei QA-Runden, 79/79 Unit-/Fachtests, 29/29 Browser-E2E und visuelle
Desktop-/390-px-Prüfung. Gültigkeitsgrenze: Gefahrhinweise werden nicht
entfernt, sondern als ausgeschriebener Vorsichtshinweis am konkreten Weg
bewahrt; Farbe bleibt ergänzend.

## 03.08.2026 · answer-first Ergebnis und flüchtige Komfortzustände

### Eine Trefferkarte muss die Entscheidung vor der Erklärung liefern

Ein fachlich vollständiger Text ist noch keine schnelle Antwort. Auf dem
Smartphone lag der konkrete Weg zwar oben, erkannter Gegenstand, Einordnung und
Route waren aber visuell getrennt. Die Ergebnisoberkante bildet nun eine
zusammenhängende, screenreadertaugliche Aussage: sichtbares Symbol plus
„Erkannt“, Gegenstand, Pfeil plus „Entsorgungsweg“ und konkrete Route. Danach
folgen erst Grund, Schritte, regionale Grenze, Ausnahmen und Quellen. Beim
Tippfehler `Gummibnad` steht dadurch sofort „Gummiband → Kleine Teile:
Restmüll · große Teile und Reifen örtlich prüfen“.

Ein Symbol darf den Fachweg nicht verfälschen: Das Tonnen-Symbol erscheint nur
bei echtem Restmüll. Papier, Bio, Glas, Verpackung, örtliche Prüfung und
Rücknahmestellen besitzen getrennte Umrisse; Text und Sicherheitskennzeichnung
bleiben immer vorhanden. Farbe allein trägt keine Bedeutung.

Evidenz: positive Suchregressionen für Gummi, Plastikblume, Tippfehler,
Gefahrfälle und Mehrdeutigkeit; DOM-Reihenfolge; 390 × 844, 1440 × 900 und
360 × 800 bei 200 Prozent; sichtbare Screenshots und vollständige E2E-Matrix.

Gültigkeitsgrenze: Die Oberfläche darf nur bereits redaktionell belegte Wege
verdichten. Das Redesign erneuert weder Inhaltsversion noch `reviewedAt`,
`reviewDue`, Lizenz oder Geltungsgebiet.

### Weniger optionale Persistenz ist oft verständlicher als mehr Consent-UI

Region, Verlauf und Sprache waren Komfortfunktionen, erzeugten aber einen
großen Einstellungsblock und mehrere optionale Gerätezustände. Die Region lebt
nun nur bis Reload, Verlauf ist deaktiviert und Englisch steht sichtbar als
`?lang=en` in der URL. Die Shell wird dafür aus einem inerten Template mit
einem app-eigenen, speicherfreien Sprachadapter montiert. Es gibt keine
Web-Storage-Zugriffe und deshalb keinen Schein-Einwilligungsbanner; ein
permanenter Datenschutzlink und ein maschinenlesbares Endgeräteinventar bleiben
erhalten.

Offline-Nutzung bleibt eine bewusst angeforderte Fachfunktion: Erst
„Offline aktivieren“ registriert den Worker und cached öffentliche App-Dateien.
Die frühere automatische Workerregistrierung wird separat entfernt. Alte
Web-Storage-Werte werden nicht mehr gelesen oder geschrieben und bleiben über
die Website-Daten des Browsers entfernbar.

Evidenz: instrumentierte Browserregression meldet null Web-Storage-Zugriffe;
Region fällt nach Reload auf Deutschland zurück; DE/EN überlebt Reload nur
über die URL; vor der Offline-Aktion existiert keine Registrierung, danach
exakt `offline-sw.js`; No-Cookies-Banner fehlt, Datenschutzlink ist dauerhaft
sichtbar.

Gültigkeitsgrenze: Service Worker, CacheStorage, Web Share und Clipboard sind
weiterhin Endgerätezugriffe. Sie sind mit Zweck, Trigger und Laufzeit
dokumentiert und werden nur für die ausdrücklich ausgelöste Funktion genutzt.
Das ist eine technische Produktgrenze und keine Rechtsberatung.

## 02.08.2026 · bytegenaue Vendor-Locks unter Windows

Ein korrekter SHA-256-Lock genügt nicht, wenn ein späterer Windows-Checkout
Textdateien durch `core.autocrlf` verändert. Die Zeilenendenregel gehört deshalb
direkt in das betroffene Vendorverzeichnis: `* text eol=lf` schützt alle
aktuellen und später hinzukommenden Essentials-Artefakte, ohne das übrige
Repository global umzuschreiben.

Evidenz: erneuter Sync aus dem unveränderten Shared-Pin, portabler
Essentials-Validator, Vertragstest für Policy und CRLF-Freiheit sowie frischer
Windows-Recheckout mit aktivem `core.autocrlf=true`.

Gültigkeitsgrenze: Die Regel schützt ausschließlich den lokal vendorten
Essentials-v1-Bestand. Sie ändert weder Runtime noch Shared-Pin und ersetzt
keinen fachlichen App-, Browser- oder Quellenreview.

## 02.08.2026 · public-app-essentials/v1.0.0

### Gemeinsame Loader müssen mit der Überschriftenstruktur des Verbrauchers komponieren

Der neue Loader war visuell korrekt, erzeugte mit einem beispielhaften `h1`
aber eine zweite Dokumentüberschrift und fiel dadurch durch den bestehenden
Shell-Validator. Der Datenmarker `data-milos-loading-title` ist tag-agnostisch;
ein Absatz erhält dieselbe Darstellung, ohne die Fachhierarchie zu verändern.
Ein Verbraucher-Build prüft deshalb beide Verträge gemeinsam und verlangt
weiterhin exakt eine Dokument-`h1`.

Evidenz: beide portable Shared-Validatoren PASS, 78/78 Unit-/Vertragstests und
29/29 Browserprüfungen.

Gültigkeitsgrenze: Das ist eine Integrationsregel für Apps, deren eigentliche
Oberfläche bereits eine primäre Überschrift besitzt. Der Loader darf trotzdem
einen zugänglichen Status und sichtbaren App-Namen behalten.

### „Lokale Angaben löschen“ muss auch Komfortzustände gemeinsamer Bausteine kennen

Ein Datenschutzhinweis erzeugt keine Einwilligung, speichert aber optional
seinen geschlossenen Zustand. Wird dieser Wert bei einer app-eigenen
„alles lokal löschen“-Aktion vergessen, ist die sichtbare Löschzusage falsch.
Waste Guide entfernt deshalb Region, Verlauf und den app-namensräumigen
Hinweiszustand gemeinsam; Sprachpräferenz und fachlicher Inhalt bleiben davon
getrennte Verträge.

Evidenz: E2E löscht die Werte, lädt neu und erwartet den No-Cookies-Hinweis
erneut. Gesperrter `localStorage` bleibt durch bestehende Speichertests
abgedeckt.

Gültigkeitsgrenze: Der exakte Schlüsselsatz ist app- und vertragsversioniert;
andere Verbraucher dürfen ihn nicht unbesehen kopieren.

### Einheitliches Teilen braucht app-eigene Fachzusammenfassung

Der gemeinsame Baustein vereinheitlicht nur Bedienung, native Freigabe,
Clipboard-Fallback und Abbruch. Der App-Payload bleibt fachlich: Name,
Entsorgungsweg, redaktioneller Stand, eine Quellenattribution und der kanonische
`?item=`-Deep-Link. Lokaler Verlauf und Region werden nicht ungefragt geteilt.

Evidenz: native, Clipboard- und Abort-Regressionspfade in der Browsermatrix;
Payload-Prüfung gegen frühere Suchbegriffe.

Gültigkeitsgrenze: Die erste verknüpfte Primärquelle ist eine knappe
Attribution, keine vollständige Quellenliste. Vollständige Gültigkeit bleibt in
der Ergebnisansicht und den redaktionellen Daten.

## 01.08.2026 · Inhaltsversion 2026.08.01-1

### Materialsuche braucht eine fachliche Verzweigung, nicht nur mehr Fuzzy

`Plastikblume` war kein Rechtschreibproblem, sondern eine Datenlücke zwischen
Verpackung und Kunststoffgegenstand. Ein aggressiveres unscharfes Ranking hätte
den Begriff fälschlich zur Verpackung schicken können. Der Bestand führt nun
einen vorsichtigen Nichtverpackungsfall, während `Plastik` selbst Verpackung und
Gegenstand als Auswahl zeigt. Elektronik- und Batteriephrasen bleiben höher
priorisiert.

Evidenz: 74/74 Unit-/Inhalts-/Suchtests einschließlich Komposita,
Pluralformen, DE/EN und Gefahrabgrenzungen; 26/26 Browserprüfungen.

Gültigkeitsgrenze: Berlin und Hamburg sammeln viele Kunststoffgegenstände über
die Wertstofftonne, München nennt für eine Kunststoff-Gießkanne den
Wertstoffhof. Diese drei Belege ergeben keine bundesweite Tonnenregel.

### Die Suche muss beim Ergebnislesen im Arbeitskontext bleiben

Ein großer Hero und eine nur am Seitenanfang erreichbare Suche zwingen nach
langen Ergebnissen zur Rücknavigation. Ein schmalerer Inhaltsrahmen, ein
Sticky-Suchdock und ein direkt darunter liegender Verlauf halten die
Hauptaufgabe im Vordergrund. Sekundäre Vertrauens-, Quellen- und Metadaten
passen in eine einzige progressive Offenlegung.

Evidenz: Browsergeometrie bei 1440 × 900, Scroll bis zum Seitenende, 390 × 844,
360 × 800 bei 200 % Textzoom, Tastatur und visuelle Screenshots.

Gültigkeitsgrenze: Sticky darf weder Inhalt überdecken noch den Druckpfad
beeinflussen. Beide Grenzen sind eigene Regressionen; auf sehr schmalen
Viewports reflowt die Suchsteuerung weiterhin einspaltig.

## 01.08.2026 · public-app-shell/v2.0.3

### Textzoom braucht intrinsische Breitentests, nicht nur Dokument-Overflow

Die zentrale Shell-Korrektur beseitigte den globalen Body-Floor. In der App
blieben trotzdem zwei unabhängige Reflowquellen: eine horizontal scrollende
Beispiel-Chip-Leiste und lange deutsche Zusammensetzungen in einem
eingeklappten `summary`. Beide konnten die intrinsische Breite vergrößern, ohne
bei normaler Smartphonebreite aufzufallen. Mobile Chips reflowen nun, lange
Vertrauenstexte dürfen kontrolliert umbrechen und Grid-/Flex-Kinder setzen
`min-width: 0`.

Evidenz: explizite Regression 360 × 800 mit `font-size: 200%`, feste
38-Pixel-Shell-Ikone, 44-Pixel-Ziele, Dokument- und Containerbreiten; 26/26
Browser-E2E-Prüfungen bestanden.

Die visuelle 200-%-Aufnahme zeigte zusätzlich, dass ein formal
überlauffreies zweispaltiges Suchfeld vom vergrößerten Button fast vollständig
zusammengedrückt werden konnte. Auf 360 Pixeln reflowt die Suche deshalb
einspaltig; die Regression prüft neben der Dokumentbreite nun auch eine
sinnvoll bedienbare Eingabebreite.

Gültigkeitsgrenze: Der Test bildet Root-Textzoom reproduzierbar ab, aber keinen
bestimmten Browser-Chrome-Zoomdialog oder eine reale Screenreader-Ausgabe.

### Visuelle QA findet interne Kollapsfehler trotz grüner Überlaufmetrik

Eine frühe Smartphone-Messung meldete null horizontalen Überlauf, obwohl der
Ergebnisweg intern auf eine schmale Grid-Spalte kollabierte und Wörter
buchstabenweise umbrachen. Erst der Screenshot machte den Fehler sichtbar.
Die Regression vergleicht deshalb jetzt Karten- und Routenbreite; die mobile
Grid-Platzierung ist explizit einspaltig.

Evidenz: Smartphone-Screenshot bei 390 × 844, anschließende geometrische
Regression und vollständige Wiederholung der Matrix.

### Eine gemeinsame Shell muss unter der strengsten Verbraucher-CSP laufen

`public-app-shell/v2.0.2` fügte Shadow-DOM-Styles per `innerHTML` ein und setzte
Theme-Tokens per `host.style.setProperty`. Unter `style-src 'self'` registrierte
sich die Komponente semantisch, fiel visuell aber auf UA-Defaults zurück. Eine
app-eigene Hashliste würde nur einen Verbraucher reparieren und den gemeinsamen
Vertragsdefekt verdecken. Der lokale Server behält deshalb die strikte CSP; die
Korrektur wurde in `public-app-shell/v2.0.3` als externe Same-Origin-Komponenten-
und Theme-CSS veröffentlicht. Der App-Lock umfasst beide Stylesheets, Bootstrap,
Komponente und Validator.

Gültigkeitsgrenze: GitHub Pages liefert derzeit keine app-eigenen Response-CSP-
Header. Ein dort optisch gesunder Stand beweist daher nicht die CSP-Kompatibilität
für spätere Hosts oder Portal-nahe Umgebungen.

## 30.07.2026 · Inhaltsversion 2026.07.30-2

### Materialwörter brauchen breite Synonyme und enge Sicherheitsgrenzen

Ein Begriff wie `Gummi` beschreibt zugleich kleine Haushaltsartikel,
zusammengesetzte Wörter und sicherheitsrelevante Sonderfälle. Ein einziger
generischer Treffer wäre deshalb zwar breit, aber fachlich riskant. Der Bestand
verknüpft häufige Zusammensetzungen mit einem vorsichtigen Alltagsfall und führt
Auto- und Motorradreifen separat. Das Suchranking gewichtet konkrete lange
Begriffe höher und begrenzt Präfixboni über das Längenverhältnis.

Evidenz: 19 neue Suchregressionen einschließlich `GUmmiband`, `Gummibänder`,
`Gummibnad`, `Haargummi`, `Radiergummi`, `Latexhandschuhe`, `Fahrradreifen` und
`Autoreifen`; 61/61 Unit-/Datenprüfungen bestanden.

Gültigkeitsgrenze: Ein Materialname allein verrät nicht Größe, Produktart oder
örtliches Sammelsystem. Die App zeigt deshalb bei großen Gummiteilen und
Fahrradreifen einen lokalen Prüfschritt und rät nicht pauschal eine Tonne.

### Optionale Einstellungen gehören in progressive Offenlegung

Region und lokaler Verlauf sind nützliche Nebenfunktionen, aber nicht die
Hauptaufgabe. Als dauerhaft große Inhaltskarte erzeugten sie Scrollweg und
verdrängten Treffer. Ein kompakter, fokussierter Dialog hält die Einstellungen
auffindbar, während Suche und Entsorgungsweg im ersten Sichtfeld bleiben.

Evidenz: Browserregressionen für Suchposition, Dialogabmessungen,
Dialogrundung, Escape-/Fokuszustand und sofort sichtbaren Ergebnisweg; 22/22
E2E-Prüfungen bestanden.

Gültigkeitsgrenze: Progressive Offenlegung darf Datenschutzangaben nicht
verstecken. Der Dialog nennt weiterhin ausdrücklich, dass keine
Standortabfrage erfolgt und Angaben nur auf dem Gerät gespeichert werden.

## 30.07.2026 · Inhaltsversion 2026.07.30-1

### Quellenpflege braucht drei getrennte Signale

Ein erreichbarer Link, ein redaktionell gültiger Inhalt und ein geklärter
Nutzungsstatus sind verschiedene Dinge. Der Datenvertrag hält deshalb
`verifiedAt`, `reviewDue`, Geltungsgebiet, Lizenz und Attribution getrennt.
Der Online-Check prüft nur die Erreichbarkeit.

Evidenz: Eine zunächst verwendete amtliche Berlin-PDF lieferte 404. Statt eine
alte URL zu tolerieren, wurde eine aktuelle kommunale HTML-Quelle für den eng
begrenzten Spritzen-Sicherheitsfall gewählt. Später trat bei einer UBA-Seite
ein einmaliger Fetch-Fehler auf; erst der erfolgreiche Wiederholungslauf
17/17 unterschied die Netzwerkstörung von einer dauerhaft veralteten Quelle.

Regression: Inhaltsvertrag und `test:sources:online`.

Gültigkeitsgrenze: Ein HTTP 200 beweist nicht, dass sich eine fachliche Aussage
nicht geändert hat. Die manuelle redaktionelle Prüfung bis `reviewDue` bleibt
notwendig.

### Suchwörter dürfen exakte Begriffe nicht überstimmen

Generische Keywords wie „Batterie“ können bei mehreren Sicherheitsfällen
vorkommen. Gleiche Gewichtung führte dazu, dass `Baterie` zeitweise den
beschädigten statt den allgemeinen Akku priorisierte. Namen und Synonyme
erhalten nun deutlich mehr Gewicht als Keywords; kurze Fuzzy-Matches bleiben
begrenzt.

Evidenz: Unit-Fälle `Baterie`, `Akkus`, „aufgeblähter Handyakku“ und
„generisches Keyword verdrängt keinen exakten Batterie-Treffer“; Baseline
Commit `9b6aaec`.

Gültigkeitsgrenze: Rankingtests schützen nur den katalogisierten Wortschatz.
Neue Begriffe und Synonyme brauchen eigene positive und mehrdeutige
Regressionen.

### Mehrdeutigkeit ist ein eigener Produktzustand

„Glas“ darf nicht automatisch Altglas bedeuten. Die App zeigt Fensterglas,
Verpackungsglas, Trinkglas, Lampen und andersfarbige Flaschen als unterscheidbare
Auswahl. Jede Schaltfläche muss dabei den Gegenstand im zugänglichen Namen
nennen.

Evidenz: Browser- und Screenreader-Nähe in QA-Runde 2; Fix und Regression in
Commit `9a17a2c`.

Gültigkeitsgrenze: Eine Auswahl ist nur so vollständig wie der aktuelle
redaktionelle Bestand. „Unklar“ bleibt zulässig und sicherer als ein schwacher
Treffer.

### URL, sichtbarer Zustand und Verlauf müssen dieselbe Wahrheit zeigen

Kurze, unbekannte oder mehrdeutige Suchen sind keine konkrete Item-Seite. Bleibt
die vorherige `?item=`-ID bestehen, zeigt Reload einen anderen Zustand als die
aktuelle Oberfläche. Nicht spezifische Zustände entfernen deshalb die alte ID;
Zurück stellt den vorherigen konkreten Treffer wieder her.

Evidenz: E2E „unklare Zustände entfernen veraltete Deep-Links“ und Commit
`9a17a2c`.

### Regionale Unsicherheit gehört in das Datenmodell

Ein bundesweiter Grundsatz, ein kommunaler Sammelname und eine örtliche
Annahmestelle sind nicht austauschbar. Regionsprofile enthalten deshalb nur
explizit belegte Overrides. München 2026 wird als Wertstoffinsel gezeigt, ohne
daraus eine Regel für Deutschland zu machen. Medikamente bleiben auch mit
Bundesquelle sichtbar örtlich zu prüfen.

Evidenz: Datenvertrag „kommunale Unterschiede werden nicht zur
Deutschland-Regel“, E2E für München und manuelle Browserprüfung für Medikamente
mit Berlin-Link.

Gültigkeitsgrenze: Berlin, Hamburg und München sind keine Stellvertreter für
andere Kommunen. Ohne passendes Profil verweist die App auf das örtliche
Abfall-ABC.

### Readiness braucht Identität, nicht nur Erreichbarkeit

Ein fremder Dienst auf einem Standardport kann einen generischen HTTP-200-Test
täuschen. `waste-guide` verwendet deshalb fest Port 4318, prüft vor E2E-Reuse
App-Key, Umgebung und Production-Freigabe und beendet nur selbst gestartete
Prozesse.

Evidenz: `/healthz`, E2E-Preflight und nachgewiesener Startabbruch bei belegtem
Port.

Gültigkeitsgrenze: Diese Prüfung bestätigt die App-Identität und den
DEV-Status, nicht die fachliche Vollständigkeit des Inhalts.

### Deployment-Evidenz und redaktioneller Review sind getrennte Verträge

Der öffentliche GitHub-Pages-DEV wurde aus dem fest gepinnten Quellcommit
`461732e` gebaut. Pages-Status, Artefakthashes, `/healthz` und externer
Browser-Smoke belegen die ausgelieferte Revision. Sie ändern weder
`reviewedAt`, `reviewDue` noch den Lizenzstatus der 17 Quellen.

Evidenz: Pages-Build `1122927971`, Artefaktcommit `d9e6e45`,
`deployment.json` und `test:remote:dev`.

Gültigkeitsgrenze: Ein technisch gesunder Deploy kann fachlich veraltete Daten
ausliefern. Neue Inhaltsstände benötigen weiterhin einen eigenen
redaktionellen Review und eine bewusst angehobene Inhaltsversion.

### Mobile Zielgrößen müssen auch Links umfassen

Schaltflächen waren ausreichend groß, ein Footer-Link jedoch nur rund 22 px
hoch. Die Zielgrößenprüfung umfasst deshalb auch regionale Links,
Quellenlinks und Footer-Navigation.

Evidenz: visuelle In-App-Browser-Prüfung und Touch-Regression in Commit
`38c03e3`.

### Browser-Module brauchen bei Top-Level-Await eine echte Importkante

Die Reihenfolge mehrerer `type="module"`-Skripte im Dokument ist keine
ausreichende Bereitschaftsgarantie, sobald ein Bootstrap selbst mit
Top-Level-Await weitere Ressourcen lädt. Der Verbraucher importiert den
Shell-Bootstrap deshalb zusätzlich explizit. Eine statische, vom Verifier
prüfbare Shell kann vor der Registrierung getrennt und anschließend per
`customElements.upgrade()` mit einem instanzbezogenen, speicherfreien Adapter
wieder verbunden werden.

Evidenz: reproduzierter Browser-Hänger ohne Importkante; danach 29/29 E2E mit
genau einer Shell, genau einer H1, ausgeblendetem Loader und null Logs.

### Physischer Assetpfad und öffentliche Laufzeit-URL sind zwei Verträge

Ein lokaler Quellpfad belegt noch nicht, unter welcher URL ein Build dasselbe
Asset ausliefert. Das Essentials-Manifest führt deshalb `iconPath` und
`iconRuntimePath` getrennt. Der Build- und Remote-Smoke prüfen Status,
`image/svg+xml` und SHA-256-Gleichheit, statt allein auf die Existenz der
Quelldatei zu vertrauen.

Gültigkeitsgrenze: Der Hashnachweis schützt das Loader-Asset und die
Deploymenttreue; er bewertet nicht die redaktionelle Entsorgungsinformation.

### Reflow-Matrizen müssen den längsten produktiven Zustand öffnen

Eine überlauffreie Startseite belegt nicht, dass auch ein echtes Suchergebnis
mit langem Entsorgungsweg, Alternative und Quellen bei 200 Prozent Textzoom
reflowt. Nichttextliche Abstände und Icons sollten geometrisch stabil bleiben;
fachliche Bezeichnungen und hervorgehobene Zielbegriffe müssen dagegen
kontrolliert umbrechen dürfen.

Evidenz: Der externe Plastik-Ergebniszustand maß zunächst 409 Pixel
`scrollWidth` bei 360 Pixel `clientWidth`. Nach der Korrektur und Erweiterung
des E2E-Zoomfalls messen beide Werte 360 Pixel; 31/31 Browserprüfungen sind
grün.

Gültigkeitsgrenze: Diese Regel betrifft Layoutzustände. Sie verbessert weder
Suchranking noch fachliche Richtigkeit und ersetzt keine separate Inhalts- und
Quellenprüfung.

### Byte-Locks brauchen eine enge LF-Policy und einen echten Windows-Checkout

Ein im aktuellen Arbeitsbaum grüner SHA-256-Lock beweist noch nicht, dass ein
vendortes Textartefakt nach einem Windows-Checkout bytegleich bleibt. Jedes
Vendorverzeichnis mit bytegenauen Textlocks führt deshalb eine enge
`.gitattributes`-Regel `* text eol=lf`; beide Validatoren laufen zusätzlich in
einem frischen Worktree mit `core.autocrlf=true`.

Evidenz: Der erste v1.1.3-Recheckout ließ ausschließlich den älteren
Shell-Lock durch Zeilenendenumwandlung scheitern. Nach der app-lokalen
Shell-Vendorregel bestanden Shell- und Essentials-Validator, 91/91 Tests und
alle `i/lf w/lf`-Prüfungen auf Source `c7af103d`.

Gültigkeitsgrenze: Die LF-Regel schützt Reproduzierbarkeit und
Artefaktintegrität; sie ändert weder den gepinnten Vertrag noch Fachinhalt oder
Laufzeitverhalten.

### Custom-Element-Übergänge brauchen einen eigenen Messzustand

Intrinsische SVG-Maße und der fertige Shadow-DOM-Stil belegen nicht den kurzen
Zustand dazwischen. Für Slot-Icons muss ein Browsergate die Critical-CSS
zuerst vollständig laden, den Komponenten-Bootstrap noch blockieren und danach
die Komponenten-CSS separat verzögern. Erst die drei Messpunkte „undefiniert“,
„definiert ohne Komponenten-CSS“ und „fertig“ schließen einen Größen-Flash
belastbar aus.

Evidenz: Der frühere Test sah vor der Critical-CSS korrekte `38 × 38`, während
der ergänzte Zustand mit v1.1.3 tatsächlich `40 × 40` maß. Mit dem atomaren
v1.1.5-Pin messen lokaler und externer Browserlauf in allen drei Phasen maximal
beziehungsweise final exakt `38 × 38`; der unabhängige Loader bleibt `32 × 32`.

Gültigkeitsgrenze: Dieses Gate schützt nur den visuellen Übergang von
CSS-first-Loader zu Web Component. Es bewertet weder Fachinhalt noch
Suchqualität oder redaktionelle Aktualität.

### Tippfehlertoleranz braucht einen sprachlichen Anker

Editierdistanz allein verwechselt kurze, häufige Wörter leicht mit fachlich
gefährlichen Kategorien. `Poster` und `Toaster` liegen nur zwei Änderungen
auseinander; eine großzügige Distanzschwelle machte daraus fälschlich ein
Elektrogerät. Fuzzy-Kandidaten werden deshalb nur noch gebildet, wenn ein
sprachlicher Anker wie ein stabiler Wortanfang oder ein echter benachbarter
Buchstabendreher vorliegt. Kuratierte Alltagsnamen schließen bekannte Fälle.

Evidenz: Vor der Korrektur erhielten `Poster`, `Polster`, `Raster` und `Koster`
den Elektro-Score 87. Danach führen `Poster`, `Plakat`, `Postre` und `Psoter`
zum eigenen Materialcheck, während die drei unverwandten Wörter keinen Treffer
erzeugen; alle bestehenden Tippfehlerregressionen bleiben grün.

Gültigkeitsgrenze: Der sprachliche Anker reduziert semantisch falsche
Fuzzy-Kandidaten, ersetzt aber keinen redaktionellen Eintrag für einen
tatsächlich häufigen Gegenstand und keine Material- oder Sicherheitsprüfung.

### Wiederfinden und fachlich antworten sind zwei getrennte Rechte

Eine hohe Ähnlichkeit darf beim Suchen helfen, aber keinen Entsorgungsweg
autorisieren. Exakte Synonyme und kuratierte Suchabsichten dürfen eine Antwort
öffnen; Präfix-, Teilwort- und Tippfehlerkandidaten zeigen nur einen
bestätigbaren „Meintest du …?“-Schritt. Erst dessen Auswahl startet eine neue
exakte Suche. Damit bleibt ein falscher Vorschlag korrigierbar, bevor eine
gefährliche oder sachfremde Tonne sichtbar wird.

Evidenz: `Toast` war zuvor ein Präfixtreffer für `Toaster`; `Toiaster` blieb
ohne Hilfe. Nun ist `Toast` ein exaktes redaktionelles Lebensmittelsynonym,
`Toiaster` schlägt ausschließlich `Toaster` vor und zeigt vor Bestätigung
keinen Entsorgungsweg. `Polster`, `Raster` und `Koster` erzeugen weder Ergebnis
noch Korrektur. 100/100 Logik-/Inhaltstests und 33/33 Browserprüfungen sichern
DE/EN, Tastatur, Screenreaderstatus, Mobilansicht und 200-Prozent-Reflow ab.

Gültigkeitsgrenze: Das Verfahren kann unbekannte echte Wörter weiterhin als
Vorschlag erkennen oder übersehen. Der entscheidende Sicherheitsgewinn ist,
dass solche unscharfen Kandidaten niemals stillschweigend zur fachlichen
Antwort werden. Neue tatsächliche Gegenstände bleiben redaktionelle Datenarbeit.

### Allgemeine Suche braucht eine fachliche Hierarchie statt mehr Schlagwörter

Ein großer Synonymkatalog allein beantwortet neue Eingaben nicht verlässlich.
Die belastbare Reihenfolge ist: konkreter Gegenstand und Funktion, Gefahr- und
Elektromerkmale, Verpackungsfunktion, Materialleitfaden, regionale Regel.
Allgemeine Materialien dürfen eine vorsichtige Antwort liefern, aber nie eine
Gefahr- oder Funktionsregel überstimmen. Ausschlüsse müssen deshalb für jeden
Rankingpfad gelten und nicht nur für den Intent-Score.

Evidenz: Vor dem neuen Gate konnte `Gasflasche aus Stahl` trotz ausgeschlossener
Metall-Absicht über einen schwächeren Materialpfad wieder auftauchen. Danach
bleiben Stahl-Gasflasche, flüssige Farbe in Metalldose und Asbestplatte ohne
allgemeine Materialroute; `Holzspielzeug mit Batterie` wird Elektro. Eisen,
Kupferrohr, Holz, Bauschutt, Leder, Kork, Wachs und Mischmaterial erhalten
dagegen einen belegten allgemeinen Prüfschritt.

Kurze Stämme brauchen zusätzlich Kollisionsregressionen: `Latte` kam mitten in
`Carbonplatte` vor und erzeugte zunächst einen Holztreffer. Der allgemeine
Intent verwendet deshalb nur kollisionsarme Materialstämme; kurze konkrete
Wörter bleiben exakte Synonyme. Ebenso darf ein semantischer Intent einen
bereits erkannten Tippfehler nicht zu einer stillen Antwort aufwerten:
`Eissen`, `Metalll` und `Holtz` bleiben bestätigbare Vorschläge.

Gültigkeitsgrenze: Die Hierarchie erhöht Abdeckung und verhindert bekannte
Fehlklassifikationen. Sie ersetzt weder einen redaktionellen Eintrag noch eine
kommunale Quelle. Ist Funktion, Gefahr oder Ortsregel unklar, bleibt der sichere
nächste Prüfschritt richtiger als eine erfundene Tonne.

### Allgemeinbegriffe sind kleine Entscheidungsbäume, keine Synonyme

Ein Begriff wie `Öl`, `Farbe` oder `Werkzeug` bezeichnet keine eindeutige
Entsorgungsart. Mehr Schlagwörter würden hier nur die Wahrscheinlichkeit einer
gefährlichen Fehlzuordnung erhöhen. Die Suche erkennt deshalb den Oberbegriff,
fragt nur die fachlich trennenden Merkmale ab und wechselt dann zu einem
redaktionellen, quellengebundenen Eintrag. Konkrete Eingaben umgehen den Baum.

Evidenz: `Öl` trennt Speise-, Motor- und unbekanntes Öl; `Farbe` trennt nass,
vollständig trocken und unsicher; `Werkzeug` fragt nacheinander nach Strom,
Schadstoffanhaftung und Hauptmaterial. `Motoröl`, `Olivenöl` und `nasse Farbe`
bleiben direkte Treffer. 98 fokussierte Such-/Feedbackassertions und 37
Browserprüfungen sichern die Verzweigungen und Rücknavigation ab.

Gültigkeitsgrenze: Der Baum ist nur so vollständig wie seine redaktionell
belegten Endpunkte. Er ist kein generischer Chatbot und darf unbekannte Stoffe
nicht durch freie Textinterpretation einer Tonne zuweisen.

### Fehlerfeedback braucht einen ehrlichen Speicherort

Eine vorausgefüllte Repository-Meldung ist transparent, verlangt aber einen
zweiten Klick und häufig ein fremdes Konto. Für echtes Ein-Klick-Feedback muss
der Speicherweg app-eigen sein: Der Browser sendet nur einen minimierten,
versionierten Datensatz an einen kleinen Worker; ein privates D1-Schema trennt
Meldung, Analysezustand und redaktionelle Notiz. Browser-Secrets und ein
öffentlicher Lese-Endpunkt sind dafür weder nötig noch zulässig.

Evidenz: Unit-/Worker-Tests begrenzen Kommentar und Suchbegriff, prüfen Origin,
CORS, MIME, URL, Gründe, Honeypot, Rate-Limitpfad und Prepared Statement. Eine
echte lokale Wrangler-/D1-Runde migriert das Schema, nimmt den Datensatz an und
liest ihn über die versionierte Analyseabfrage zurück. Browser-E2E bestätigt
vier auswahlabhängige Hilfetexte, die entfernte Trennlinie, genau einen
Direktversand und weiterhin null Web-Storage-/Cookiezugriffe.

Gültigkeitsgrenze: Freitext kann trotz Datenminimierung personenbezogene Angaben
enthalten. Die UI warnt davor, die Meldung speichert keine IP-/Browserkennung,
und der tägliche Löschlauf begrenzt die Aufbewahrung auf 365 Tage. Bis
Cloudflare-Identität, D1-Ressource und HTTPS-Endpunkt extern feststehen, bleibt
der neue Stand ein lokaler Kandidat; die öffentliche App darf keinen
Speichererfolg vortäuschen.

## Weitergabe

Die allgemein relevanten Punkte zu dreistufiger Quellenpflege, Suchgewichtung,
regionalen Overrides und app-spezifischer Readiness werden mit Commit- und
Testevidenz an die Struktur-/Architektur- und Ideen-/Portfolio-Tasks gemeldet.
Das Workspace-Dokument `docs/PORTFOLIO_LEARNINGS.md` wird aus diesem
App-Repository nicht verändert.
