# MTG \- Pod Manager MVP

# Definition des MVP

Das MVP des "MTG Pod-Manager" ist eine funktionale Webanwendung, die es einer geschlossenen Gruppe von Magic-Spielern ermöglicht, ihre Spielergebnisse mühelos zu erfassen und eine automatisierte, deck-basierte Rangliste zu führen. Es löst das Kernproblem der manuellen und fehleranfälligen Listenführung und bietet einen zentralen, verlässlichen Ort für die wichtigste Metrik der Gruppe: "Welches Deck performt am besten?".

# Features nach Priorität

## Must-Have (Muss im MVP enthalten sein)

  Diese Features bilden den Kern der Anwendung und sind für den Start unerlässlich.

* Benutzerkonto-Verwaltung:  
  * Registrierung mit E-Mail und Passwort.  
  * Konto-Aktivierung über einen Link in einer Bestätigungs-E-Mail.  
  * Login und Logout.  
* Gruppen-Grundfunktionen:  
  * Erstellen einer neuen Gruppe (mit Name und Spielformat).  
  * Beitreten zu einer bestehenden Gruppe mittels eines Einladungscodes.  
  * Übersichtsseite, die alle Gruppen eines Nutzers anzeigt.  
* Deck-Management:  
  * Ein Gruppenmitglied kann ein neues Deck zur Gruppe hinzufügen (mit Name, Farbkombination).  
  * Ein Nutzer kann seine eigenen Decks bearbeiten.  
* Spielergebnis-Erfassung (Kern-Feature):  
  * Ein Gruppen-Admin kann ein gespieltes Spiel erfassen (Anzahl Spieler, teilnehmende Decks, erreichte Platzierungen).  
  * Die Eingabe von Gast-Namen (Spieler, die nicht Mitglied sind) ist als reiner Text möglich.  
* Automatisierte Logik & Anzeige:  
  * Automatische Berechnung der Punkte pro Deck basierend auf der Platzierung im erfassten Spiel.  
  * Automatische Anpassung des Gesamt-Performance-Ratings für die teilnehmenden Decks.  
  * Anzeige der dynamischen Rangliste aller Decks in der Gruppe.  
  * Anzeige einer Historie der zuletzt erfassten Spiele.  
* Admin-Funktionen:  
  * Ein Gruppen-Admin kann Mitglieder aus der Gruppe entfernen.  
  * Ein Gruppen-Admin kann den Einladungscode verwalten (einsehen, neu generieren).  
  * Ein Gruppen-Admin kann jedes Deck in der Gruppe bearbeiten (zur Korrektur von Fehleingaben).  
  * Ein Gruppen-Admin kann das zuletzt erfasste Spiel rückgängig machen.

##  Should-Have (Sollte bald nach dem MVP folgen)

  Diese Features erhöhen den Komfort und den Wert der Anwendung erheblich.

* Visuelles Feedback: Anzeige von Auf- und Abwärtstrends in der Rangliste (z.B. durch Pfeile).  
* Erweitertes Management:  
  * Bearbeiten von Gruppendetails (z.B. Name).  
  * Hochladen eines Gruppen-Bildes (andernfalls wird ein Standardbild angezeigt).  
  * Möglichkeit, ein Deck zu "deaktivieren" (es wird in Statistiken behalten, kann aber nicht für neue Spiele ausgewählt werden).  
* Nutzerkomfort: Eine simple Profilseite, auf der ein Nutzer seinen Anzeigenamen ändern, kann.

##  Could-Have (Kann später implementiert werden)

  Diese Features sind "Nice-to-have" und für die Zukunft denkbar.

* Detaillierte Statistik-Seite (z.B. "Welche Farbe gewinnt am häufigsten?").  
* Vollständiges Saison-Management mit Archivierung vergangener Saisons.  
* Öffentliche Suche nach Gruppen und eine "Bewerbungs"-Funktion.  
* Ein In-App-Feedback-System.

  \---

# User-Flows (Typische Nutzer-Szenarien)

### Flow 1: Die Gruppengründerin

1\. Ankunft & Registrierung: Sarah landet auf der Startseite und klickt auf "Registrieren". Sie gibt ihren Wunschnamen, E-Mail sowie Passwort ein und schickt das Formular ab.  
2\. Aktivierung: Sie öffnet ihr E-Mail-Postfach, klickt auf den Aktivierungslink und wird zur Login-Seite geleitet.  
3\. Erste Schritte: Nach dem Login sieht sie eine leere Gruppenübersicht mit dem Button "Neue Gruppe erstellen".  
4\. Gründung: Sie klickt darauf, gibt ihrer Gruppe den Namen "Commander-Runde" und wählt das Format "Commander" aus.  
5\. Das Zuhause: Sie landet direkt im Dashboard ihrer neuen Gruppe. Dort findet sie den Einladungscode und schickt ihn per Messenger an ihre Freunde.

### Flow 2: Das neue Mitglied

1\. Einladung erhalten: Tom erhält von Sarah den Einladungscode.  
2\. Anmeldung: Er geht auf die Webseite, registriert und aktiviert seinen Account (wie Sarah in Schritt 1 & 2).  
3\. Beitritt: In seiner Gruppenübersicht gibt er den Code in das Feld "Gruppe beitreten" ein.  
4\. Ankommen: Die "Commander-Runde" erscheint nun in seiner Übersicht. Er klickt darauf und sieht dasselbe Dashboard wie Sarah.

### Flow 3: Der Spielabend & die Erfassung

1\. Vorbereitung: Vor dem Spielabend fügen Tom und die anderen Mitglieder über den "Deck hinzufügen"-Button ihre Decks zur Gruppe hinzu.  
2\. Die Chronistin: Nach dem ersten Spiel öffnet Sarah (als Gruppen-Admin) die App und klickt auf "Spiel erfassen".  
3\. Erfassung: Sie wählt "4 Spieler". Für jeden Platz wählt sie aus einer Liste aller Gruppendecks das entsprechende Deck aus und trägt die Platzierungen ein (1, 2, 3, 4). Bei einem der Decks, bei dem der Spieler nur zu Gast ist, tippt sie einfach den Namen "Besucher-Ben" in das Namensfeld.  
4\. Magie im Hintergrund: Sie klickt "Speichern". Die App berechnet die neuen Performance-Ratings. Auf dem Dashboard sehen alle sofort die aktualisierte Rangliste und das neue Spiel in der Historie.  
5\. Korrektur: Sarah bemerkt, dass sie zwei Decks vertauscht hat. Sie klickt auf "Letztes Spiel rückgängig machen", bestätigt, und der Zustand vor ihrer Eingabe ist wiederhergestellt. Sie kann das Spiel nun korrekt erfassen.  
