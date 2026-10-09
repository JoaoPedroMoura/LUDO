# Decisões de arquitetura

## Stack escolhida

- **TypeScript em todo o projeto**, monorepo com **npm workspaces** (`packages/engine`, `packages/server`, `packages/client`).
- **`engine`**: biblioteca pura (zero dependências, zero I/O) com o motor de regras do Ludo. Determinística: `(estado, ação) -> novo estado`. Testada com `node:test` (nativo do Node, sem test runner externo).
- **`server`**: Node.js com `express` (HTTP + arquivos estáticos do client) e `ws` (WebSocket para tempo real). Roda o `.ts` diretamente — Node 24 faz _type stripping_ nativo, então não existe passo de build/transpile para o server. É o único dono do RNG e da validação de jogadas: importa `engine` e nunca confia em nada que o cliente mande como resultado.
- **`client`**: React + Vite + TypeScript (scaffold oficial `create-vite`). Consome `engine` para renderizar o tabuleiro e pré-validar jogadas na UI, mas o servidor é quem decide de verdade.
- **Lint**: `oxlint` (zero-config, rápido, cobre as três packages). **Format**: `prettier`. **Types**: `tsc --noEmit` por package (o `oxlint` não é type-aware).
- **Deploy**: um único container Docker. Build multi-stage: compila `engine` (único build real — vira `dist/*.js` consumido por client e server) e `client` (vira estático), depois a imagem final só tem `node_modules` de produção + os `.ts` do server (sem bundler) + o estático do client. `docker-compose.yml` só para rodar local sem instalar Node.

## Alternativas consideradas

| Decisão                                     | Alternativa                                    | Por que não                                                                                                                                                                                                                                                                                 |
| ------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node + `ws` cru                             | Next.js full-stack (API routes)                | Next.js não tem um jeito nativo bom de hospedar um servidor WebSocket de longa duração dentro de API routes/serverless; exigiria "custom server", perdendo a vantagem de usar Next. Como o jogo é 100% client-rendered (sem necessidade de SSR), Vite + server Node próprio é mais simples. |
| `ws` cru + protocolo próprio                | `socket.io`                                    | `socket.io` resolve reconexão/heartbeat de fábrica, mas traz protocolo e client lib próprios, e a lógica de "sala" e "reconectar no assento certo" é específica do jogo e teria que ser escrita de qualquer forma. `ws` + um protocolo JSON tipado fica mais simples e com menos mágica.    |
| Monorepo custom (`ws`/`express`)            | `Colyseus` (framework de game server)          | Resolve salas e sync de estado, mas é uma dependência pesada com seu próprio modelo mental para um jogo de turnos simples (não é um jogo de estado contínuo 60fps). Ganho não compensa a complexidade extra.                                                                                |
| npm workspaces                              | pnpm/Turborepo                                 | Projeto pequeno, 3 packages. `npm` já resolvido (vem com o Node) cobre workspace + scripts; Turborepo seria cache/paralelismo que não faz diferença nesse tamanho.                                                                                                                          |
| Rodar `.ts` direto no Node (type stripping) | Compilar com `tsc`/`tsx`/`ts-node` para server | Node 24 já despe tipos nativamente (sintaxe "erasable" apenas — por isso `verbatimModuleSyntax` e nada de `enum`/parâmetros de construtor). Elimina um passo de build e uma dependência inteira para o server. `tsc --noEmit` continua checando tipos no CI/dev.                            |

## Arquitetura (módulos)

```
packages/
  engine/   <- regras puras: board, state, actions, ai
  server/   <- rooms, protocolo WS, lobby, persistência (interface)
  client/   <- telas, tabuleiro, lobby, conexão WS
```

## Fluxo de mensagens cliente-servidor

```
Cliente                         Servidor (autoritativo)
  |--- CREATE_ROOM / JOIN_ROOM -->|  cria/atualiza Room em memória
  |<-- ROOM_STATE -----------------|  (broadcast para todos na sala)
  |--- START_GAME (host) -------->|  inicializa GameState via engine
  |<-- GAME_STATE ------------------|  (broadcast)
  |--- ROLL_DICE ----------------->|  servidor gera RNG, chama engine.rollDice
  |<-- DICE_ROLLED / GAME_STATE ---|
  |--- MOVE_PIECE {pieceId} ------>|  servidor valida via engine.applyMove
  |<-- GAME_STATE / INVALID_MOVE --|
  |<-- (desconexão) ---------------|  servidor marca assento como "bot" após timeout
  |--- RECONNECT {token} --------->|  servidor devolve o assento se ainda existir
```

Todas as mensagens são tipadas (um union type `ClientMessage` / `ServerMessage` compartilhado dentro de `server`, já que só o server fala WS — o client usa os mesmos tipos importando de `engine`/definindo o protocolo em `server` exportado como tipo).

## Persistência

Estado da partida fica em memória (`Map<roomId, Room>`) atrás de uma interface `GameRepository` (`get`, `save`, `delete`). Implementação inicial `InMemoryGameRepository`; um banco (Postgres, etc.) entra depois implementando a mesma interface — sem tocar no resto do server.
