# Welcher-Müll-Erkenntnisse

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
