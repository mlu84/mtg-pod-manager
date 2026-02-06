# Anleitung: Frontend und Backend starten

## Projekt-Struktur

Das Projekt ist ein npm-Monorepo mit Workspaces. Die Start-Befehle sind in der root `package.json` definiert.

## Start-Befehle

### Backend starten
```bash
npm run dev:backend
```

### Frontend starten
```bash
npm run dev:frontend
```

## Prompt für KI-Assistenten

```
Starte das Frontend und Backend dieses Projekts.

Das Projekt ist ein npm-Monorepo mit Workspaces. Die Start-Befehle sind in der root package.json definiert:

1. Backend starten:
   npm run dev:backend

2. Frontend starten:
   npm run dev:frontend

Führe beide Befehle parallel im Hintergrund aus (nicht blockierend), damit der Benutzer weiterarbeiten kann.

Wichtig:
- Beide Befehle müssen im Root-Verzeichnis des Projekts ausgeführt werden (dort wo die package.json mit "workspaces" liegt)
- Das Backend ist ein NestJS-Server (läuft standardmäßig auf Port 3000)
- Das Frontend ist eine Angular-App (läuft standardmäßig auf Port 4200)
- Falls Port 4200 belegt ist, läuft das Frontend vermutlich bereits
```

## Alternative (falls Hintergrund-Prozesse nicht unterstützt werden)

```
Starte das Backend mit: npm run dev:backend
Starte das Frontend in einem separaten Terminal mit: npm run dev:frontend

Beide Befehle im Root-Verzeichnis des Projekts ausführen.
```

## Ports

| Service  | Port |
|----------|------|
| Backend  | 3000 |
| Frontend | 4200 |
