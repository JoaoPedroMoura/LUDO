import type {
  Color,
  GameState,
  RoomConfig,
  RoomStatus,
  SeatOccupant,
} from "engine";

export interface RoomSnapshot {
  roomId: string;
  hostSeat: Color;
  config: RoomConfig;
  status: RoomStatus;
  seats: Record<Color, SeatOccupant>;
  state: GameState | undefined;
  updatedAt: number;
}

/** Guarda o estado da partida. Hoje em memória; plugar um banco depois é só implementar essa interface. */
export interface GameRepository {
  get(roomId: string): Promise<RoomSnapshot | undefined>;
  save(snapshot: RoomSnapshot): Promise<void>;
  delete(roomId: string): Promise<void>;
}

export class InMemoryGameRepository implements GameRepository {
  private readonly snapshots = new Map<string, RoomSnapshot>();

  async get(roomId: string): Promise<RoomSnapshot | undefined> {
    return this.snapshots.get(roomId);
  }

  async save(snapshot: RoomSnapshot): Promise<void> {
    this.snapshots.set(snapshot.roomId, snapshot);
  }

  async delete(roomId: string): Promise<void> {
    this.snapshots.delete(roomId);
  }
}
