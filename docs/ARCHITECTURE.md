# Architektur

## Laufzeit

Die App ist eine statische, frameworkfreie ES-Modul-Anwendung. Ein kleiner
Node-HTTP-Server dient ausschließlich dem lokalen DEV-/E2E-Betrieb. Es gibt
keine API, keine Datenbank, keine Anmeldung, keine Cookies und keine
Shared-Abhängigkeit.

```text
index.html
  ├─ src/app.js ───── UI, URL-/Historienzustand, Offline- und Dialoglogik
  ├─ src/search.js ── Normalisierung, Ranking, Integritätsprüfung
  ├─ src/storage.js ─ optionale lokale Region und Suchhistorie
  └─ public/data/
       ├─ waste-items.v1.json
       ├─ sources.v1.json
       └─ regions.v1.json
```

Der Service Worker speichert App-Shell und redaktionelle JSON-Dateien für die
Nutzung nach einem vollständigen Erstaufruf. Inhalt und Shell werden gemeinsam
über einen expliziten Cache-Namen aktualisiert.

## Suche

Namen und Synonyme haben mehr Gewicht als generische Schlagwörter. Die Suche
normalisiert deutsche Umlaute und `ß`, entfernt irrelevante Fragewörter und
verwendet Damerau-Levenshtein-Distanzen für kleine Tippfehler. Niedrige
Trefferwerte werden verworfen. Nahe Treffer werden als Auswahl gezeigt, statt
eine Tonne zu raten.

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

Standardmäßig wird kein Suchverlauf gespeichert. Nach Einwilligung werden
höchstens fünf eindeutige Suchbegriffe und die freiwillig gewählte grobe Region
in `localStorage` gehalten. Die App läuft bei gesperrtem Speicher weiter. Eine
Schaltfläche löscht alle lokalen Angaben.

## DEV-Sicherheitsgrenze

Port `4318` ist fest. Der Server meldet auf `/healthz`:

```json
{
  "status": "ok",
  "appKey": "waste-guide",
  "environment": "DEV",
  "contentVersion": "2026.07.30-1",
  "productionApproved": false
}
```

E2E prüft diese Identität vor einer möglichen Wiederverwendung. Eine fremde,
unvollständige oder nicht rechtzeitig prüfbare Belegung führt zum Abbruch. Der
Test beendet nur den Prozess, den er selbst gestartet hat.
