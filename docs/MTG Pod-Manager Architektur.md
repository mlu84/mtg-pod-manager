# MTG Pod-Manager Architektur 

[**1\. Architektur-Vorschlag	1**](#1.-architektur-vorschlag)

[Begründung:	1](#heading=h.yj35cgo47dq7)

[**2\. Tech-Stack-Vorschlag	2**](#2.-tech-stack-vorschlag)

[**3\. Grobe Ordnerstruktur	3**](#3.-grobe-ordnerstruktur)

Basierend auf den Anforderungen (schnelles MVP, Solo-Projekt, Wartbarkeit, geringe Kosten) schlage ich folgende Architektur und  
Technologien vor.

# 1\. Architektur-Vorschlag {#1.-architektur-vorschlag}

Ich empfehle eine klassische und bewährte "Single-Page-Application (SPA) mit REST-API" Architektur.

* Frontend (Client): Eine eigenständige Angular-Anwendung, die im Browser des Nutzers ausgeführt wird. Sie ist ausschließlich für die Darstellung der Benutzeroberfläche und die Interaktion mit dem Nutzer zuständig. Wenn Daten benötigt oder Aktionen ausgeführt werden (z.B. ein Spiel erfassen), sendet sie eine Anfrage an das Backend.  
* Backend (Server): Ein eigenständiger Node.js-Server, der als zentrale API (Application Programming Interface) dient. Er nimmt Anfragen vom Frontend entgegen, führt die gesamte Geschäftslogik aus (z.B. Performance-Punkte berechnen), kommuniziert mit der Datenbank und sendet die Ergebnisse an das Frontend zurück. Dies ist das "Gehirn" der Anwendung.  
* Datenbank: Eine MariaDB-Datenbank, die ausschließlich mit dem Backend kommuniziert. Das Frontend hat niemals direkten Zugriff auf die Datenbank. Dies ist entscheidend für die Sicherheit und Datenintegrität.  
* Externe Services: Für den Versand von E-Mails (z.B. für die Konto-Aktivierung) wird ein externer, spezialisierter E-Mail-Service angebunden.

**Begründung:**  
Diese Architektur trennt klar zwischen Darstellung (Frontend) und Logik (Backend). Das ist extrem vorteilhaft für die Wartbarkeit: Änderungen an der Benutzeroberfläche beeinflussen die Kernlogik nicht und umgekehrt. Da es ein Solo-Projekt ist, kannst du dich so auf einen Teil der Anwendung konzentrieren, ohne den anderen versehentlich zu beeinträchtigen. Dieser Ansatz ist zudem Standard und sehr gut dokumentiert, was die Entwicklungsgeschwindigkeit erhöht.

# 2\. Tech-Stack-Vorschlag {#2.-tech-stack-vorschlag}

Der von dir vorgeschlagene Tech-Stack ist bereits sehr gut und absolut tauglich. Meine Vorschläge sind lediglich Konkretisierungen, die auf die Projektziele (Geschwindigkeit, Wartbarkeit) einzahlen.

* Frontend: Angular  
  * Entscheidung: Beibehalten.  
  * Begründung: Angular ist ein robustes, "opinioniertes" (meinungsstarkes) Framework. Das bedeutet, es gibt klare Vorgaben für die Projektstruktur und das Vorgehen. Für ein Solo-Projekt ist das ein großer Vorteil, da du weniger Zeit mit Grundsatzentscheidungen verbringst und dich auf die Feature-Entwicklung konzentrieren kannst. Es fördert von Beginn an eine saubere Struktur, was die Wartbarkeit enorm verbessert.  
* Backend: Node.js mit NestJS  
  * Entscheidung: Node.js um das Framework NestJS erweitern.  
  * Begründung: NestJS ist für Node.js das, was Angular für das Frontend ist. Es bringt eine klare, modulare Architektur mit, die der von Angular sehr ähnlich ist (Module, Services, Controller). Das macht den Wechsel zwischen Frontend- und Backend-Entwicklung sehr flüssig und intuitiv. Es beschleunigt die Entwicklung von robusten REST-APIs massiv und ist auf langfristige Wartbarkeit ausgelegt.  
* Datenbank: MariaDB  
  * Entscheidung: Beibehalten.  
  * Begründung: MariaDB ist ein leistungsstarkes, kostenloses Open-Source-Datenbanksystem. Es erfüllt die Anforderung nach geringen laufenden Kosten perfekt und ist mehr als ausreichend für die zu erwartende Datenmenge.  
* ORM: Prisma  
  * Entscheidung: Deinen Vorschlag, Prisma zu nutzen, unterstütze ich ausdrücklich.  
  * Begründung: Prisma ist ein modernes ORM (Object-Relational Mapper), das die Kommunikation zwischen der Node.js-Anwendung und der MariaDB-Datenbank extrem vereinfacht und beschleunigt. Die Features "Type Safety" (verhindert Tippfehler und falsche Datentypen zwischen Code und DB) und "Migrations" (vereinfacht Änderungen am Datenbankschema) sind   riesige Vorteile für die Entwicklungsgeschwindigkeit und Wartbarkeit in einem Solo-Projekt.  
* E-Mail-Service: SendGrid oder Resend  
  * Entscheidung: Einen externen Service nutzen.  
  * Begründung: Das Betreiben eines eigenen E-Mail-Servers ist komplex und fehleranfällig. Services wie SendGrid oder Resend bieten großzügige kostenlose Kontingente (z.B. 100 E-Mails/Tag), die für den Start und Betrieb des MVPs mehr als ausreichen. Das hält die laufenden Kosten bei null und reduziert den Wartungsaufwand drastisch.

# 3\. Grobe Ordnerstruktur {#3.-grobe-ordnerstruktur}

Ich empfehle eine Monorepo-Struktur, bei der Frontend und Backend in einem einzigen Git-Repository liegen. Das vereinfacht die Verwaltung in einem Solo-Projekt.

    1 /mtg-pod-manager/  
    2 ├── /frontend/              \# Das Angular-Projekt  
    3 │   ├── /src/  
    4 │   │   ├── /app/  
    5 │   │   │   ├── /components/  \# Wiederverwendbare UI-Elemente (Buttons, etc.)  
    6 │   │   │   ├── /pages/       \# Einzelne Seiten (Login, Dashboard, ...)  
    7 │   │   │   └── ...  
    8 │   │   └── ...  
    9 │   └── angular.json  
   10 │  
   11 ├── /backend/               \# Das NestJS-Projekt  
   12 │   ├── /prisma/  
   13 │   │   ├── /migrations/  
   14 │   │   └── schema.prisma   \# DIE zentrale Definitionsdatei für deine Datenbank  
   15 │   │  
   16 │   └── /src/  
   17 │       ├── /auth/          \# Alles für Login, Registrierung, E-Mail  
   18 │       ├── /users/         \# User-Management  
   19 │       ├── /groups/        \# Gruppen-Logik, Einladungen  
   20 │       ├── /decks/         \# Deck-Management  
   21 │       ├── /games/         \# Spielerfassung, Punkteberechnung  
   22 │       ├── app.module.ts   \# Hauptmodul des Backends  
   23 │       └── main.ts         \# Startpunkt des Backends  
   24 │  
   25 └── package.json            \# Gemeinsame Konfiguration und Skripte

**Begründung:**  
Diese Struktur trennt die Verantwortlichkeiten klar. Die schema.prisma-Datei im Backend wird zur "Single Source of Truth" für dein Datenmodell. Alle Änderungen an der Datenbankstruktur werden an dieser einen, leicht lesbaren Stelle vorgenommen. Die thematische Aufteilung der Ordner im Backend (/auth, /users etc.) sorgt für hohe Wartbarkeit, da zusammengehörige Logik an einem Ort gebündelt ist.  
