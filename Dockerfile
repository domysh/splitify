FROM --platform=$BUILDPLATFORM oven/bun AS frontend
ENV NODE_ENV=production
WORKDIR /build
COPY ./frontend/package.json ./frontend/bun.lock /build/
RUN bun install
COPY ./frontend/ .
RUN bun run build

#Building main conteiner
FROM --platform=$TARGETARCH oven/bun AS base

WORKDIR /execute
COPY ./backend/package.json ./backend/bun.lock /execute/
RUN bun install
COPY ./backend/ /execute/
RUN bun run build
COPY --from=frontend /build/dist/ ./dist/frontend/

CMD ["bun", "run", "start"]
