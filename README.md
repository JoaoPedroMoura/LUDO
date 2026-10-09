# Ludo

Jogo de Ludo multiplayer no navegador. Decisões de stack e arquitetura em [docs/DECISOES.md](docs/DECISOES.md).

## Funcionalidades

- **Solo** contra até 3 bots, ou **sala PvP** (código/link) com até 4 jogadores.
- Anfitrião pode preencher vagas vazias com bots e escolher o nível de cada um (fácil/médio/difícil); um humano que cai pode ser substituído por IA (se o anfitrião ligar essa opção) e retomar o assento ao reconectar.
- Regras clássicas (sair da base só com 6, tirar 6 joga de novo, captura fora de casa segura, reta final exata, vitória com os 4 peões) + regras opcionais configuráveis no lobby (bloqueio com 2 peões, 3 seis seguidos perde a vez).
- Servidor autoritativo: dado e validação de jogada sempre no server; o cliente só sugere jogadas válidas pra UI (usando o mesmo motor de regras).
- Reconexão automática ao recarregar a página (token salvo no `localStorage`) e timeout de turno (joga automático por quem não agir a tempo).

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

## Não implementado (etapa de polimento)

Sons e chat/emotes (marcados como opcionais no escopo) ficaram de fora. Erros de jogada inválida e de conexão já aparecem na tela; animação de movimento é um `transition` de grid-position (funciona, mas é simples — dá pra refinar). Sem suite de testes automatizados pro client (foi validado manualmente no navegador, desktop e mobile).
