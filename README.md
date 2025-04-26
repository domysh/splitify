<h1><img align="left" src="frontend/public/logo.png" width="170" /><br />Splitify 💰</h1>

Splitify ti aiuterà a dividere correttamente le spese tra i tuoi amici.

<br/>

## Tecnologie utilizzate
- Frontend: React (Vite), TypeScript, Mantine UI, TanStack Query, Zustand, Socket.IO
- Backend: Node.js, Express, MongoDB (mongoose), typia, Socket.IO
- Containerization: Docker, 

## Come iniziare
```bash
# Copia il compose.yml su una cartella su tuo server
docker compose pull && docker compose up -d
# verrà creata la cartella "./db" contenente i dati di mongodb
# Questo comando aggiornerà l'immagine da ghcr.io all'ultima versione
```

Visita `http://localhost:80` nel tuo browser per utilizzare l'applicazione.
