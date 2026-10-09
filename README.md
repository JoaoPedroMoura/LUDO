# Ludo

Jogo de Ludo multiplayer no navegador (solo vs. bots ou PvP até 4 jogadores em sala). Decisões de stack e arquitetura em [docs/DECISOES.md](docs/DECISOES.md).

## Rodando localmente

Requer Node 24+ (usa type-stripping nativo de TypeScript, sem build step para `server`/`engine`).

```bash
npm install
npm run build -w engine   # compila o motor de regras (dist/), necessário antes do client/server
npm run dev:server        # http://localhost:3000 (API + WS)
npm run dev:client        # http://localhost:5173 (Vite dev server, com proxy pro server)
```

Para abrir vários jogadores, acesse a mesma sala em abas/navegadores diferentes.

## Scripts

- `npm run typecheck` — `tsc --noEmit` em todas as packages.
- `npm test` — testes de cada package (`engine` usa `node:test`).
- `npm run lint` — `oxlint` em todo o repo.
- `npm run format` — `prettier --write .`
- `npm run build` — builda `engine` e `client` (o `server` roda `.ts` direto, sem build).

## Docker

```bash
docker compose up --build
```

Sobe o jogo completo (server + client estático) em `http://localhost:3000`.
