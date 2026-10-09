import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import {
  COLORS,
  DEFAULT_ROOM_CONFIG,
  chooseAiMove,
  createGame,
  getLegalMoves,
  reduce,
} from "engine";
import type {
  AiLevel,
  Color,
  GameState,
  RoomConfig,
  RoomView,
  SeatOccupant,
  ServerMessage,
} from "engine";
import type { GameRepository } from "./repository.ts";

interface HumanSeat {
  kind: "human";
  name: string;
  token: string;
  connected: boolean;
  socket: WebSocket | undefined;
}
interface BotSeat {
  kind: "bot";
  level: AiLevel;
}
interface EmptySeat {
  kind: "empty";
}
type Seat = HumanSeat | BotSeat | EmptySeat;

function emptySeats(): Record<Color, Seat> {
  const seats = {} as Record<Color, Seat>;
  for (const color of COLORS) seats[color] = { kind: "empty" };
  return seats;
}

/** Uma sala: lobby + partida. Único dono do GameState; nunca confia em nada vindo do cliente como resultado. */
export class Room {
  readonly id: string;
  hostSeat: Color | undefined;
  seats: Record<Color, Seat> = emptySeats();
  config: RoomConfig;
  status: "lobby" | "playing" | "finished" = "lobby";
  state: GameState | undefined;

  private readonly repository: GameRepository;
  private turnTimer: NodeJS.Timeout | undefined;

  constructor(
    id: string,
    repository: GameRepository,
    config: RoomConfig = DEFAULT_ROOM_CONFIG,
  ) {
    this.id = id;
    this.repository = repository;
    this.config = config;
  }

  // --- assentos / lobby ---

  addHuman(color: Color, name: string): string {
    const token = randomUUID();
    this.seats[color] = {
      kind: "human",
      name,
      token,
      connected: true,
      socket: undefined,
    };
    if (!this.hostSeat) this.hostSeat = color;
    this.persist();
    return token;
  }

  firstEmptySeat(): Color | undefined {
    return COLORS.find((c) => this.seats[c].kind === "empty");
  }

  attachSocket(color: Color, socket: WebSocket): void {
    const seat = this.seats[color];
    if (seat.kind === "human") {
      seat.socket = socket;
      seat.connected = true;
    }
  }

  findByToken(token: string): Color | undefined {
    return COLORS.find((c) => {
      const seat = this.seats[c];
      return seat.kind === "human" && seat.token === token;
    });
  }

  disconnect(color: Color): void {
    const seat = this.seats[color];
    if (seat.kind === "human") {
      seat.connected = false;
      seat.socket = undefined;
    }
    this.persist();
    this.advance();
  }

  setSeat(
    color: Color,
    occupant: "bot" | "empty",
    level: AiLevel = "medium",
  ): void {
    if (this.status !== "lobby") return;
    this.seats[color] =
      occupant === "bot" ? { kind: "bot", level } : { kind: "empty" };
    this.persist();
  }

  updateConfig(partial: Partial<RoomConfig>): void {
    if (this.status !== "lobby") return;
    this.config = { ...this.config, ...partial };
    this.persist();
  }

  // --- partida ---

  start(): void {
    const players = COLORS.filter((c) => this.seats[c].kind !== "empty");
    if (players.length < 2) return;
    this.state = createGame(players, this.config.rules);
    this.status = "playing";
    this.persist();
    this.advance();
  }

  startSolo(
    humanName: string,
    levels: [AiLevel, AiLevel, AiLevel] = ["medium", "medium", "medium"],
  ): Color {
    const [humanColor, ...bots] = COLORS;
    this.addHuman(humanColor!, humanName);
    bots.forEach((color, i) => {
      this.seats[color] = { kind: "bot", level: levels[i]! };
    });
    this.start();
    return humanColor!;
  }

  private controllingLevel(color: Color): AiLevel | undefined {
    const seat = this.seats[color];
    if (seat.kind === "bot") return seat.level;
    if (
      seat.kind === "human" &&
      !seat.connected &&
      this.config.fillEmptyWithBots
    )
      return "medium";
    return undefined;
  }

  private performAutoAction(
    color: Color,
    level: AiLevel,
  ): ServerMessage | undefined {
    if (!this.state) return undefined;
    if (this.state.pendingDice === undefined) {
      const result = reduce(this.state, { type: "ROLL", by: color });
      if (!result.ok) return undefined;
      this.state = result.state;
      return { type: "game_update", state: this.state, events: result.events };
    }
    const legal = getLegalMoves(this.state);
    if (legal.length === 0) return undefined;
    const pieceIndex = chooseAiMove(this.state, level);
    const result = reduce(this.state, { type: "MOVE", by: color, pieceIndex });
    if (!result.ok) return undefined;
    this.state = result.state;
    return { type: "game_update", state: this.state, events: result.events };
  }

  /** Faz bots (e humanos desconectados com fallback de IA) jogarem, e arma o timeout de turno. */
  advance(): void {
    if (this.turnTimer) clearTimeout(this.turnTimer);
    if (!this.state || this.status !== "playing") return;

    let guard = 0;
    while (this.state.status === "playing" && guard++ < 200) {
      const color = this.state.turnColor;
      const level = this.controllingLevel(color);
      if (!level) break;
      const message = this.performAutoAction(color, level);
      if (!message) break;
      this.broadcast(message);
    }

    if (this.state.status === "finished") {
      this.status = "finished";
      this.persist();
      return;
    }

    const color = this.state.turnColor;
    if (!this.controllingLevel(color)) {
      this.turnTimer = setTimeout(() => {
        const message = this.performAutoAction(color, "easy");
        if (message) this.broadcast(message);
        this.advance();
      }, this.config.turnTimeoutMs);
    }
    this.persist();
  }

  handlePlayerAction(
    color: Color,
    action: { type: "roll" } | { type: "move"; pieceIndex: number },
  ): void {
    if (!this.state) return;
    const result =
      action.type === "roll"
        ? reduce(this.state, { type: "ROLL", by: color })
        : reduce(this.state, {
            type: "MOVE",
            by: color,
            pieceIndex: action.pieceIndex,
          });

    if (!result.ok) {
      this.sendTo(color, { type: "error", message: result.reason });
      return;
    }
    this.state = result.state;
    this.broadcast({
      type: "game_update",
      state: this.state,
      events: result.events,
    });
    this.advance();
  }

  /** Cancela o timer de turno pendente (encerramento da sala / limpeza em testes). */
  stop(): void {
    if (this.turnTimer) clearTimeout(this.turnTimer);
  }

  // --- rede ---

  broadcast(message: ServerMessage): void {
    for (const color of COLORS) this.sendTo(color, message);
  }

  sendTo(color: Color, message: ServerMessage): void {
    const seat = this.seats[color];
    if (
      seat.kind === "human" &&
      seat.socket &&
      seat.socket.readyState === seat.socket.OPEN
    ) {
      seat.socket.send(JSON.stringify(message));
    }
  }

  view(): RoomView {
    return {
      roomId: this.id,
      hostSeat: this.hostSeat ?? "red",
      status: this.status,
      config: this.config,
      seats: COLORS.map((color) => ({
        color,
        occupant: this.seatOccupant(color),
      })),
    };
  }

  private seatOccupant(color: Color): SeatOccupant {
    const seat = this.seats[color];
    if (seat.kind === "human")
      return { kind: "human", name: seat.name, connected: seat.connected };
    if (seat.kind === "bot") return { kind: "bot", level: seat.level };
    return { kind: "empty" };
  }

  private persist(): void {
    void this.repository.save({
      roomId: this.id,
      hostSeat: this.hostSeat ?? "red",
      config: this.config,
      status: this.status,
      seats: {
        red: this.seatOccupant("red"),
        green: this.seatOccupant("green"),
        yellow: this.seatOccupant("yellow"),
        blue: this.seatOccupant("blue"),
      },
      state: this.state,
      updatedAt: Date.now(),
    });
  }
}
