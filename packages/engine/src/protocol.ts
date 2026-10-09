import type { AiLevel } from "./ai.ts";
import type { Color, GameConfig, GameEvent, GameState } from "./types.ts";

export type SeatOccupant =
  | { kind: "empty" }
  | { kind: "bot"; level: AiLevel }
  | { kind: "human"; name: string; connected: boolean };

export interface SeatView {
  color: Color;
  occupant: SeatOccupant;
}

export interface RoomConfig {
  /** Regras do motor configuráveis no lobby (numPieces, blockRule, threeSixesForfeit). */
  rules: Partial<GameConfig>;
  /** Anfitrião liga/desliga preencher vagas vazias e assentos desconectados com IA. */
  fillEmptyWithBots: boolean;
  turnTimeoutMs: number;
}

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  rules: {},
  fillEmptyWithBots: false,
  turnTimeoutMs: 20_000,
};

export type RoomStatus = "lobby" | "playing" | "finished";

export interface RoomView {
  roomId: string;
  hostSeat: Color;
  seats: SeatView[];
  config: RoomConfig;
  status: RoomStatus;
}

export type ClientMessage =
  | { type: "create_room"; name: string }
  | { type: "join_room"; roomId: string; name: string }
  | { type: "reconnect"; roomId: string; token: string }
  | { type: "start_solo"; name: string; levels?: [AiLevel, AiLevel, AiLevel] }
  | {
      type: "set_seat";
      color: Color;
      occupant: "bot" | "empty";
      level?: AiLevel;
    }
  | { type: "update_config"; config: Partial<RoomConfig> }
  | { type: "start_game" }
  | { type: "roll" }
  | { type: "move"; pieceIndex: number }
  | { type: "leave_room" };

export type ServerMessage =
  | { type: "joined"; token: string; seat: Color; room: RoomView }
  | { type: "room_update"; room: RoomView }
  | { type: "game_update"; state: GameState; events: GameEvent[] }
  | { type: "error"; message: string };
