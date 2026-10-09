import type { AiLevel } from "./ai.ts";
import { chooseAiMove } from "./ai.ts";
import { createGame } from "./state.ts";
import { getLegalMoves, reduce } from "./rules.ts";
import type { Color, GameConfig } from "./types.ts";

export interface SimulateOptions {
  players: Array<{ color: Color; level: AiLevel }>;
  config?: Partial<GameConfig>;
  rng?: () => number;
  /** Teto de ações (ROLL+MOVE) pra garantir que o teste não trave se o motor tiver um bug de loop infinito. */
  maxActions?: number;
}

export interface SimulateResult {
  winner: Color | undefined;
  actions: number;
  finished: boolean;
}

/** Roda uma partida inteira bot x bot usando a mesma interface de ação (reduce) que um humano usaria. */
export function simulateGame(options: SimulateOptions): SimulateResult {
  const levelByColor = new Map(options.players.map((p) => [p.color, p.level]));
  const rng = options.rng ?? Math.random;
  const maxActions = options.maxActions ?? 10_000;

  let state = createGame(
    options.players.map((p) => p.color),
    options.config,
  );
  let actions = 0;

  while (state.status === "playing" && actions < maxActions) {
    const color = state.turnColor;
    const rolled = reduce(state, { type: "ROLL", by: color }, rng);
    actions++;
    if (!rolled.ok)
      throw new Error(`ROLL inválido durante simulação: ${rolled.reason}`);
    state = rolled.state;
    if (state.status === "finished") break;

    const legal = getLegalMoves(state);
    if (legal.length === 0) continue; // reduce já passou a vez (ou deu turno extra) internamente

    const pieceIndex = chooseAiMove(state, levelByColor.get(color)!, rng);
    const moved = reduce(state, { type: "MOVE", by: color, pieceIndex }, rng);
    actions++;
    if (!moved.ok)
      throw new Error(`MOVE inválido durante simulação: ${moved.reason}`);
    state = moved.state;
  }

  return {
    winner: state.winner,
    actions,
    finished: state.status === "finished",
  };
}
