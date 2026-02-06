# MTG Pod-Manager Phase 2 Umsetzungsvorbereitung

# 9\. Produktfeature Definition

Must

* Gruppenverwaltung mit Admin-/Mitgliedereinstellungen inklusive Bewerbungs-Handling (Annehmen/Ablehnen, Systemnachrichten).  
* Sysadmin-Userverwaltung: Gruppenliste mit Suche/Pagination, User-Aktionen, Gruppenlöschung (mit Bestätigung).  
* Historien‑Verfall (konfigurierbar bis 1 Jahr, hartes Löschen, inkl. Systemnachrichten).  
* Saison-/Ranglistenlogik: manuelles Reset, automatischer Reset, Countdown, Season‑Name, Pause nach Season, Umschalten auf letzte Rangliste.  
* Neues Spiel spielen: Vollbild‑In‑Game‑Interface, Touch‑first, Deck‑Zuweisung Pflicht, Ergebnisübernahme.  
* Backend‑Validierung für Ränge und Entfernen der Format‑Änderung in Gruppeneinstellungen.

Should

* Gruppenbild im Header, Upload/Änderung im Gruppen‑Setting.  
* UI‑Anpassungen der Gruppenübersicht (Button‑Platzierung, neue Verwaltungsbuttons).  
* Statistik‑Card mit Farbdaten/Deckdaten/Spielerdaten (aktive Season als Standard).  
* „Winners“-Banner für 2 Wochen mit per‑User Ausblenden.  
* Gruppensuche in der Gruppenauswahl (Bewerbung direkt aus dem Such‑Modal).

Could

* Spendensektion „Buy me a Booster Pack“ (externer Link, nur für eingeloggte User).  
* Design‑Iteration der Ranglisten‑Item‑Flächen (neuer Stil ohne Pergament).  
* Diskussion App‑Portierung (Smartphone App/Hybdrid), Feedback‑Formular (später).

---

Vorgeschlagene User‑Flows

1. Gruppenbeitritt über Suche  
   1. User öffnet Gruppenauswahl und klickt „Gruppe suchen“.  
   2. User sucht nach Gruppe, sieht Trefferliste.  
   3. User bewirbt sich direkt aus dem Modal.  
   4. Status wird im Modal der offenen Bewerbungen angezeigt.  
2. Bewerbung durch Gruppenadmin  
   1. Admin öffnet Mitgliedereinstellungen.  
   2. Sieht Liste offener Bewerbungen.  
   3. Nimmt an oder lehnt ab.  
   4. Systemnachricht wird in der Gruppenhistorie erstellt.  
3. Gruppenverwaltung (Admin)  
   1. Admin öffnet Gruppeneinstellungen.  
   2. Ändert Gruppenname/Bild, setzt Rangliste manuell zurück.  
   3. Konfiguriert aktive Season (Dauer, Name, Pause).  
   4. Bestätigt Änderungen, Countdown erscheint in der Übersicht.  
4. Live‑Spiel starten („Neues Spiel spielen“)  
   1. User startet „Neues Spiel spielen“.  
   2. Wählt Spielerzahl (max. verfügbare Decks).  
   3. Zuweisung aller Decks (Pflicht), optional Spielernamen.  
   4. Spiel läuft, Life/Commander/Poison werden gepflegt.  
   5. Letzter Spieler gewinnt, Ergebnis‑Modal erscheint vorausgefüllt.  
   6. User bestätigt oder passt Ränge an, Spiel wird erfasst.  
5. Season‑Wechsel & Pause  
   1. Season läuft ab, Rangliste wird automatisch zurückgesetzt.  
   2. „Winners“-Banner erscheint 2 Wochen (optional ausblendbar).  
   3. Falls Pause gesetzt: „Record Game“ und automatische Erfassung sind gesperrt, Hinweis erscheint.  
   4. Nach Pausenende startet neue Rangliste, Erfassung wieder aktiv.  
6. Sysadmin‑Userverwaltung  
   1. Sysadmin öffnet Adminseite aus Header.  
   2. Sucht Gruppe, sieht Mitgliederliste.  
   3. Führt Aktionen aus (Umbenennen, Rolle ändern, entfernen, Account löschen).  
   4. Systemnachrichten werden in betroffenen Gruppen gepostet.  
   5. Optional: Gruppe löschen (mit Bestätigung).

# 10\. Milestones

Milestone 1 — Gruppen- & Admin‑Kernfluss stabil  
Ziel: Gruppenmanagement und Governance sind zuverlässig und vollständig nutzbar.  
Erfolgskriterien:

* Gruppenadmins können Mitglieder verwalten, Bewerbungen annehmen/ablehnen und Rollen ändern.  
* Sysadmin kann Gruppen finden, User verwalten und Gruppen löschen (mit Bestätigung).  
* Jede Admin‑Aktion erzeugt eine Systemnachricht in der Gruppenhistorie.  
* Gruppenbewerbungen sind über die Suche möglich und Mehrfachbewerbungen werden verhindert.

Milestone 2 — Saison & Historie verlässlich  
Ziel: Ranglistenlogik und Historie sind nachvollziehbar, steuerbar und skalierbar.  
Erfolgskriterien:

* Historien‑Einträge verfallen nach konfigurierbarer Frist (inkl. Systemnachrichten).  
* Manuelles und automatisches Saison‑Reset funktionieren zuverlässig.  
* Countdown, Season‑Name, Pause‑Phase und Umschalt‑Ansicht zur alten Rangliste sind konsistent sichtbar.  
* Spiele in der Pause werden nicht gespeichert, klar kommuniziert.

Milestone 3 — Live‑Spielerlebnis („Neues Spiel spielen“)  
Ziel: Das In‑Game‑Interface ist nutzbar und reduziert Friktion am Spieltisch.  
Erfolgskriterien:

* Vollbild‑Modus funktioniert flüssig und touch‑first.  
* Spielerzahl passt sich vorhandenen Decks an, Deckzuweisung ist Pflicht.  
* Life/Commander/Poison‑Logik ist vollständig und verständlich bedienbar.  
* Ergebnis‑Modal wird korrekt vorausgefüllt und speichert nur nach Bestätigung.

Milestone 4 — Statistik & Übersichtlichkeit  
Ziel: Gruppenübersicht wird informativer ohne Überforderung.  
Erfolgskriterien:

* Rangliste und Kartenlayout sind ausbalanciert (Platzverteilung, einklappbare Cards).  
* Statistik‑Card zeigt die definierten Charts (aktive Season als Standard).  
* Nutzer können Datenbereiche schnell wechseln (Farben/Decks/Spieler).  
* Verständliche Default‑Ansicht ohne Erklärung.

Milestone 5 — Polishing & Unterstützung  
Ziel: Nutzerfreundlichkeit, Support und Wertschätzung abrunden.  
Erfolgskriterien:

* Ranglisten‑Item‑Design wirkt stimmig im Gesamtdesign.  
* „Winners“-Banner ist sichtbar, aber nicht störend (per‑User ausblendbar).  
* Spendenfunktion ist leicht auffindbar, aber nicht aufdringlich.

# 11\. Architecture Anpassungen

1\. Architekturanpassungen (Frontend / Backend / ggf. Services)  
Frontend

* Empfehlung: Feature‑orientierte Modularisierung (domain‑first).  
  Begründung: Die neuen Features (Season, Live‑Game, Statistik, Admin) sind eigenständige Produktbereiche. Eine domain‑first Struktur macht den Code leichter navigierbar, einfacher für KI zu verstehen und reduziert Querabhängigkeiten.  
* Einheitliche UI‑Patterns für Modals, Settings, History‑Events.  
  Begründung: Viele neue Flows basieren auf Modals und Systemnachrichten. Einheitliche Patterns senken Fehlerquote und halten UX konsistent.

Backend

* Empfehlung: Klare Domänen‑Schichten (Group, Admin, Season, Game, Stats).  
  Begründung: Ihr baut eine „one‑stop“ App; ohne klare Domain‑Grenzen explodiert die Komplexität. Eine saubere Schichtung ist langlebig und KI‑freundlich.  
* Event‑Zentrum für Systemnachrichten & Historie.  
  Begründung: Viele Aktionen erzeugen Historie‑Einträge. Eine zentrale Stelle verhindert Duplikatlogik und erleichtert Lösch-/Expiry‑Regeln.  
* Season‑State als first‑class Domain.  
  Begründung: Season‑Reset, Pause, Countdown, Snapshot, Winners‑Banner sind ein zusammenhängender Lebenszyklus. Ein eigener Domain‑Layer verhindert Logik‑Scatter.

Ggf. Services

* Empfehlung: keine externen Services erzwingen.  
  Begründung: Geringe laufende Kosten. Wenn möglich alles in der bestehenden App halten.  
* Ausnahme‑Option (optional): Background‑Jobs nur intern.  
  Begründung: Historien‑Verfall, Season‑Reset und Banner‑Cleanup sind „scheduled tasks“. Falls ihr bereits einen Task‑Mechanismus habt, nutzt ihn; sonst minimalistisch integrieren, statt externe Worker‑Infra.

---

2\. Muss der Tech‑Stack erweitert werden?  
Kurz: Nein, nicht zwingend.

* Begründung: Alle neuen Features sind logisch/UX‑getrieben, nicht durch externe Abhängigkeiten bestimmt.  
* Empfohlene Minimal‑Erweiterung nur falls nötig:  
  * Interne Scheduling‑Funktion für Verfall/Season‑Reset.  
  * Chart‑Rendering kann innerhalb des bestehenden Frontends passieren.  
    Diese Erweiterungen sollten nur erfolgen, wenn ihr sie nicht bereits im Stack abdeckt.

---

3\. Anpassungen an der Ordnerstruktur (vibe coding & KI‑Verständlichkeit)  
Zielstruktur (konzeptuell, kein Code):

* frontend/  
  * features/  
    * groups/ (Übersicht, Settings, Mitglieder, Bewerbungen)  
    * admin/ (Sysadmin‑Seiten)  
    * season/ (Countdown, Snapshot, Winners‑Banner)  
    * live-game/ (Neues Spiel spielen)  
    * stats/ (Statistik‑Card)  
  * shared/  
    * UI‑Bausteine, Modals, Form‑Pattern, Karten  
  * routes/ (wenn vorhanden)  
* backend/  
  * domains/  
    * groups/, admin/, season/, game/, stats/  
  * services/  
    * Historie/Event‑Hub  
    * Season‑Scheduler  
  * storage/  
    * DB‑Zugriff, Repositories  
  * api/  
    * Endpoints, Request/Response‑Mapping

Begründung:

* Domain‑first sorgt für „mentale Karten“, die KI und Menschen leichter erkennen.  
* Getrennte „shared“-Ebene reduziert Redundanz und verhindert Spaghetti‑Modals.  
* Services abstrahieren wiederkehrende Regeln (Historie, Season, Validierungen).  
* Dadurch bleibt Wartbarkeit hoch und Änderungen bleiben lokal.