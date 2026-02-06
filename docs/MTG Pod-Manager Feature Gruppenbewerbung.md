# MTG Pod-Manager Feature: Gruppenbewerbung

# Datenmodell (Vorschlag)

Neue Entität: GroupApplication (Bewerbung)  
Zweck: offene Bewerbungen für Gruppen, die im Modal der Gruppensuche sichtbar sind (User‑Perspektive) und in den Mitgliedereinstellungen (Admin‑Perspektive).  
Felder (minimal & wartbar):

* id  
* userId (Relation zu User)  
* groupId (Relation zu Group)  
* createdAt

Constraints

* Unique: (userId, groupId)  
  Begründung: verhindert Mehrfachbewerbungen bei derselben Gruppe, wie gewünscht.

Lifecycle

* Anlegen bei Bewerbung  
* Akzeptieren → Eintrag in UsersOnGroups \+ Bewerbung löschen  
* Ablehnen → Bewerbung löschen  
* Keine Historie nötig (da die Doku „Eintrag löschen“ nach Entscheidung fixiert)

Optional (falls ihr später mehr braucht, aber nicht zwingend):

* message (Freitext) — aktuell nicht gefordert  
* status (PENDING/ACCEPTED/REJECTED) — nicht nötig, da Eintrag nach Entscheidung gelöscht wird

---

# API‑Entwurf (Bewerbungs‑Flow)

1\) Gruppensuche

* GET /groups/search?query=...\&page=...\&pageSize=...  
  * Rückgabe: Liste mit Gruppen (id, name, ggf. Beschreibung, Member‑Count)  
  * Zugriffsregel: jeder eingeloggte User  
  * Begründung: Suche statt öffentlicher Komplettliste

2\) Bewerbung erstellen

* POST /groups/{groupId}/applications  
  * Request: leer oder optional message (falls später gewünscht)  
  * Errors:  
    * 409 wenn Bewerbung schon offen  
    * 409 wenn User bereits Mitglied  
    * 404 wenn Gruppe nicht existiert

3\) Eigene offene Bewerbungen anzeigen (für Badge & Modal)

* GET /users/me/applications?status=open  
  * Rückgabe: Liste mit Gruppen (id, name, createdAt)  
  * Begründung: Modal im Gruppensuch‑Button \+ Badge‑Count

4\) Offene Bewerbungen einer Gruppe (für Admins)

* GET /groups/{groupId}/applications  
  * Zugriffsregel: nur Gruppen‑Admins  
  * Rückgabe: Liste der Bewerber (userId, inAppName, createdAt)

5\) Bewerbung annehmen

* POST /groups/{groupId}/applications/{userId}/accept  
  * Aktion: UsersOnGroups anlegen, Bewerbung löschen  
  * Systemnachricht in GroupEvent (z. B. APPLICATION\_ACCEPTED)

6\) Bewerbung ablehnen

* POST /groups/{groupId}/applications/{userId}/reject  
  * Aktion: Bewerbung löschen  
  * Systemnachricht in GroupEvent (z. B. APPLICATION\_REJECTED)

---

# Begründung des Designs

* Wartbar: kleiner, sauberer Datensatz, keine zusätzlichen Zustands‑Enums nötig  
* Geringe Kosten: keine Background‑Jobs, keine Historien‑Tabellen  
* KI‑verständlich: klarer Lifecycle, kurze API‑Liste  
* Produktfit: exakt die Doku‑Anforderungen (keine Verfallszeit, unbegrenzt viele offene Bewerbungen, gelöscht nach Entscheidung)

