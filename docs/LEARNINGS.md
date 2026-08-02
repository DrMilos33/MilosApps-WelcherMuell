# Welcher-Müll-Erkenntnisse

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

## Weitergabe

Die allgemein relevanten Punkte zu dreistufiger Quellenpflege, Suchgewichtung,
regionalen Overrides und app-spezifischer Readiness werden mit Commit- und
Testevidenz an die Struktur-/Architektur- und Ideen-/Portfolio-Tasks gemeldet.
Das Workspace-Dokument `docs/PORTFOLIO_LEARNINGS.md` wird aus diesem
App-Repository nicht verändert.
