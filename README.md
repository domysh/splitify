<h1><img align="left" src="frontend/public/logo.png" width="170" /><br />Splitify 💰</h1>

Splitify ti aiuterà a dividere correttamente le spese tra i tuoi amici.

<br/><br />

## Tecnologie utilizzate
- Frontend: React (Vite), TypeScript, Mantine UI, TanStack Query, Zustand, Socket.IO
- Backend: Node.js, Express, Postgres (prisma), typia, Socket.IO
- Containerization: Docker, 

## Come iniziare
```bash
# Copia il compose.yml su una cartella su tuo server
docker compose pull && docker compose up -d
# verrà creata la cartella "./db" contenente i dati di postgres
# Questo comando aggiornerà l'immagine da ghcr.io all'ultima versione
```

## Variabili d'ambiente (.env)
Prima di eseguire il deploy, specialmente se intendi utilizzare un dominio, è raccomandato creare un file `.env` accanto al tuo `compose.yml` e passare le variabili al container tramite docker.

Ecco le variabili supportate che puoi impostare:
- `RP_ID`: Il dominio del server (es. `splitify.miodominio.com`). Il default è `localhost`. È **necessario** impostarlo in produzione affinché funzionino le Passkey.
- `RP_ORIGIN`: L'origine completa per WebAuthn (es. `https://splitify.miodominio.com`). Il default è `http://localhost:8080`.
- `ADMIN_EMAIL`: **Obbligatorio**. L'email dell'account admin predefinito che viene creato al primo avvio. Se non definita (e non ci sono admin), il backend si rifiuterà di avviarsi.
- `SMTP_HOST`: **Obbligatorio**. L'host del server SMTP per l'invio delle email di OTP (es. `smtp.gmail.com`). Se non definito, il backend si rifiuterà di avviarsi.
- `SMTP_PORT`: La porta del server SMTP (es. `465` o `587`). Default `587`.
- `SMTP_USER`: L'username per l'autenticazione SMTP.
- `SMTP_PASS`: La password per l'autenticazione SMTP.
- `SMTP_FROM`: L'indirizzo mittente (es. `Splitify <noreply@miodominio.com>`). Se non definito, utilizza di default il valore di `SMTP_USER`.
- `DATABASE_URL`: Stringa di connessione a Postgres. Il default in produzione è `postgresql://splitify:splitify_password@postgres:5432/splitify?schema=public`.
- `PORT`: Porta su cui il server backend ascolta internamente. Default `8080`.
- `CORS_ALLOW`: Impostare a `true` o `1` per abilitare CORS.
- `TRUST_PROXY`: Impostare a `true` (o a un IP/subnet specifico come `loopback` o `192.168.1.0/24`) se il server è dietro a un reverse proxy (es. Nginx, Cloudflare, Traefik). Questo permette al backend di leggere correttamente l'indirizzo IP reale del client.
- `DEBUG`: Impostare a `true` o `1` per avviare il container in modalità sviluppo.

## Buildare da source-code
```bash
docker compose -f ./compose.build.yml up -d --build
```

Visita `http://localhost:80` nel tuo browser per utilizzare l'applicazione.
