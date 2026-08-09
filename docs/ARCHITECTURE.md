# Architektur

## Laufzeit

Die Fach-App ist eine statische, frameworkfreie ES-Modul-Anwendung. Ein kleiner
Node-HTTP-Server dient ausschließlich dem lokalen DEV-/E2E-Betrieb. Es gibt
keine Anmeldung und keine Cookies. Ein getrennt deploybarer, app-eigener
Cloudflare-Worker nimmt nur bewusst abgeschickte Ergebnisrückmeldungen an und
legt sie strukturiert in einer eigenen D1-Datenbank ab. Der öffentliche
App-Rahmen wird aus dem fest gepinnten Shared-Vertrag `public-app-shell/v2.0.3`
lokal vendort; es gibt keinen CDN- oder Cross-Repository-Runtimeimport.

```text
index.html
  ├─ vendor/milosapps-shell/v2/ ── geprüfte lokale Shell-Kopie mit Hash-Lock
  ├─ vendor/milosapps-essentials/v1/ ── Loader, Datenschutz und Teilen mit Hash-Lock
  ├─ src/app.js ───── UI, DE/EN, URL-Zustand, Offline- und Dialoglogik
  ├─ src/i18n.js ──── vollständige sichtbare Fachübersetzung
  ├─ src/search.js ── Normalisierung, Ranking, Integritätsprüfung
  ├─ src/feedback.js ── minimierter Direktversand ohne Browser-Secret
  ├─ src/shell-session.js ─ Sprachzustand in der sichtbaren URL, ohne Persistenz
  ├─ offline-sw.js ── nur nach ausdrücklicher Offline-Aktivierung
  ├─ sw.js ────────── eng begrenzte Bereinigung der früheren Auto-Registrierung
  ├─ docs/DEVICE_STORAGE_INVENTORY.json ─ Zweck-/Laufzeitinventar
  └─ public/data/
       ├─ waste-items.v1.json
       ├─ sources.v1.json
       ├─ regions.v1.json
       └─ locales/en.v1.json

feedback-worker/
  ├─ src/worker.js ── CORS, Validierung, Rate-Limit und D1-Insert
  ├─ migrations/ ─── Feedbacktabelle, Prüfstatus und Summary-View
  └─ queries/ ─────── wiederverwendbare Auswertungsabfragen
```

`milos-app.json` pinnt Vertrag, Version und Shared-Commit. `shell-lock.json`
enthält SHA-256 für Komponente, Komponenten-CSS, Bootstrap, app-spezifische
Theme-CSS und portablen Validator. Der lokale Server behält die strikte
`style-src 'self'`-CSP bei; die Shell lädt beide Stylesheets ausschließlich
vom app-eigenen Vendorpfad und braucht weder Hash noch `unsafe-inline`.

Die Shell besitzt Header, Footer und DEV-Links. `src/shell-session.js` trennt
das statische Shell-Element vor dessen Registrierung kurz vom Dokument,
konfiguriert ausschließlich den app-eigenen Sprachadapter und verbindet es
wieder. Englisch steht als `?lang=en` in der sichtbaren URL, Deutsch ohne
Parameter. Dadurch überlebt die Wahl einen Reload, ohne `localStorage`. Die
Fachoberfläche hört auf `milosapps:localechange`. Deutsch
und Englisch verwenden denselben redaktionellen Inhaltsstand; die Übersetzung
hebt weder Inhaltsversion noch Quellenreview an.

`milos-essentials.json` pinnt zusätzlich `public-app-essentials/v1.1.5` auf
Shared-Commit `2942132ad3bf6cf39edc9f52ed918de6a230be23`. Die sechs lokal
vendorten Artefakte liefern einen CSS-first-Loader, Datenschutzlogik und
`<milos-share-button>`. Datum und Ort sind für diese App
ausgeschaltet; die grobe Entsorgungsregion bleibt der vorhandene fachliche
Selector. Beide Essentials-CSS-Dateien bleiben externe Same-Origin-Dateien
und werden weder als `data:`-URL eingebettet noch aus dem Shared-Repository zur
Laufzeit importiert.

Der Loader besitzt bewusst keine zweite Überschrift: Sein tag-agnostischer
Titelmarker steht auf einem Absatz, während die Fachoberfläche genau eine
`h1` behält. Erst nach geladenen redaktionellen Katalogen oder einem sichtbar
gerenderten Fehlerzustand ruft die App
`globalThis.milosAppEssentials.ready()` auf. Ein Timer täuscht keine
Bereitschaft vor.

`offline-sw.js` speichert App-Shell und redaktionelle JSON-Dateien erst nach
der ausdrücklichen Aktion „Offline aktivieren“. Dazu gehören beide gepinnten
Shared-Runtimes samt Manifesten und Locks. Inhalt und Shell werden gemeinsam
über einen expliziten Cache-Namen aktualisiert. `sw.js` enthält nur den
Migrationspfad, der eine frühere automatische Registrierung und deren
öffentliche App-Caches entfernt.

## Suche

Namen und Synonyme haben mehr Gewicht als generische Schlagwörter. Die Suche
normalisiert deutsche Umlaute und `ß`, entfernt irrelevante Fragewörter und
verwendet Damerau-Levenshtein-Distanzen zur Kandidatensuche. Treffer werden in
zwei Vertrauensstufen getrennt: Exakt-, Leerzeichen-, Ganzphrasen- und kuratierte
Intent-Treffer dürfen Ergebnisse öffnen; Präfix-, Teil-, Token- und
Tippfehlerkandidaten dürfen nur als bestätigbares „Meintest du …?“ erscheinen.
Existiert ein belastbarer Treffer, werden schwächere Kandidaten vor der Ausgabe
vollständig verworfen.

Zusammengesetzte und getrennte Schreibweisen werden zusätzlich ohne Leerzeichen
verglichen, sodass etwa `Plastikblume` und `Plastik Blume` denselben redaktionell
geprüften Begriff treffen. Das erweitert nur die Schreibweise; neue fachliche
Bedeutungen entstehen weiterhin ausschließlich über versionierte Synonyme und
Einträge. Materialwörter wie `Plastik` bleiben mehrdeutig, wenn Verpackung und
Nichtverpackung unterschiedliche Wege haben.

Allgemeine Materialleitfäden bilden eine eigene redaktionelle Schicht. Sie
erkennen unter anderem Eisen/Metall, Holz, mineralischen Bauschutt, Leder,
Kork, Wachs und Verbundmaterial, nennen aber ohne belegte Ortsregel keine
pauschale Deutschland-Tonne. Kuratierte `searchIntents` beschreiben positive
Materialstämme und sicherheitsrelevante Ausschlüsse. Diese Ausschlüsse gelten
für jeden Rankingpfad, also auch für Alias-, Schlagwort-, Teilwort- und
Tippfehlerkandidaten, damit etwa eine Stahl-Gasflasche nie als normaler
Metallschrott ausgegeben wird. Funktions- und Sicherheitsmerkmale haben Vorrang
vor dem Material; Tippfehler bleiben vor einer Antwort bestätigbar.

Die Korrekturkandidaten verwenden neben Distanz und Längenverhältnis einen
sprachlichen Anker: stabile Präfixe, echte Nachbarvertauschungen und eng
begrenzte Einfüge-/Auslassmuster. Ein bestätigter Korrekturbutton startet danach
eine neue exakte Suche; die unscharfe Eingabe selbst erhält keine Item-ID und
keinen Entsorgungsweg. Damit bleibt hohe Wiederauffindbarkeit von der
fachlichen Autorität einer Antwort getrennt.

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

Die aktuelle App schreibt weder Region, Suchverlauf noch Sprache in Web
Storage. Region lebt nur im Speicher der geöffneten Seite, Verlauf ist
deaktiviert und Sprache steht in der URL. Fünf namentlich aufgeführte Altwerte
werden weder gelesen noch geschrieben und bleiben über die Website-Daten des
Browsers entfernbar. Das maschinenlesbare Inventar dokumentiert
außerdem Service Worker, CacheStorage, Web Share und Clipboard mit Zweck,
Trigger, Laufzeit und Personenbezug.

Da es keine Cookies und keine optionale Browserpersistenz gibt, erscheint kein
Schein-Einwilligungsbanner. Datenschutz bleibt über einen dauerhaften Link und
den Transparenzdialog erreichbar. Der gemeinsame Teilen-Baustein erhält
ausschließlich den aktuellen kanonischen `?item=`-Link, Entsorgungsweg und eine
Quellenattribution; frühere oder aktuelle Suchen und Regionseinstellungen
werden nicht ungefragt geteilt. Native Freigabe und Nutzerabbruch bleiben
statusstill; nur Clipboard- oder Fehlerfeedback erscheint als überlagerter
Toast ohne Layoutsprung.

## Bewusst abgeschicktes Ergebnisfeedback

Der Dialog überträgt erst nach „Abschicken“ eine zufällige Meldungs-ID,
Item-ID/-Name, Grund, optionalen Kommentar, auslösenden Suchbegriff,
Inhaltsversion, Sprache und kanonische Ergebnis-URL. Region, Verlauf, IP-Adresse,
User-Agent, Cookies und Browserkennungen werden nicht in `feedback_reports`
gespeichert. Weil Freitext dennoch unbeabsichtigt personenbezogene Angaben
enthalten kann, warnt die UI vor Namen und Kontaktdaten. Ein täglicher
Worker-Cron löscht Meldungen nach 365 Tagen.

Der Worker akzeptiert nur konfigurierte App-Origins, streng begrenztes JSON und
kuratierte Gründe. Prepared Statements, eine idempotente UUID, Honeypot und ein
globales Cloudflare-Rate-Limit begrenzen Missbrauch. Es gibt keinen öffentlichen
Lese-Endpunkt. Die Prüfung erfolgt in der app-eigenen D1-Ansicht oder mit den
versionierten Queries; `review_state` trennt neue, geprüfte, erledigte und
verworfene Meldungen. Worker/D1 und statische App bleiben getrennt
zurückrollbar.

## DEV-Sicherheitsgrenze

Port `4318` ist fest. Der Server meldet auf `/healthz`:

```json
{
  "status": "ok",
  "appKey": "waste-guide",
  "environment": "DEV",
  "contentVersion": "2026.08.09-1",
  "productionApproved": false
}
```

E2E prüft diese Identität vor einer möglichen Wiederverwendung. Eine fremde,
unvollständige oder nicht rechtzeitig prüfbare Belegung führt zum Abbruch. Der
Test beendet nur den Prozess, den er selbst gestartet hat.
