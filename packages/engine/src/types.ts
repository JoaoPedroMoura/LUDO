export type Color = "red" | "green" | "yellow" | "blue";

export interface GameConfig {
  /** Peões por jogador (padrão 4). */
  numPieces: number;
  /** 2 peões do mesmo dono na mesma casa do anel bloqueiam a passagem de adversários. */
  blockRule: boolean;
  /** Tirar 6 três vezes seguidas perde a vez em vez de jogar de novo. */
  threeSixesForfeit: boolean;
}

export const DEFAULT_CONFIG: GameConfig = {
  numPieces: 4,
  blockRule: false,
  threeSixesForfeit: false,
};

export type Status = "playing" | "finished";

export interface GameState {
  config: GameConfig;
  /** Cores em jogo, na ordem de turno (2-4). */
  players: Color[];
  /** Passos de cada peão: 0 = base, 1-51 = anel comum, 52-56 = reta final, 57 = centro. */
  pieces: Record<Color, number[]>;
  turnColor: Color;
  /** Sequência de 6s tirados pelo jogador da vez (para a regra opcional de 3 seis). */
  sixStreak: number;
  /** Valor tirado no dado ainda não usado para mover, se houver. */
  pendingDice: number | undefined;
  status: Status;
  winner: Color | undefined;
}

export type Action = { type: "ROLL"; by: Color } | { type: "MOVE"; by: Color; pieceIndex: number };

export type GameEvent =
  | { type: "DICE_ROLLED"; color: Color; value: number }
  | { type: "NO_LEGAL_MOVE"; color: Color }
  | { type: "PIECE_LEFT_BASE"; color: Color; pieceIndex: number }
  | { type: "PIECE_MOVED"; color: Color; pieceIndex: number; from: number; to: number }
  | { type: "PIECE_CAPTURED"; color: Color; pieceIndex: number; by: Color }
  | { type: "PIECE_FINISHED"; color: Color; pieceIndex: number }
  | { type: "EXTRA_TURN"; color: Color }
  | { type: "TURN_PASSED"; from: Color; to: Color }
  | { type: "GAME_WON"; color: Color };

export type ActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; reason: string };
