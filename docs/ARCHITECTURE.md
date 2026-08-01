# Architektur

## Laufzeit

Die App ist eine statische, frameworkfreie ES-Modul-Anwendung. Ein kleiner
Node-HTTP-Server dient ausschließlich dem lokalen DEV-/E2E-Betrieb. Es gibt
keine API, keine Datenbank, keine Anmeldung und keine Cookies. Der öffentliche
App-Rahmen wird aus dem fest gepinnten Shared-Vertrag `public-app-shell/v2.0.3`
lokal vendort; es gibt keinen CDN- oder Cross-Repository-Runtimeimport.

```text
index.html
  ├─ vendor/milosapps-shell/v2/ ── geprüfte lokale Shell-Kopie mit Hash-Lock
  ├─ src/app.js ───── UI, DE/EN, URL-/Historienzustand, Offline- und Dialoglogik
  ├─ src/i18n.js ──── vollständige sichtbare Fachübersetzung
  ├─ src/search.js ── Normalisierung, Ranking, Integritätsprüfung
  ├─ src/storage.js ─ optionale lokale Region und Suchhistorie
  └─ public/data/
       ├─ waste-items.v1.json
       ├─ sources.v1.json
       ├─ regions.v1.json
       └─ locales/en.v1.json
```

`milos-app.json` pinnt Vertrag, Version und Shared-Commit. `shell-lock.json`
enthält SHA-256 für Komponente, Komponenten-CSS, Bootstrap, app-spezifische
Theme-CSS und portablen Validator. Der lokale Server behält die strikte
`style-src 'self'`-CSP bei; die Shell lädt beide Stylesheets ausschließlich
vom app-eigenen Vendorpfad und braucht weder Hash noch `unsafe-inline`.

Die Shell besitzt Header, Footer, DEV-Links und die Sprachpersistenz unter
`milosapps.waste-guide.language`. Die Fachoberfläche initialisiert zusätzlich
aus `document.documentElement.lang` und hört auf
`milosapps:localechange`. Deutsch und Englisch verwenden denselben
redaktionellen Inhaltsstand; die Übersetzung hebt weder Inhaltsversion noch
Quellenreview an.

Der Service Worker speichert App-Shell und redaktionelle JSON-Dateien für die
Nutzung nach einem vollständigen Erstaufruf. Inhalt und Shell werden gemeinsam
über einen expliziten Cache-Namen aktualisiert.

## Suche

Namen und Synonyme haben mehr Gewicht als generische Schlagwörter. Die Suche
normalisiert deutsche Umlaute und `ß`, entfernt irrelevante Fragewörter und
verwendet Damerau-Levenshtein-Distanzen für kleine Tippfehler. Niedrige
Trefferwerte werden verworfen. Nahe Treffer werden als Auswahl gezeigt, statt
eine Tonne zu raten.

Zusammengesetzte und getrennte Schreibweisen werden zusätzlich ohne Leerzeichen
verglichen, sodass etwa `Plastikblume` und `Plastik Blume` denselben redaktionell
geprüften Begriff treffen. Das erweitert nur die Schreibweise; neue fachliche
Bedeutungen entstehen weiterhin ausschließlich über versionierte Synonyme und
Einträge. Materialwörter wie `Plastik` bleiben mehrdeutig, wenn Verpackung und
Nichtverpackung unterschiedliche Wege haben.

Eine konkrete Ergebnis-URL enthält nur die stabile Item-ID, zum Beispiel
`/?item=battery`. Kurze, unbekannte oder mehrdeutige Zustände entfernen eine
vorherige Item-ID. Dadurch stimmen sichtbarer Zustand, Reload und
Browsernavigation überein.

## Datenintegrität und Unsicherheit

Jeder Eintrag nennt Quellen-IDs sowie redaktionelles Prüf- und Fälligkeitsdatum.
Die Laufzeit prüft, ob die Quellen vorhanden und zum aktuellen Datum noch nicht
fällig sind. Bei einem Integritätsproblem wird die Aussage sichtbar auf
„Örtlich prüfen“ herabgestuft und die Tonnenangabe nicht als sicher dargestellt.

Regionen sind grobe, freiwillige Profile. Nur explizit belegte Overrides dürfen
einen allgemeinen Entsorgungsweg ersetzen. Ohne Region bleibt ein amtlicher
nächster Prüfschritt sichtbar.

## Lokale Daten

Standardmäßig wird kein Suchverlauf gespeichert. Nach Aktivierung werden
höchstens fünf eindeutige Suchbegriffe und die freiwillig gewählte grobe Region
in `localStorage` gehalten. Die App läuft bei gesperrtem Speicher weiter. Eine
Schaltfläche löscht Region und Suchverlauf. Die getrennte Sprachpräferenz wird
vom öffentlichen App-Rahmen als reine Oberflächeneinstellung gehalten.

## DEV-Sicherheitsgrenze

Port `4318` ist fest. Der Server meldet auf `/healthz`:

```json
{
  "status": "ok",
  "appKey": "waste-guide",
  "environment": "DEV",
  "contentVersion": "2026.08.01-1",
  "productionApproved": false
}
```

E2E prüft diese Identität vor einer möglichen Wiederverwendung. Eine fremde,
unvollständige oder nicht rechtzeitig prüfbare Belegung führt zum Abbruch. Der
Test beendet nur den Prozess, den er selbst gestartet hat.
