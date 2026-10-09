import type { Color, GameConfig, GameState } from "./types.ts";
import { DEFAULT_CONFIG } from "./types.ts";
import { COLORS } from "./board.ts";

export function createGame(
  players: Color[],
  config: Partial<GameConfig> = {},
): GameState {
  if (players.length < 2 || players.length > 4) {
    throw new Error("Ludo precisa de 2 a 4 jogadores");
  }
  const fullConfig: GameConfig = { ...DEFAULT_CONFIG, ...config };
  const pieces = {} as Record<Color, number[]>;
  for (const color of COLORS) {
    pieces[color] = Array.from({ length: fullConfig.numPieces }, () => 0);
  }
  return {
    config: fullConfig,
    players,
    pieces,
    turnColor: players[0]!,
    sixStreak: 0,
    pendingDice: undefined,
    status: "playing",
    winner: undefined,
  };
}
