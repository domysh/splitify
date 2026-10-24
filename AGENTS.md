# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## Overview

Splitify is a self-hosted expense-splitting app: a Bun/Express + Prisma/Postgres API (`backend/`) and a React + Vite SPA (`frontend/`), shipped as a single Docker image where the backend serves the built frontend from `dist/frontend`.

The UI and most user-facing strings (including API error messages and log output) are in **Italian** — keep new strings consistent with that.

## Commands

Bun is the package manager and runtime for both packages (`bun.lock`, no npm lockfiles).

### Backend (`cd backend`)
```bash
bun run dev        # concurrently: tsc --watch + prisma db push + hot-reload dist/index.js (DEBUG=1)
bun run build      # bunx tsc  -> emits ./dist
bun run typecheck  # tsc --watch, no emit target beyond dist
bun run test       # bunx tsc && bun test dist/tests
bunx prisma generate   # after editing prisma/schema.prisma
bunx prisma db push    # schema is applied with db push, not migrations
```

`bun run prepare` (ts-patch install) must have run once — the build relies on the patched `tsc` for the `typia` transform. Running `bun test` against the `.ts` sources directly will not work; tests must be compiled first, hence `bun test dist/tests`.

Single test file / single case:
```bash
cd backend && bunx tsc && bun test dist/tests/board.test.js -t "should create a new board"
```

Tests run against a **real Postgres** (`DATABASE_URL`) and call `clearDatabase()` in `beforeAll`/`afterAll`, so never point them at a database you care about. Start one with `docker compose -f compose.db.yml up -d` from the repo root. `tests/setup.ts` mocks `utils/mailer` and `utils/socket`, so no SMTP or socket server is needed.

### Frontend (`cd frontend`)
```bash
bun run dev      # vite dev server on :5173
bun run build    # tsc && vite build
bun run lint     # eslint, --max-warnings 0
bun run analyze  # bundle analysis
```

There is no eslint/prettier setup for the backend — only the frontend is linted.

### Local dev topology

The Vite dev server does **not** proxy the API. `frontend/src/utils/net.ts` hardcodes `DEV_IP_BACKEND = "127.0.0.1:8080"` and, under `import.meta.env.DEV`, points both fetch and Socket.IO at it directly. So the backend must run with `DEBUG=1` (which enables `cors: "*"`, disables static-file serving, and makes `RP_ORIGIN` default to `http://localhost:5173` for WebAuthn).

Required env for the backend to boot at all: `DATABASE_URL`, `SMTP_HOST`, and `ADMIN_EMAIL` (only when no admin row exists yet) — `index.ts` calls `process.exit(1)` otherwise. The full list of deployment variables is in `README.md`.

## Architecture

### Request pipeline (backend)

`index.ts` (http server + Socket.IO + admin bootstrap) → `app.ts` (cors/body-parser, `/api` router, SPA fallback when not DEBUG) → `routes/index.ts`.

`routes/index.ts` applies `requestUserInfo` to **every** API request: it decodes the bearer token and populates `req.user`/`req.token` without rejecting anonymous callers. Rejection happens later, per route, via `authenticate` (must be logged in) or `hasRole(Role)` (admin always passes any role check). Many read routes deliberately have neither, so that public boards work for anonymous visitors.

Route handlers are wrapped in `voidReturn as r` from `utils/index.ts` — a no-op cast that keeps async handlers assignable to Express 5's stricter handler types. Follow that pattern when adding routes.

### Validation (typia)

All body validation lives in `middleware/validation.ts` as `validateRequest(typia.createAssert<T>())` factories over the interfaces in `models/types.ts`. Adding an endpoint means adding an interface there plus a validator here; typia constraints (`tags.Format<"email">`, `tags.MaxLength`, patterns) are the real input contract. These asserts are generated at compile time by the ts-patch/typia transform, so they only exist in `dist`.

### Board authorization

`getAuthenticatedBoard(boardId, userId?, permRequired?)` in `backend/utils/index.ts` is the single authorization gate for every board-scoped operation, and it returns `[board, permission]` or `[null, null]`. It resolves, in order: admin → creator (OWNER) → explicit `BoardAccess` row → `isPublic` (VIEWER). Controllers respond **404 "Board not found"** for insufficient permission — that leak-avoidance is intentional; don't "fix" it to 403.

### Money

Amounts are integer **cents** stored in `Float` columns (`Product.price`, `Member.paid`, `Transaction.amount`). The frontend converts at the edges only: `formatPrice` divides by 100, `toIntValue` (big.js) multiplies by 100 and rounds. Never introduce fractional values into these fields — the split algorithm relies on integer arithmetic.

### Split computation is client-side

`calculateDebits` (`frontend/src/utils/index.ts`) and the settlement/paylist algorithm (`frontend/src/workers/paylistWorker.ts`, run in a Web Worker) compute who owes what from the board snapshot. The backend stores products, categories, members and transactions but never computes balances beyond incrementing/decrementing `Member.paid` in `createTransactionHelper`. Products with no categories are split across all members; otherwise across members sharing a category. Remainder cents are distributed deterministically by sorted member id.

### Realtime invalidation

Socket.IO is mounted at path `/sock`, **websocket transport only**. On connect, the handshake token authenticates the socket and joins `user:<id>` (and `admins` for admins); clients join `board:<id>` rooms via the `joinBoard` ack event, which re-checks access through `getAuthenticatedBoard`.

The server never pushes data — only cache-invalidation hints. `emitBoardUpdate`/`emitUserUpdate`/`emitAdminUpdate`/`broadCastUpdate` send `{ queryKeys: string[] }`; the client (`App.tsx`) splits each key on `/` and calls `queryClient.invalidateQueries`. So a server key `boards/<id>` maps to the TanStack key `['boards', '<id>']` — when adding queries, keep the key shape in `frontend/src/utils/queries.ts` aligned with what the controllers emit. Anonymous sockets get a random Italian animal nickname used for the board presence list.

### Auth

Three entangled mechanisms, all in `controllers/auth.ts` + `utils/auth.ts`:

- **OTP email login** — `POST /api/login` sends a code (3 min validity, 60 s resend cooldown, 5 attempts) via `utils/mailer`; `POST /api/verify-otp` returns a JWT. Whether an unknown email may register depends on `RegistrationMode` (PRIVATE / TOKEN / OPEN) persisted in the `Env` table.
- **Passkeys (WebAuthn)** via `@simplewebauthn` — depends on `RP_ID`/`RP_ORIGIN` matching the origin the browser is actually on, which is the usual cause of local failures.
- **Sessions** — every token has a `sid` backed by a `UserSession` row (device/browser/IP/geo enriched at creation, expired rows pruned). Revoking a session invalidates the token; `keepLogin` picks a 1-year vs 3-hour duration.

The JWT signing secret is not an env var: `getAppSecret()` lazily generates it and stores it in the `Env` table (cached in-process), so it survives restarts but is per-database.

Frontend auth state is the zustand `useAuth` store persisted to `localStorage` under `auth-storage`; `App.tsx` waits for `isHydrated` before connecting the socket. A 401 from any request triggers logout in `elaborateJsonRequest`.

### Frontend structure

`@/` aliases `frontend/src` (and `@public/`). Routing is `react-router` inside a Mantine `AppShell`, with nearly every page `lazy()`-loaded. `LoginProvider` wraps the authenticated routes; `/board/:board_id` sits deliberately outside it so public boards render for anonymous users. `usePermissions(board)` in `utils/hooks.ts` is the client-side mirror of the backend permission ladder — use it for UI gating rather than re-deriving roles.

Mantine is dark-mode only (`defaultColorScheme='dark'`), and `@tabler/icons-react` imports are rewritten per-icon by a Vite plugin, so import icons by name from the package root.

## Notes

- `backend/app/`, `backend/venv/`, `backend/tests/__pycache__`, `.pytest_cache` are leftovers from a previous Python/FastAPI implementation. They are dead; do not extend or reference them.
- `prisma.config.ts` declares a `migrations` path, but the deploy and dev scripts both use `prisma db push --accept-data-loss`; there is no migration history to maintain.
- Docker image builds the frontend first, then copies `frontend/dist` into the backend's `dist/frontend`; the published image is `ghcr.io/domysh/splitify`, built by `.github/workflows/docker-image.yml` on release.
