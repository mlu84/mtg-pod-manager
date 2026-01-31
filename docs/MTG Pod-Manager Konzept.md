# MTG Pod-Manager

[**1\. Was ist der Pod-Manager?	1**](#1.-was-ist-der-pod-manager?)

[**2\. Welcher Techstack soll verwendet werden?	1**](#2.-welcher-techstack-soll-verwendet-werden?)

[**3\. Was soll die Landing Page beinhalten?	1**](#3.-was-soll-die-landing-page-beinhalten?)

[**4\. Was passiert nach dem Login?	1**](#4.-was-passiert-nach-dem-login?)

[**5\. Was passiert nach dem Betreten einer Gruppe?	2**](#5.-was-passiert-nach-dem-betreten-einer-gruppe?)

[**6\. Was für Rechte bei Usern gibt es?	2**](#6.-was-für-rechte-bei-usern-gibt-es?)

[**7\. Was kann bei der Gruppenerstellung eingestellt werden?	3**](#7.-was-kann-bei-der-gruppenerstellung-eingestellt-werden?)

[**8\. Was soll das MVP beinhalten?	3**](#8.-was-soll-das-mvp-beinhalten?)

[**9\. Offene Fragen von Gemini	3**](#9.-offene-fragen-von-gemini)

[**10\.  Implizite Annahmen von Gemini	7**](#10.-implizite-annahmen-von-gemini)

# 1\. Was ist der Pod-Manager? {#1.-was-ist-der-pod-manager?}

Der Pod-Manager ist eine App zur Verwaltung von Magic the Gathering Spielgruppen unabhängig vom gewählten Format. Er erlaubt das Einsehen von Spielergebnissen, Ranglisten, Seasons und Statistiken spezifisch für diese Spielgruppe. Die Sprache in der gesamten App ist per default englisch, kann später aber optional noch auf weitere Sprachen erweitert werden.

# 2\. Welcher Techstack soll verwendet werden? {#2.-welcher-techstack-soll-verwendet-werden?}

1. Das Frontend soll mit Angular gebaut werden  
2. Das Backend wird mit [node.js](http://node.js) gebaut  
3. Als Datenbank wird MariaDB verwendet  
4. Schnittstellen werden je nach Bedarf ausgewählt. (z.B. Prisma als Schnittstelle zwischen DB und Logik Layer)  
5. Nicht explizit Teil des Techstacks aber doch relevant: Alle Berechnungen und Zahlen der App werden auf 1 Stelle nach dem Komma gerundet

# 3\. Was soll die Landing Page beinhalten? {#3.-was-soll-die-landing-page-beinhalten?}

Auf der Landing Page sind über zentrierte Buttons der Login oder die Registrierung möglich.

# 4\. Was passiert nach dem Login? {#4.-was-passiert-nach-dem-login?}

Nach dem Login mittels registrierter E-Mail Adresse und gewähltem Passwort landet der User in der Gruppenübersicht, wo er/sie zwischen den verfügbaren Gruppen auswählen kann. Diese werden gekachelt, mit dem Logo (oder dem Default Icon) und dem Namen der Gruppe dargestellt. Unterhalb befindet sich noch ein Untertitel mit dem gespielten Format der Gruppe (also z.B. Standard, Modern oder Commander). Verfügbar sind alle Gruppen, bei denen der User bereits Mitglied ist.

Dort befindet sich auch ein Button zur Erstellung einer neuen Gruppe.

Außerdem findet sich hier ein Button zum Betreten einer bestehenden Gruppe mittels eines Direktlinks, der von dieser Gruppe herausgegeben werden kann.

Perspektivisch könnte hier auch eine Suchfunktion nach bestehenden Gruppen implementiert werden.

# 5\. Was passiert nach dem Betreten einer Gruppe? {#5.-was-passiert-nach-dem-betreten-einer-gruppe?}

Wenn der User über eine der Kacheln die entsprechende Gruppenübersicht betreten hat, landet er auf der zentralen Ansicht der Gruppe.

Diese ist unterteilt in drei Abschnitte:

1. Der linke Bildschirmbereich umfasst die Rangliste und die Historie der letzten erfassten Spiele  
2. Auf der rechten Bildschirmseite befinden sich allgemeine Statistiken der aktuellen Gruppe wie z.B. meistgespielte Farben oder meistgespielte Decks  
3. Am unteren Ende der Seite befinden sich Verwaltungsoptionen wie Feedback Formulare oder Funktionen für Gruppenadministratoren, z.B. Nutzerrechte.

# 6\. Was für Rechte bei Usern gibt es? {#6.-was-für-rechte-bei-usern-gibt-es?}

Angedacht sind die folgenden Rollen:

1. Der System-Admin ist für den oder die Entwickler der App vorgesehen und kann auf alle Gruppen, alle Decks und alle User zugreifen.  
2. Der Gruppen-Admin ist der User, der initial eine Gruppe angelegt hat oder diese Rolle anschließend von einem der bestehenden Gruppenadmins erhalten hat. Diese können den Namen, das Logo (Anzeigebild) und die Beschreibung der Gruppe editieren, Mitglieder aus der Gruppe entfernen oder den Einladungslink einsehen. Gruppenadmins können neue Decks anlegen und bestehenden Gruppenmitgliedern zuordnen. Außerdem können Gruppenadmins die Namen von Decks aller Nutzer der Gruppe editieren. Letzendlich können diese auch die bestehende Gruppe zurücksetzen oder löschen.  
3. Das Gruppenmitglied ist ein default-user, der entweder über einen Einladungslink oder einen anderen Weg einer Gruppe beigetreten ist und über keine Administrationsrechte verfügt. Gruppenmitglieder können neue Decks hinzufügen, diese werden automatisch dem entsprechenden Mitglied zugeordnet.

# 7\. Was kann bei der Gruppenerstellung eingestellt werden? {#7.-was-kann-bei-der-gruppenerstellung-eingestellt-werden?}

1. Beim Anlegen einer neuen Gruppe muss der entsprechende Nutzer einige Einstellungen festlegen, die teilweise später nicht mehr geändert werden können.  
2. Als erstes wird der Name festgelegt. Dieser ist später editierbar. Im Programm werden Gruppen über ID angesteuert, nicht über Namen. Die Eingabe ist verpflichtend.  
3. Eine der wichtigsten Einstellungen ist, welches Format die Gruppe spielen möchte. Diese Einstellung ist bindend und kann später nicht mehr geändert werden. Auch diese Eingabe ist verpflichtend.  
4. Dann kann ein Gruppenbild hochgeladen werden. Dieses wird homogenisiert (auf ein vom DEV gewähltes Format gebracht), komprimiert und als Bytecode in der DB abgespeichert. Die Eingabe ist optional. Wird kein Bild hochgeladen, wird ein Standardbild dargestellt (die Rückseite einer Magic the Gathering Karte).  
5. Schlussendlich kann eine Beschreibung der Gruppe eingegeben werden. Diese ist wie das Bild optional. Es wird kein Default-Text dargestellt.

# 8\. Was soll das MVP beinhalten? {#8.-was-soll-das-mvp-beinhalten?}

Im MVP muss bereits der größte Teil der Benutzerverwaltung enthalten sein. Neue User müssen sich erfolgreich anmelden können (inkl. Bestätigungsmail). 

Sie müssen eine Gruppe anlegen mit Name und Format, sowie auf einer Übersichtsseite ihre Gruppen sehen können.

Auf der Gruppenseite müssen die Rangliste und die Spielhistorie bereits funktionstüchtig implementiert sein.

User müssen ihrer Gruppe neue Decks hinzufügen und nachträglich editieren können. Gruppenadmins müssen Decks aller User editieren, sowie Nutzer aus der Gruppe entfernen oder mittels Direktlink einladen können.

Gruppenadmins müssen auf der Gruppenseite neu gespielte Spiele registrieren können, und diese Eingaben müssen sowohl die Rangliste entsprechend aktualisieren, als auch in der Historie auftauchen.

# 9\. Offene Fragen von Gemini {#9.-offene-fragen-von-gemini}

1. Saisonverwaltung: Die Saisonverwaltung erfolgt innerhalb jeder einzelnen Gruppe. User der Gruppe mit der Berechtigung “Gruppenadmin” können in den Gruppeneinstellungen die Rangliste zurücksetzen. Alle Performance Werte aller Decks innerhalb der Gruppe werden auf 0 gesetzt.   
   Eine Season ist ein von einem Gruppenadmin in den Gruppeneinstellungen festgelegter Zeitraum, nach dessen Ablauf die Rangliste, die Spielhistorie und alle weiteren Statistiken zurückgesetzt werden. Die verbleibende Dauer der aktuellen Season wird auf der Übersichtsseite der Gruppe angezeigt. Dieses Feature ist noch optional und kann erst einmal hinten angestellt werden. Es ist nicht Teil des MVP.  
2. Detaillierte Spielerfassung: Ein Gruppenadmin kann über einen Button in der Gruppenübersichtsseite ein neues Spiel erfassen. Es öffnet sich ein Modal oder ähnliches Formular, in dem der Erfasser folgende Daten eintragen kann:  
   1. Datum des Spiels (Default: Timestamp, nur Datum, keine Uhrzeit)  
   2. Anzahl der Spieler (2-6) \- Angabe Pflicht.  
   3. Je nach Auswahl bei Punkt 2.2 erscheinen “Slots” zur Auswahl der Decks, die an dem jeweiligen Spiel teilgenommen haben.  
   4. Diese Slots werden vom Erfasser gefüllt mit Decks seiner Wahl aus den bestehenden Decks der Gruppe.  
   5. Der Erfasser trägt für jedes Deck in der Liste den erreichten Rang ein. Haben zwei oder mehr Decks denselben Rang, gilt dies als Unentschieden zwischen diesen Decks. Ein Unentschieden kann zwischen so vielen Decks bestehen, wie an dem Spiel teilgenommen haben.  
   6. Für jedes ausgewählte Deck der Liste kann der Name des Spielers eingetragen werden / aus einer Liste der verfügbaren Gruppenmitglieder ausgewählt werden. Diese Angabe ist optional. Als default wird der Name des Users eingetragen, der das gewählte Deck initial der Gruppe hinzugefügt hat.  
   7. Das Spielformat des eingereichten Spiels wird automatisch entsprechend den Gruppeneinstellungen festgelegt und mit abgespeichert (Gruppen haben ein bei der Erstellung festgelegtes Format). Diese Daten können später für Statistiken genutzt werden.   
   8. Die Spielerfassung ist ein essentieller Bestandteil der App und muss im MVP vollständig implementiert sein.  
3. Deckmanagement-Tiefe:Jede Gruppe enthält eigene Decks. Diese können von den Mitgliedern der Gruppe eingereicht werden.   
   1. Dies geschieht über einen Button in der Gruppenübersichtsseite, welcher äquivalent zum Einreichen eines gespielten Spiels in einem Modal oder ähnlichem geöffnet wird.  
   2. Decks, die von einem Gruppenmitglied eingereicht werden, sind automatisch diesem User zugeordnet. Gruppenadmins können beim Einreichen den User auswählen, dem dieses Deck zugeordnet werden soll.  
   3. Beim Einreichen eines neuen Decks kann der User dem Deck einen Namen geben und aus den möglichen Farbkombinationen aus Magic the Gathering wählen (Beispiele sind Mono-White, Mono-Red, Simic, Izzet, Jeskai, Temur, Growth, Artifice, WUBRG \[Domain\] und Farblos). Diese Farben sind kanonisch vorgegeben und können nur ausgewählt, aber nicht modifiziert werden. Wenn in der App von Farbe gesprochen wird im Hinblick auf die Decks sind dabei immer explizit diese kanonischen Namen gemeint.  
   4. Zusätzlich kann der User optional einen Deck-Typ auswählen aus den gängigen Varianten (Aggro, Combo, Battlecruiser, Control, Prison, Tempo und Midrange). Das Feld darf leer bleiben, kein default nötig.  
   5. Über die Gruppenübersichtsseite kann der eingeloggten User seine eigenen Decks, Gruppenadmins alle Decks der Gruppe nachträglich editieren. Editierbar sind dabei Farbe, Name und Typ des Decks. Außerdem kann das Deck wieder aus der Gruppe entfernt werden.  
   6. Eine weitere Option beim Editieren eines Decks ist das Aktivieren/Deaktivieren des entsprechenden Decks. Ein deaktiviertes Deck kann beim Einreichen eines neuen Spiels nicht mehr ausgewählt werden, es wird in der Rangliste als deaktiviert markiert und kann keine Performance Anpassungen mehr erhalten. Es behält aber sämtlichen bisherigen Performance Punkte und Statistiken und ist jederzeit wieder aktivierbar.  
   7. Für jedes Deck werden folgende Daten gespeichert:  
      1. Name  
      2. Farbkombination (siehe Punkt 3.3)  
      3. Anzahl insgesamt gespielter Spiele  
      4. aktuelles Performancerating  
      5. “Deckbesitzer” \- entweder der User, der das Deck registriert hat, oder welcher von einem Gruppenadmin als Besitzer zugewiesen wurde  
   8. Die komplette Deckerfassung und Deckverwaltung innerhalb einer Gruppe muss im MVP bereits enthalten sein.  
4. Generierung von Statistiken: bisher nicht explizit erwähnt hatte ich das Regelwerk zur Erzeugung des Performance Ratings, das für die Erstellung und Sortierung der Rangliste verwendet werden soll.  
   1. Jedes Deck erhält bei einem eingereichten Spiel je nach Rang eine gewisse Anzahl Punkte. Diese Punkte berechnen sich nach folgender Formel:  
      **((Anzahl der Spieler \- Erreichte Platzierung) / (Anzahl der Spieler \- 1)) \* 100**  
      Das bedeutet, dass jedes teilnehmende Deck eines Spiels je nach Anzahl der teilnehmenden Decks zwischen 100 und 0 Punkten erhält.  
   2. Teilen sich mehrere Decks den Selben Rang, werden die Punkte der verwendeten “Rangplätze” addiert und ein Mittelwert gebildet. Jedes Deck mit diesem geteilten Platz erhält dann diesen Mittelwert. Beispiel: 4 Decks, Deck A und Deck B erreichen beide den Rang 2\. Rang 2 würde in diesem Fall 66.7 Punkte erhalten, Rang 3 würde 33.3 Punkte erhalten. Der Mittelwert aus diesen beiden Werten ist 50, also erhalten Deck A und Deck B beide 50 Punkte. Das Ergebnis wäre hier also Deck C, Rang 1, 100 Punkte. Deck A und Deck B Rang 2, je 50 Punkte. Deck D Rang 4, 0 Punkte.  
   3. Nachdem das Spiel eingereicht wurde und jedes Deck seine automatisch berechneten Punkte erhalten hat, werden diese Daten in der Spielhistorie als fertig eingereichtes Spiel ausgegeben. Dieser Historieneintrag ist eine kurze Tabelle mit folgendem Format:  
      Spiel X (X ist gleich der Zahl der bisher an diesem Datum gespielten Spiele) \- Datum  
      \[Linie zur Abgrenzung des Tabellenkopfs vom Körper\]  
      Rang 1 \- \[Farbe des Decks\] \[Name des Decks\] \- \[erreichte Punkte\]  
      Rang 2 \- …  
      Rang 3 \- …  
   4. Nun kann die Rangliste aktualisiert werden. Das Performance Rating der Decks, die Punkte im eingereichten Spiel erhalten haben, wird angepasst nach folgender Formel:  
      **Performance Neu \= (bisherige Performance \* bisherige Rundenanzahl \+ neue Punkte) / (bisherige Rundenanzahl \+ 1\)**  
   5. Die gesamte Rangliste wird mit diesen neuen Performance Ratings neu sortiert. Positionsveränderungen innerhalb der Rangliste werden mit kleinen Markern vor den entsprechenden Decks dargestellt. Der Marker in Form eines nach oben zeigenden Dreiecks ist grün, wenn ein Deck sich verbessert hat und ein nach unten zeigenden Dreieck in rot, wenn sich das Deck verschlechtert hat. Eine kleine Zahl innerhalb des Dreiecks zeigt die Anzahl der veränderten Plätze.  
   6. Da jedes Deck wie bei Punkt 3 beschrieben einer kanonischen Farbkombination zugewiesen ist, können daraus Statistiken abgeleitet werden: Welche Farbkombinationen werden am häufigsten gespielt? Welche Einzelfarben (Farbkombinationen bestehen aus den 5 Grundfarben Rot, Weiß, Grün, Blau und Schwarz) haben die höchste Siegesrate? Welche Decktypen haben die höchste durchschnittliche Performance Rate? Welche Statistiken aus den erfassten Daten möglich sind, kann zu einem späteren Zeitpunkt erweitert und vertieft werden. Die Statistiken sind nicht Teil des MVP. Die Rangliste ist Kernbestandteil der App und Teil des MVP.  
5. Suchfunktion für Gruppen: dies ist erst für eine spätere Phase vorgesehen und nicht Teil des MVP. Initial soll nur für Gruppenadmins die Möglichkeit gegeben sein, einen Direktlink an Freunde einzusehen (diesen können sie dann außerhalb der App an Freunde weiterreichen). Durch diesen Link können registrierte Nutzer der Gruppe über die Gruppenauswahlseite (nach dem Login) beitreten. Dort befindet sich ein Eingabefeld für diesen Direktlink (ich stelle mir das eher wie einen Code vor als einen Link). Wenn ein neuer Nutzer einer Gruppe beitritt, wird dies ebenfalls in der Gruppenhistorie dargestellt, in welcher auch eingereichte Spiele dargestellt werden.  
6. Einladungslink-Mechanik: der Direktlink (im folgenden Beitrittscode genannt, siehe Punkt 5\) ist unbegrenzt gültig, kann aber von Gruppenadmins in den Gruppeneinstellungen neu erzeugt werden. Wird der Code neu erzeugt, verlieren alte Codes ihre Gültigkeit. Das Einladen von Usern über diesen Code ist Teil des MVP (siehe Punkt 5).  
7. Für die Speicherung des Gruppenanzeigebildes habe ich leider zu wenig Erfahrung und würde mich über Vorschläge freuen. Das Ziel soll sein, dass jede Gruppe frei ein Bild hochladen kann. Breite und Höhe des Bildes werden reduziert oder erhöht auf die Anforderungen der App (Darstellung des Bildes in der Gruppenübersicht). Außerdem wird auf der Gruppenauswahlseite nach dem Login eine Icon-Version des Bildes in den Kacheln der Gruppen angezeigt.  
   Die Bilder sollen DB-seitig gespeichert werden, wie das genau funktioniert weiß ich leider nicht. Dieses Feature kann auch erst in einer späteren Phase implementiert werden und muss nicht Teil des MVP sein.  
8. Feedback-Formulare: diese sollen Usern ermöglichen Feedback direkt an mich / die Entwickler zu senden. Dieses Feature ist nicht für das MVP vorgesehen.  
9. Eine simple Bestätigungsmail mit einem Aktivierungslink sollte genügen. Der User gibt bei der Registrierung seinen “In-App-Namen” (frei wählbar, unique) und seine E-Mail Adresse an, klickt in der Bestätigungsmail auf einen Link. Danach ist der Account aktiviert und kann vollumfänglich genutzt werden. Auf jeden Fall Teil des MVP.  
10. Deck-"Besitzer" vs. Spieler: Ja, Decks können von beliebigen Spielern gespielt werden. Dies müssen nicht zwingend Mitglieder der Gruppe sein. Das System ist wie du bereits erkannt hast stark Deck-zentriert. Für potentielle zukünftige Statistiken würde ich trotzdem gerne User Statistiken mitschreiben. Bitte berücksichtige dies bei der Tabellenkonstruktion.  
11. System-Admin-Benutzer: Ja, dieser Account wird auf jeden Fall geseedet und nicht behandelt wie ein normaler Benutzer. Dieser Account soll jede Gruppe sehen, sich “im stillen” in jede Gruppe einloggen, und diese mit allen Rechten eines Gruppenadmins bearbeiten können. Der Admin taucht dabei nicht als Mitglied der Gruppe auf und kann auch nicht als Eigentümer von Decks gewählt werden. Er hat eine rein administrative Funktion. Wenn Änderungen auf diese Weise durchgeführt werden wird in der entsprechenden Historie der betroffenen Gruppe eine kurze Nachricht ausgegeben (so etwas wie: Spieler XXXX entfernt durch Systemadmin, oder Gruppenbild entfernt durch Systemadmin).  
    Ob für den System-Admin eine eigene Tabelle benötigt wird glaube ich nicht, überlasse ich aber gerne dir.  
12. Mechanik des "Spiele-Zurücksetzens": Das zurücksetzen von Spielen habe ich vereinfacht \-\> es ist nur noch das letzte gespielte Spiel zurücksetzbar. Das sollte die Berechnung deutlich vereinfachen.  
13. Konzept der "Snapshots": Lass uns Snapshots fürs Erste weglassen, bis die Idee weiter gereift ist.  
14. Erfassung von Gast-Spielern: Ja, bei der Eingabe eines neuen Spiels ist ein Freitextfeld zur Eingabe des Spielernamens vorgesehen. Dieses kann per autocomplete bestehende Namen von Nutzern aus der Gruppe vervollständigen. Es muss aber kein Name angegeben werden. Wird kein Name angegeben wird automatisch der Name des Deckerstellers als Spieler angenommen.  
15. Gast Spieler werden nur in der Historie ausgegeben. Für die Statistik werden diese Gastspieler komplett ignoriert. Die Daten der Decks sind davon aber nicht betroffen.  
    Wiederkehrende Gäste oder Duplikate sind absolut in Ordnung. Es muss nichts erkannt oder zugeordnet werden.  
      
    

# 10\.  Implizite Annahmen von Gemini {#10.-implizite-annahmen-von-gemini}

1. Webanwendung: korrekt, es soll eine Webanwendung werden. Die Anwendung soll so weit wie möglich lokal entwickelt und implementiert werden. Bei großen Milestones oder neuen Features soll ein push auf das bereits vorhandene Git-Repository ([https://github.com/mlu84/mtg-pod-manager.git](https://github.com/mlu84/mtg-pod-manager.git)) erfolgen. Wenn das MVP erreicht wurde, werde ich mir einen Hoster suchen und die App live schalten. Da ich bereits noch keine App komplett alleine livegeschaltet habe bin ich hier für jede Unterstützung und Hilfe dankbar.  
2. Relationale Datenbank: korrekt, bitte schlage mir alle notwendigen Tabellen vor und erzeuge mir dann bei Bedarf die SQL Statements, dann übernehme ich das Anlegen der Tabellen in meiner lokalen DB. Das Umziehen der DB auf live gehen wir später an.  
3. Standard-CRUD-Operationen: Grundsätzlich korrekt, siehe obige Punkte für Ausnahmen von der Regel. Im Zweifelsfall schränke ich das zu einem späteren Zeitpunkt ein.  
4. Eindeutige Benutzerkonten: korrekt  
5. Mehrere Gruppen pro Benutzer: korrekt, jeder Nutzer kann außerdem je nach Gruppe verschiedene Rollen haben. Es muss (fürs Erste) einen Systemadmin User geben, der besondere Rechte hat. Dieser muss alle Gruppen sehen können und alle Rechte eines Gruppenadmins haben. Dieser Systemadmin wird nicht als normaler Nutzer aufgeführt und ist auch nicht Teil einer Gruppe. Er hat reine Administrationsfunktion für mich als Developer. Möglicherweise bedarf es sogar eine eigenen kleinen und leichtgewichtigen Systemadministration Unterseite mit entsprechenden Verwaltungsoptionen für diese Rolle.  
6. Eine Gruppe, ein Format: korrekt  
7. Keine öffentliche Gruppenliste im MVP: korrekt, eine Suchfunktion mit anschließender “Bewerbungsfunktion” kann in einer späteren Phase folgen.  
8. Bildspeicherung in der Datenbank: Wie im Menüpunkt 9, Unterpunkt 7 bereits erwähnt, fehlt mir hier das Wissen für qualifizierte Ergänzungen. Hier müsstest du Vorschläge machen.  
9. Prisma als ORM: Dies ist nur eine Idee, wenn du praktikablere oder andere Vorschläge für die Verbindung zur DB hast, kannst du diese gerne einbringen.  
10. Standard-Websicherheit: korrekt  
11. Client-Side Rendering: Client Side Rendering ist korrekt, ich habe keinerlei Erfahrung mit RESTful API’s, deswegen musst du hier eigene Vorschläge machen.  
12. Technologie-Kompetenz: korrekt  
13. Logik ist Format-unabhängig: korrekt  
14. Ehrlichkeit der Dateneingabe: **Korrektur:** Ja, das System vertraut auf eine ehrliche Erfassung, es muss aber noch eine Möglichkeit für Gruppenadmins eingebaut werden, über die Gruppeneinstellungen das letzte eingegebene Spiel rückgängig zu machen.  
15. Konsistenz bei Rundungen: Da die Rangliste bei uns bisher manuell geführt wurde war diese Rundungsunschärfe leider notwendig. Wir können innerhalb des Systems auch gerne genauer arbeiten. Hauptsache auf der Oberfläche sind alle Zahlen auf die erste Stelle nach dem Komma gerundet.  
16. Single Source of Truth: Korrekt, die MariaDB ist die SSoT        
17. Snapshot-Feature ist nachgelagert: Wie in Menüpunkt 9 Unterpunkt 13 bereits erwähnt ist Snapshot erstmal kein Teil des MVP und wird wenn überhaupt erst später implementiert.   
18. "In-App-Name" als Display-Name: korrekt