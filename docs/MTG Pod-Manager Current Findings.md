# MTG Pod-Manager Current Findings

1. “New Game” darf Icons für Commander Damage ausschließlich dann anzeigen, wenn das Format der Spielgruppe “Commander” ist. Ansonsten sind die Buttons ausgeblendet  
2. “New Game” bei Gruppen, die nicht das Format “Commander” besitzen, startet als default Einstellung mit 2 Spielern, nicht mit 4\.  
3. Donate mit festem Betrag?  
4. Neue Statistik \- Lieblingsfarben eines Spielers (welche Einzelfarben kommen wie oft in den eigenen Decks vor?)  
5. Die Farbsymbole in den farbstatistiken “color combinations (all time)” und “avg performance by color combination” sind aktuell vertikal gestacked. ich hätte gerne, dass sich die symbole zu 50% überlappen, um platz zu sparen. die vertikale anordnung soll gleich bleiben, ebenso wie die shadows.  
6. Die collapsable Pfeile der cards müssen wieder zurück nach oben rechts der card verschoben werden (css wie vor dem refactor)  
7. “group-settings” button öffnet das modal nicht  
8. “add-new” button in der decks card öffnet das modal nicht  
9. “record game” button öffnet das modal nicht  
10. in der “new game” fullscreen ansicht muss das config-panel zwischen den arealen vertikal zentriert werden  
11. in der “new game” fullscreen ansicht, wenn ein spiel beendet wurde, öffnet sich das “record game” modal mit vorausgefüllten parametern nicht  
12. die suchbaren dropdown menüs für die deckauswahl sind im UI kaputt: der x-button aus dem suchfeld ist nicht im input feld sondern dahinter/darunter. der hintergrund der options scheint verschwunden zu sein. der pfeil zum aufklappen/zuklappen des dropdowns ist so hoch wie die liste der options. der scrollbalken bei langen listen scheint nicht angezeigt zu werden

AKTUELL:

1. “Add new deck” modal \- die farbsymbole in der colors dropdown sind riesig und nicht so groß wie die farbicons sein sollten  
2. das Styling der liste der decks in der decks card ist kaputt  
3. das Styling im “Record Game” Modal ist kaputt  
4. die “Cancel” und “Save changes” Buttons im Edit Deck Modal sind zu hoch (angleichen an button standards in der app)  
5. im “group settings” modal wird das group image in originalgröße angezeigt. das muss wieder auf die vorrige größe reduziert werden  
6. “record game” modal mit prefilled data formular ist nicht korrekt gestyled (rank, deck und player formularfelder sind untereinander statt nebeneinander angeordnet)  
7. die collapse buttons in den cards sollen bitte wieder mit dem entsprechenden font awesome icon gestyled sein wie vor dem refactor (chevron-up und chevron-down)

8. options in dropdown menus sind noch nicht korrekt gestyled. diese muessen wie vor dem refactoring gestyled sein (betrifft z.B. den hintergrund der options)
9. "refresh" button im edit deck modal (archidekt link) muss hinter das eingabefeld fuer den link, nicht in eigene zeile
10. "delete" button und "cancel" und "save changes" sind nicht auf einer ebene. bei kleinen aufloesungen kommt der "delete" button in eine reihe weiter unten
11. "add new" button in der decks card muss wieder in die gleiche reihe wie der card titel
12. die edit buttons auf der oberflaeche haben ihr styling verloren aus vor dem refactor. das muss wiederhergestellt werden
13. legende "[player] deck count" entfernen in statistik player data - favorite colors by player
14. statistik color data - avg color combinations (all time) und avg performance by color combinations: chart balken mouseover sollen hinter dem farbkombinations-namen noch die dazugehoerigen icons der enthaltenen farben anzeigen wie in der x-achsen beschriftung. icons bitte horizontal hinter dem namen auflisten (ebenfalls zu 50% ueberlappend)
