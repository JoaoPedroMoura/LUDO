import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClientMessage,
  Color,
  GameEvent,
  GameState,
  RoomView,
  ServerMessage,
} from "engine";

function wsUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

function tokenKey(roomId: string): string {
  return `ludo_token_${roomId}`;
}

export interface ConnectionState {
  room: RoomView | undefined;
  game: GameState | undefined;
  lastEvents: GameEvent[];
  mySeat: Color | undefined;
  error: string | undefined;
  connected: boolean;
  send: (message: ClientMessage) => void;
}

export function useConnection(): ConnectionState {
  const [room, setRoom] = useState<RoomView | undefined>(undefined);
  const [game, setGame] = useState<GameState | undefined>(undefined);
  const [lastEvents, setLastEvents] = useState<GameEvent[]>([]);
  const [mySeat, setMySeat] = useState<Color | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | undefined>(undefined);

  const getSocket = useCallback((): WebSocket => {
    const existing = socketRef.current;
    if (
      existing &&
      existing.readyState !== WebSocket.CLOSED &&
      existing.readyState !== WebSocket.CLOSING
    ) {
      return existing;
    }
    const ws = new WebSocket(wsUrl());
    socketRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      switch (message.type) {
        case "joined":
          setMySeat(message.seat);
          setRoom(message.room);
          localStorage.setItem(tokenKey(message.room.roomId), message.token);
          localStorage.setItem("ludo_last_room", message.room.roomId);
          setError(undefined);
          break;
        case "room_update":
          setRoom(message.room);
          break;
        case "game_update":
          setGame(message.state);
          setLastEvents(message.events);
          break;
        case "error":
          setError(message.message);
          break;
      }
    };
    return ws;
  }, []);

  const send = useCallback(
    (message: ClientMessage) => {
      const ws = getSocket();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      } else {
        ws.addEventListener("open", () => ws.send(JSON.stringify(message)), {
          once: true,
        });
      }
    },
    [getSocket],
  );

  useEffect(() => {
    getSocket();
    const lastRoom = localStorage.getItem("ludo_last_room");
    if (lastRoom) {
      const token = localStorage.getItem(tokenKey(lastRoom));
      if (token) send({ type: "reconnect", roomId: lastRoom, token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { room, game, lastEvents, mySeat, error, connected, send };
}

export function readRoomCodeFromUrl(): string | undefined {
  return new URLSearchParams(window.location.search).get("room") ?? undefined;
}

export function roomShareUrl(roomId: string): string {
  const url = new URL(window.location.href);
  url.search = `?room=${roomId}`;
  return url.toString();
}
