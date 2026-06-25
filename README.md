<h1><img align="left" src="frontend/public/logo.png" width="170" /><br />Splitify 💰</h1>

Splitify ti aiuterà a dividere correttamente le spese tra i tuoi amici.

<br/><br />

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

## Variabili d'ambiente (.env)
Prima di eseguire il deploy, specialmente se intendi utilizzare un dominio, è raccomandato creare un file `.env` accanto al tuo `compose.yml` e passare le variabili al container tramite docker.

Ecco le variabili supportate che puoi impostare:
- `RP_ID`: Il dominio del server (es. `splitify.miodominio.com`). Il default è `localhost`. È **necessario** impostarlo in produzione affinché funzionino le Passkey.
- `RP_ORIGIN`: L'origine completa per WebAuthn (es. `https://splitify.miodominio.com`). Il default è `http://localhost:8080`.
- `DEFAULT_PSW`: Password di default per l'account `admin` che viene creato al primo avvio. Se non definita, verrà generata una password casuale (visibile nei log del container).
- `MONGO_URL`: Stringa di connessione a MongoDB. Il default in produzione è `mongodb://mongo:27017/splitify`.
- `PORT`: Porta su cui il server backend ascolta internamente. Default `8080`.
- `CORS_ALLOW`: Impostare a `true` o `1` per abilitare CORS.
- `DEBUG`: Impostare a `true` o `1` per avviare il container in modalità sviluppo.

## Buildare da source-code
```bash
docker compose -f ./compose.build.yml up -d --build
```

Visita `http://localhost:80` nel tuo browser per utilizzare l'applicazione.
