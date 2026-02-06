# MTG Pod-Manager Current Findings

1. bei der Spielerfassung darf ein Tie auf Rang 6 bei 6 Spielern nicht möglich sein. Das müsste dann ein Tie auf Rang 5 sein.  
2. “Neues Spiel”-Oberfläche: Ändern sich die Lebenspunkte, wird neben den Lebenspunkten temporär (für 3 Sekunden) ein kurzer Zähler etwas kleiner als der Lebenspunktezähler angezeigt, um wieviel sich die Lebenspunkte in den letzten 3 Sekunden geändert haben. Jede Lebenspunkte-Änderung resettet diesen Timer. Sobald die Inputs für drei Sekunden aufgehört haben, verschwindet der Zähler wieder und wird zurückgesetzt. Auf die eigentlichen Änderungen des Lebenspunktezählers hat diese Anzeige keinen Einfluss. sie ist nur informativ.  
3. Statistik Card collapsable Pfeil soll rechtsbündig sein  
4. Statistik zu Deck Types hinzufügen (Aggro, Combo,...)  
   1. Unter Color data wird die Option “Deck Types” hinzugefügt. das chart gibt die anzahl der Decks des jeweiligen Typs als balkendiagramm aus (seasonbezogene Daten)  
5. Deck Edit Modal Löschen Button normalisieren (er ist deutlich zu hoch, Anpassung des Designs an die anderen Löschen Buttons)