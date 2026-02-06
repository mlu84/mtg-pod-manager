# MTG Pod-Manager \- Phase 2

[**1\. Login Maske	1**](#1.-login-maske)

[**2\. Sysadmin Oberfläche	1**](#2.-sysadmin-oberfläche)

[**3\. Gruppenauswahl	2**](#3.-gruppenauswahl)

[**4\. Gruppenübersicht	2**](#4.-gruppenübersicht)

[**5\. Neues Spiel spielen	4**](#5.-neues-spiel-spielen)

[**6\. Statistik Card	6**](#6.-statistik-card)

[**7\. Allgemeines Design	7**](#7.-allgemeines-design)

[**8\. Bugs	7**](#8.-bugs)

In Phase zwei sollen weitere Features ergänzt werden, die die App umfangreicher und informativer machen. Das Ziel ist, dass die App alle Features bereitstellt, die man benötigt, um eine MTG Gruppe zu managen, ohne dass man weitere Apps benutzen muss.

# 1\. Login Maske {#1.-login-maske}

1. Keine Änderungen nötig fürs Erste

# 2\. Sysadmin Oberfläche {#2.-sysadmin-oberfläche}

1. die ursprünglich angedachte Sysadmin Oberfläche wird ersetzt durch Sysadmin Features in der Gruppenauswahl-Seite  
2. Sysadmin logt sich immernoch wie bisher ein und landet wie alle User in der Gruppenauswahl  
3. Im Seitenheader gibt es für den Sysadmin weitere Buttons, die zu speziellen Adminseiten verlinken.  
4. Die erste davon ist bereits implementiert: die [archidekt.com](http://archidekt.com) API test Seite. Dies kann so bleiben wie es ist  
5. Der zweite Button ist eine neue Funktion, die auf eine Seite zur Useradministrtion verlinkt  
   1. Die Seite enthält eine Auflistung aller Gruppen inklusive einer Gruppensuchfunktion und Pagination  
      1. Bei jeder Gruppe ist ein Button verfügbar, über den der Sysadmin die Gruppe nach extra Confirmation löschen kann  
      2. Die Löschung ist unabhängig vom Status der Gruppe und funktioniert immer  
   2. Bei jeder Gruppe werden alle Mitglieder dieser Gruppe tabellarisch aufgeführt mit Name, E-Mail, Status (Member oder Admin) und vier Buttons:  
      1. User umbenennen  
      2. User befördern / degradieren (je nachdem ob Member oder Admin)  
      3. Entferne User aus Gruppe (äquivalent zu den anderen Löschbuttons der App muss hier eine Confirmation eingebaut sein) \- Der User Account bleibt erhalten.  
      4. Lösche User Account (äquivalent zu den anderen Löschbuttons der App muss hier eine Confirmation eingebaut sein) \- der Account wird endgültig gelöscht.  
   3. jede hier durchgeführte Aktion posted eine Systemnachricht in die Historie der betroffenen Gruppen. z.B. das Löschen eines Users posted eine Nachricht in alle betroffenen Gruppen, in denen der User Teil war.  
6. die [archidekt.com](http://archidekt.com) API URL ist hard‑coded auf http://localhost:3000 im Frontend, das muss für die bevorstehende Live-Schaltung verbessert werden (env config?)

# 3\. Gruppenauswahl {#3.-gruppenauswahl}

1. Das bereits bestehende Icon soll (wenn vorhanden) durch das Gruppenanzeigebild ersetzt werden.  
2. hier muss es hinter einem weiteren Button (neben “join group” und “create group”) eine Suchfunktion geben, mit der man nach bestehenden Gruppen suchen kann. diese öffnet sich in einem Modal.  
3. wird über die suche eine gruppe gefunden, kann man sich direkt bei dieser gruppe bewerben  
4. diese offene bewerbung kann dann von einem Gruppenadmin der entsprechenden Gruppe angenommen oder abgelehnt werden (siehe Abschnitt 4.8.d). Bewerbungen haben kein Verfallsdatum und es können beliebig viele Bewerbungen gleichzeitig offen sein.  
5. In diesem Modal wird eine paginierte Liste aller aktuell offenen Bewerbungen dieses Users angezeigt. Diese Liste zeigt gleichzeitig maximal 5 Einträge gleichzeitig.  
6. Angenommene oder abgelehnte Bewerbungen verschwinden aus dieser Liste  
7. Zu jeder Gruppe kann maximal eine Bewerbung pro Benutzer existieren, ein erneuter Versuch schlägt fehl mit der Nachricht an den User, dass bereits eine offene Bewerbung existiert.  
8. Der Button erhält eine kleine Zahl am unteren rechten Rand des Icons, die der Anzahl offener Bewerbungen entspricht.  
9. es wird keine Liste aller verfügbaren Gruppen angezeigt.

# 4\. Gruppenübersicht {#4.-gruppenübersicht}

1. Die Historieneinträge müssen ein Verfallsdatum bekommen, damit sich nicht endlos viele Nachrichten anhäufen. Gruppenadmins bekommen eine Konfigurationsmöglichkeit, bei der sie dieses Verfallsdatum bis zu einem vorgegebenen Maximum von 1 Jahr frei einstellen können. Überschreitet ein Historieneintrag dieses Verfallsdatum, wird die Nachricht aus der Liste und aus der DB gelöscht. Kein “soft-löschen” sondern wirklich. Ich möchte die Datenbank möglichst sauber halten, ohne langfristig DB bloat zu erzeugen.  
2. Dieses Verfallsdatum bezieht sich auf alle Historiennachrichten, sowohl Spiele als auch Systemevents  
3. Der “Add-Deck” Button soll in den Header der Deck-Liste verschoben werden (rechtsbündig)  
4. Der “Zurück zur Gruppenübersicht”-Button im Seitenkopf soll vertikal ausgerichtet werden, nicht horizontal (Pfeil zeigt immer noch nach links). Linksbündig.  
5. Zwischen dem "Zurück zur Gruppenübersicht”-Button und dem Titel der Gruppe soll das Gruppenbild dargestellt werden. Wenn kein Gruppenbild verfügbar ist, wird ein default Anzeigebild ausgegeben. Das Gruppenbild wird als Bytecode in der Datenbank, Tabelle “group” gespeichert. Upload möglich bei Gruppenerstellung oder über die Gruppeneinstellungen. Im Seitenkopf rechts des Format Untertitels werden nun Buttons zur Verwaltung der Gruppe angezeigt. Diese öffnen verschiedene Modals mit weiteren Optionen.   
6. hinzugefügte Verwaltungsbuttons: Gruppeneinstellungen, Mitgliedereinstellungen.  
7. Der Gruppe löschen Button (und die Bestätigungslogik) wird verschoben in die Gruppeneinstellungen  
8. Gruppeneinstellungen umfassen:  
   1. Löschen der Gruppe  
   2. Ändern des Gruppennamens  
   3. Upload / Ändern des Gruppenanzeigebildes  
   4. manuelles Zurücksetzen der Rangliste inklusive Bestätigung äquivalent zum löschen der Gruppe  
   5. Einstellungen zur automatischen Zurücksetzung der Rangliste \- die aktive Season. Wird hier etwas eingetragen, taucht auf der Gruppenübersichtsseite bei der Rangliste ein Countdown auf, wie lange diese noch gültig ist bis zum nächsten Reset. Kurz vor dem Ende der restlichen Laufzeit wird dieser Countdown grafisch hervorgehoben durch warnfarben und / oder blinken, ähnlich dem Button zur Bestätigung der Gruppenlöschung  
   6. Der eingestellten Season kann ein Name gegeben werden. Dieser wird dann bei der Rangliste neben der verbleibenden Dauer eingeblendet. Dieser ist optional. Default ist “Active Season”. Läuft die Season ab, wird dieses Feld wieder geleert.  
   7. Wenn eine Rangliste automatisch nach Ablauf des eingetragenen Zeitraums zurückgesetzt wird, wird für einen festgelegten Zeitraum von 2 Wochen zwischen Seitenkopf und Seiteninhalt ein neues Seitenelement angezeigt, dass die ersten drei Plätze der abgelaufenen Rangliste darstellt mit dem Hinweis: “Congratulations to the Winners”. Wurde eine Season-Name hinterlegt, wird dieser Text erweitert um “ of season XYZ” wobei XYZ der Name ist. Dieses Seitenelement hat einen kleinen X Button oben rechts über den der eingeloggte User diese Nachricht FÜR SICH ausblenden kann. Dafür muss vermutlich ein Flag in der DB hinzugefügt werden. Die Nachricht wird dann ausgeblendet bis zum Start der nächsten Season.  
   8. Es kann ein Zeitraum festgelegt werden, bis die nächste Rangliste automatisch startet. Default ist hier 0 (neue Rangliste startet sofort nach Ablauf der alten). Ist hier ein Wert größer 0 eingetragen, können in dieser Zeit keine neuen Spiele registriert werden und keine Performance wird angepasst. Es können in dieser Pausenzeit weiterhin neue Spiele gespielt werden (über den Button). Der “Record Game” Button und die automatische Spielerfassung am Ende eines “Neuen Spiels” bleiben solange gesperrt und speichern keine Daten, bis dieser Pausenzeitraum vorbei ist und die neue Rangliste gestartet wurde. In den beiden entsprechenden Modals wird eine Warnmeldung ausgegeben, um dies an den User zu übermitteln. Während dieser Pausenzeit werden keine Daten erfasst und auch nicht “gequeued”, sie verfallen.   
   9. Wenn eine Rangliste zurückgesetzt wurde (egal aus welchem Grund oder auf welche Art), kann der Benutzer für einen einstellbaren Zeitraum zwischen der aktuellen und der vergangenen Rangliste hin- und herschalten. Die alte Rangliste kann sich nicht mehr ändern (sie ist nur noch ein Snapshot. Decks sammeln Performance nur noch in der aktuellen Rangliste). Dieser Umschaltbutton existiert nur, wenn eine alte Rangliste existiert.   
   10. Die alte Rangliste bleibt erhalten, bis die aktuelle Rangliste beendet ist. In dem Fall überschreibt die aktuelle Rangliste die ehemalige, und es wird eine neue Rangliste erstellt. Das Umschalten zwischen beiden Ranglisten ist an die Lebensdauer der Rangliste gekoppelt \- solange eine alte Rangliste existiert, existiert auch der “Snapshot”, und es kann umgeschaltet werden.  
   11. Die maximale Lebensdauer einer Season ist 1 Jahr.  
   12. Es kann die Lebensdauer von Historieneinträgen angegeben werden. Default ist hier 1 Monat. Weitere Einstellungsmöglichkeiten sind 1 Woche und 1 Jahr.  
9. Mitgliedereinstellungen umfassen:  
   1. eine Liste aller Mitglieder \- über einen Button können Mitglieder zu Gruppenadmins befördert oder Gruppenadmins zu Mitgliedern degradiert werden. Es muss immer mindestens ein Gruppenadmin existieren.  
   2. ebenfalls können hier Mitglieder aus der Gruppe entfernt werden.  
   3. alle Änderungen in diesem Menü werden in der Gruppenhistorie als Systemnachricht ausgegeben  
   4. hier taucht auch eine Liste aller offenen Bewerbungen auf \- über kleine Buttons neben dem Kontakt in der Liste kann ein Gruppenadmin die entsprechende Bewerbung direkt ablehnen oder annehmen. Bewerbungen haben kein Verfallsdatum und bleiben in dieser Liste bis ein Gruppenadmin dieses entweder ablehnt oder annimmt. Ein User kann unbegrenzt viele Bewerbungen gleichzeitig offen haben.  
10. Der “Record Game”-Button wird nun quadratisch und rechtsbündig im Seitenelement. Der verschobene “Add-Deck”-Button macht Platz für einen neuen Button "Neues Spiel spielen”. Dieser öffnet eine komplett neue Oberfläche (siehe Hauptmenüpunkt [5\. Neues Spiel spielen](#5.-neues-spiel-spielen))  
11. Der “Neues Spiel spielen” Button kann nur angeklickt werden, wenn der Gruppe mindestens 2 verschiedene Decks hinzugefügt wurden. Solange das nicht der Fall ist, erscheint ein Mouseover mit dem Hinweis: Bitte der Gruppe weitere Decks hinzufügen.  
12. Die Pergament-Optik des Hintergrund der einzelnen List-Items in der Rangliste wirkt leider zu deplatziert im Kontext des restlichen Designs. Ohne Hintergrund, also so dass der Webseiten Hintergrund durchscheint, ist mir nicht schön genug und hebt sich für mich nicht genug vom Rest der App ab. Ich hätte hier gerne einen Vorschlag, wie man gleichzeitig die einzelnen Items über den Background hervorheben kann, ohne dass es zu sehr heraussticht und sich zu deutlich mit dem Hintergrund der Webseite beißt. Ich würde mich hier gerne an anderen, im Internet verfügbaren Ranglisten-Stilen orientieren. Die Border der einzelnen Items und der Content an sich muss gleich bleiben.

# 5\. Neues Spiel spielen {#5.-neues-spiel-spielen}

1. Eine komplett neue Oberfläche, die den gesamten Bildschirm ausfüllt und keine bisherigen Seitenelemente anzeigt.  
2. Diese Oberfläche ist zum aktiven benutzen der Spielgruppe während eines Spiels gedacht.  
3. Diese Oberfläche ist gestaltet wie eine Smartphone App. Keine Scrollbalken, alles muss sich perfekt dynamisch an die Screensize des Endgerätes anpassen.  
4. Direkt zentriert in der Mitte (horizontal wie vertikal) ist ein rundes Element mit den Einstellungen zum aktiven Spiel. Alle Elemente hier sind kreisförmig als Buttons angelegt. Ein Klick (oder touch) öffnet ein kleines Modal mit den Einstellungsmöglichkeiten. **Alles in dieser Oberfläche muss so gestaltet sein, dass man keine Tastatur benötigt (voll touch fähig)**:  
   1. Anzahl der Spieler (2-6, default 4\) ändern \- Der Bildschirm außerhalb des zentralen Kreises wird in gleichmäßig große Areale entsprechend der eingestellten Spielerzahl um den zentralen Kreis herum aufgeteilt. Sind weniger als 6 verschiedene Decks einer Gruppe zugeordnet, können nur maximal so viele Spieler ausgewählt werden, wie Decks verfügbar sind.  
   2. 20-seitigen Würfel würfeln \- wird der Button geklickt, wird eine kurze Würfelanimation eines 20-seitigen Würfels abgespielt. Das restliche Interface wird währenddessen kurz abgedunkelt und inaktiv gestellt. Dann wird groß und zentral für 2 Sekunden die gewürfelte Zahl dargestellt.  
   3. Spiel abbrechen (mit Confirmation Button)  
   4. Spiel starten \- es wird zufällig aus allen aktiven und fertig konfigurierten Arealen / Decks eines ausgewählt, das das Spiel beginnen darf. Dazu wird ähnlicher wie bei einem Roulette Spiel verschiedenen Arealen sehr kurze Zeit eine leuchtende (gelbe) Border gegeben. Am Ende dieser 3-sekündigen Animation bleibt der leuchtende Border bei einem Deck bestehen. Dieses Deck beginnt das Spiel.  
5. Die Areale sind am Anfang abgedunkelt und Icons und Buttons gesperrt. Der User muss wie bei 5.6.e beschrieben ein Deck auswählen, bevor das Areal wirklich aktiv wird und alle Funktionen genutzt werden können. Für jedes Areal muss ein Deck ausgewählt werden, bevor der Spielstart-Button betätigt werden kann. Der Spielername ist wie gesagt optional.  
6. Die Areale enthalten die Funktionen, die jeder Spieler für sein MTG Spiel benötigt:  
   1. Eine Lebenspunkteanzahl gut lesbar in der Mitte des Areals, idealerweise mit weißem Outline, um die Lesbarkeit sowohl bei hellen als auch dunkleren Hintergrundbildern abzusichern.  
   2. Ein “+” Button zur Erhöhung der Lebenspunkte an der einen Seite  
   3. Ein “-” Button zum senken der Lebenspunkte an der gegenüberliegenden Seite  
   4. Fällt die Lebenspunktezahl eines Areals auf 0 scheidet das entsprechende Deck aus.  
   5. Durch “touch and hold” oder “click and hold” auf das Hintergrundbild oder den Namen des Decks (also alles, was kein anderes Bedienelement des Areals umfasst) wird ein Modal geöffnet, über welches man für dieses Areal ein Deck aus allen verfügbaren Decks der aktiven Gruppe auswählen kann und optional, wie bei der Spielerfassung, den Namen des Spielers eingeben kann.  
   6. Die Auswahl eines Decks zeigt deckend als Hintergrund für das entsprechende Areal das Anzeigebild des Decks äquivalent zur Rangliste an. Zusätzlich wird an der Oberseite des Areals der Deckname inklusive der Farben angezeigt. Darunter wird der optionale Spielername angezeigt, wenn vorhanden.  
   7. An der Unterseite des Areals sind weitere Icons angebracht:  
      1. ein Icon mit einer Miniaturansicht für jedes andere mitspielende Deck. Durch anklicken / touch des entsprechenden Icons erhöht sich ein Zähler auf dem Icon um 1\. Erreicht dieser Zähler 21, scheidet das Deck in diesem Areal aus. Der Zähler zählt den so genannten “Commander Damage”, den das Deck des Areals von dem anderen Deck, dessen Icon angeklickt wurde, erhalten hat.  
      2. durch ein “touch and hold” oder “click and hold” auf dieses Icon öffnet sich ein kleines Modal, in dem der Zähler für Commander Damage manuell in 1-er Schritten erhöht oder gesenkt werden kann.   
      3. Ein Icon mit einem Schwarzen Tropfen mit grünem Outline. Dies symbolisiert “Poison Counter” des Decks in diesem Areal. Klick / Touch erhöht die Anzahl um 1\. “touch and hold” oder “click and hold” öffnet wie bei Commander Damage ein kleines Modal zur manuellen Anpassung der Poison Counter in 1-er Schritten nach oben oder unten. Erreicht dieser Zähler 10, scheidet das Deck dieses Areals ebenfalls aus.  
      4. Die Icons für Commander Damage und Poison Counter sollen in zwei Reihen angeordnet und groß genug sein, dass man die Anzeigebilder gut genug erkennen kann, ohne das Areal komplett zu füllen.  
      5. Sind nur 2 oder 3 Spieler in diesem Spiel werden die Icons in einer Reihe angezeigt.  
   8. Die Idee ist, dass Spieler die App mit dieser Funktion öffnen und das Gerät ihrer Wahl in die Mitte des Tisches legen können. Spieler ordnen sich nun im Kreis um das Anzeigegerät an und können so ihr Deckareal in halbwegs korrekter Ausrichtung sehen. die Areale müssen also sternförmig vom zentralen Optionenkreis in Richtung Bildschirmrand ausgerichtet sein, so dass jeder User sein Deckareal möglichst richtig herum sehen kann.  
   9. Ist das Gruppenformat “Commander” starten alle Spieler mit 40 Lebenspunkten, ansonsten starten alle Spieler mit 20 Lebenspunkten.  
   10. Die Icons für Commander Damage werden ausschließlich im Commander Format angezeigt  
7. Diese Oberfläche funktioniert insgesamt ähnlich wie die “Record Game” Oberfläche: sie erfasst das Ergebnis eines Spiels. Nur dass sie benutzt wird, um das live gespielte Spiel zu unterstützen und am Ende automatisch zu erfassen. “Record Game” dagegen erlaubt das erfassen bereits fertig gespielter Spiele.  
8. Wenn nur noch ein Spieler am Leben ist endet die Partie. Die Oberfläche wird geschlossen und ein Modal mit der Spielzusammenfassung wird angezeigt. Dieses Modal ist äquivalent zum Modal der “Record Game” Funktion, nur dass die Anzahl der Spieler, die mitspielenden Decks, die optionalen Namen und die erreichten Ränge bereits eingetragen sind. Der User kann hier nochmal alles kontrollieren und eventuelle Ranganpassungen vornehmen (für Ties) und dann das Spiel erfassen wie bisher.

# 6\. Statistik Card {#6.-statistik-card}

1. Das grundlegende Design der Gruppenübersicht wird verändert:   
   1. Die Rangliste nimmt weniger horizontalen Raum ein \- alle Cards auf der rechten Seite erhalten mehr Platz. Die Rangliste nimmt immer noch mehr als 50% des Raums ein.  
   2. Die Cards “Decks” und “Members” werden collapsable, also ein- und ausklappbar sein. Das bedeutet, dass der Content dieser Cards versteckt ist, bis der User über einen kleinen Pfeil im Header der Card den Content ausklappt. Default für beide Cards ist eingeklappt, also ausgeblendeter Content.  
   3. Die Buttons “Neues Spiel spielen” und “Record Game” bleiben wie sie sind und behalten ihre Position oben rechts. Diese Card wird nicht einklappbar sein.  
   4. Zwischen diesen Aktionsbuttons und der Deckliste entsteht eine neue Card “Statistik”. Diese ist per default aufgeklappt und der Content sichtbar.  
2. Das Statistik Panel zeigt grafische Kurven und Charts, um verschiedene Aspekte der Gruppendaten sichtbar zu machen. Der Content besteht aus zwei Teilen:   
   1. oben ist ein Chart zu sehen  
   2. unterhalb sind verschiedene Buttons und Auswahlmöglichkeiten, um andere Charts und Graphen anzuzeigen  
   3. Die Auswahl ersetzt den Chart, es wird immer nur ein Chart angezeigt  
3. Über die Buttons kann zwischen verschiedenen Datensätzen umgeschaltet werden. Unterhalb der Buttons wird eine Dropdown Liste an verfügbaren Chart-Optionen angezeigt. Diese Dropdown Liste wird ausgetauscht, je nach angeklicktem Button. Der aktuell ausgewählte Button wird grafisch hervorgehoben. Es gibt folgende Buttons:  
   1. Farbdaten  
   2. Deckdaten (Daten der aktiven Season)  
   3. Spielerdaten (Daten der aktiven Season)  
4. Die Chart-Optionen der Farbdaten umfassen:  
   1. Häufigkeitsverteilung der einzelnen Farben (Season unabhängig)  
   2. Häufigkeitsverteilung der Farbkombinationen (Season unabhängig)  
   3. durchschnittliche Performance der einzelnen Farben (aktive Season)  
   4. durchschnittliche Performance der einzelnen Farbkombinationen (dies ist die per default angezeigte Statistik, d.h. der Button für Farbdaten ist angewählt und hervorgehoben, das Dropdown vorausgewählt mit dieser Option, dieser Chart wird beim Seitenaufruf initial gezeichnet) (aktive Season)  
5. Der Button “Deckdaten” zeigt zwei Dropdown-Listen. Über die erste kann eines der Decks aus der Deckliste der Gruppe ausgewählt werden. Das Design entspricht dem bei der Spielerfassung, also durchsuchbar und mit den Farb Icons vor den Decknamen.   
6. Die Chart-Optionen der Deckdaten umfassen (welche Daten müssen hier genau erfasst werden, damit diese Statistiken Sinn ergeben?):  
   1. Deck-Performance Entwicklung über Zeit im Vergleich zur durchschnittlichen Performance aller Decks im selben Zeitraum (Entwicklung der Performance über die letzten 10 Spiele dieses Decks innerhalb der aktuellen Season)  
   2. Rangentwicklung über Zeit (Entwicklung des Rangs über die letzten 10 Spiele dieses Decks innerhalb der aktuellen Season)  
   3. gespielte Spiele im Vergleich zu den anderen Decks der Gruppe (innerhalb der aktiven Season)  
7. Die Chart-Optionen für Spielerdaten umfassen:  
   1. Anzahl der gespielten Spiele im Vergleich zu den anderen Spielern der Gruppe (Anzahl der gespielten Spiele ist gebunden an die aktive Season)  
   2. Durchschnittliche Performance der eigenen Decks im Vergleich zur Durchschnittsperformance aller Decks der Gruppe  
8. Dieses System ist zukünftig erweiterbar und kann mit weiteren Statistiken erweitert werden.  
9. Die Statistiken / Charts zeigen immer nur Daten der aktuellen Season an, solange nicht explizit anderweitig erwähnt.

# 7\. Allgemeines Design {#7.-allgemeines-design}

1. Ist es möglich, diese Web-App als Smartphone App umzusetzen? Was wäre dafür, designtechnisch zu ändern? Was müsste technisch geändert werden? Welche Schritte sind nötig, um eine Smartphone App in die gängigen App-Stores zu bringen? Kann auch ein hybrider Ansatz gemacht werden? Also eine Web-App UND eine Handy-App, die beide auf dieselben Daten zugreifen und möglichst viel Back- und Frontend teilen?  
2. Ein Feedback System ist perspektivisch vorgesehen in Form eines Formulars, über das User mit mir als Dev Kontakt aufnehmen können, aber das wird auf eine weitere Phase verschoben.  
3. In der Kopfzeile der Gruppenauswahlseite und der Gruppenübersicht wird eine “Donate” Funktion hinzugefügt à la Buy me a coffee, genannt Buy me a Booster Pack. Dort können User über Paypal 5€ spenden, wenn ihnen die App gefällt. (Quick‑Link, kein komplexes Checkout)  
4. Dieser Donate Button ist immer sichtbar.

# 8\. Bugs {#8.-bugs}

1. Rank Validierung wird bisher nur im Frontend gemacht. Das muss behoben werden. Das Backend muss alle Eingaben ebenfalls validieren und Fehler an das Frontend zurückgeben.  
2. Im Frontend der Gruppe (Gruppeneinstellungen) kann das Format der Gruppe geändert werden. Dies ist ein Bug und war nicht so gedacht. Das Format ist fest vorgegeben bei der Erstellung der Gruppe. Die Option muss entfernt werden.

Weitere offene Fragen (kurz & gezielt)

1. Sysadmin‑Gruppenlöschung  
   * Soll der Sysadmin wirklich jede Gruppe löschen dürfen, auch wenn noch aktive Seasons/Spiele existieren?  
   * Gibt es eine zusätzliche Schutzstufe (z. B. „nur wenn leer“ oder „nur nach extra Bestätigung“)?  
2. Bewerbungen (kein Verfallsdatum, unbegrenzt)  
   * Was passiert, wenn ein User sich mehrfach bei derselben Gruppe bewirbt?  
   * Gibt es einen Statuswechsel in der Liste (z. B. „angenommen/abgelehnt“) oder wird der Eintrag gelöscht?  
3. Historien‑Verfall (DB‑Delete)  
   * Soll das Löschen wirklich hart aus der DB passieren oder „soft delete“ (z. B. für Audit)?  
   * Gelten die gleichen Verfallsregeln auch für Systemnachrichten (z. B. Admin‑Aktionen)?  
4. Season‑Reset & Pausenzeit  
   * Wenn „Neues Spiel spielen“ während der Pause erlaubt ist, was passiert mit den Ergebnissen konkret?  
     * Werden sie verworfen?  
     * Oder in einer „Warteschlange“ gesammelt und erst nach Start der neuen Season eingetragen?  
5. Ranglisten‑Snapshot / Umschalten  
   * Wie lange darf der Umschaltzeitraum sein? (frei definierbar oder feste Auswahl?)  
   * Was passiert, wenn während der Umschaltzeit eine neue Season startet – bleibt der vorherige Snapshot trotzdem abrufbar?  
6. „Winners“-Banner (2 Wochen, per‑User ausblendbar)  
   * Ist das „ausblenden“ nur für die einzelne Season‑Benachrichtigung oder dauerhaft?  
   * Soll die Ausblendung zurückgesetzt werden, wenn die nächste Season endet?  
7. Neues Spiel spielen – Deck/Spieler‑Zuweisung  
   * Muss jedes Areal zwingend ein Deck zugewiesen bekommen, bevor das Spiel starten kann?  
   * Dürfen Spielername und Deckname unabhängig sein (z. B. Player ohne Deck)?  
8. Statistiken (aktuelle Season)  
   * Für „Anzahl der gespielten Spiele insgesamt“ bei Spielerdaten: meint das gesamt oder nur aktive Season?  
   * „Performance“ ist weiterhin die gleiche Metrik wie bisher? (Wenn ja: kurze Bestätigung reicht.)  
9. Donation‑System (PayPal)  
   * Soll es nur eine einfache externe PayPal‑Link‑Spende geben (Quick‑Link), oder ein integriertes Checkout mit Betragwahl?  
   * Soll die Spendenfunktion nur sichtbar sein, wenn der User eingeloggt ist, oder generell?

