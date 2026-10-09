import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClientMessage,
  Color,
  Emote,
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

export interface EmoteBubble {
  id: number;
  color: Color;
  emoji: Emote;
}

export interface ConnectionState {
  room: RoomView | undefined;
  game: GameState | undefined;
  lastEvents: GameEvent[];
  mySeat: Color | undefined;
  error: string | undefined;
  connected: boolean;
  emotes: EmoteBubble[];
  send: (message: ClientMessage) => void;
}

const ERROR_TIMEOUT_MS = 4000;
const EMOTE_TIMEOUT_MS = 3000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 10000;

export function useConnection(): ConnectionState {
  const [room, setRoom] = useState<RoomView | undefined>(undefined);
  const [game, setGame] = useState<GameState | undefined>(undefined);
  const [lastEvents, setLastEvents] = useState<GameEvent[]>([]);
  const [mySeat, setMySeat] = useState<Color | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [connected, setConnected] = useState(false);
  const [emotes, setEmotes] = useState<EmoteBubble[]>([]);

  const socketRef = useRef<WebSocket | undefined>(undefined);
  const roomIdRef = useRef<string | undefined>(undefined);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const reconnectAttemptRef = useRef(0);
  const emoteIdRef = useRef(0);

  const showError = useCallback((message: string) => {
    setError(message);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(
      () => setError(undefined),
      ERROR_TIMEOUT_MS,
    );
  }, []);

  const connectRef = useRef<() => WebSocket>(() => {
    throw new Error("connect chamado antes de inicializar");
  });

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) return;
    const attempt = reconnectAttemptRef.current;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
    reconnectAttemptRef.current = attempt + 1;
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = undefined;
      const ws = connectRef.current();
      const roomId = roomIdRef.current;
      const token = roomId ? localStorage.getItem(tokenKey(roomId)) : undefined;
      if (roomId && token) {
        const message: ClientMessage = { type: "reconnect", roomId, token };
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
        else
          ws.addEventListener("open", () => ws.send(JSON.stringify(message)), {
            once: true,
          });
      }
    }, delay);
  }, []);

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
    ws.onopen = () => {
      setConnected(true);
      reconnectAttemptRef.current = 0;
    };
    ws.onclose = () => {
      setConnected(false);
      if (roomIdRef.current) scheduleReconnect();
    };
    ws.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      switch (message.type) {
        case "joined":
          setMySeat(message.seat);
          setRoom(message.room);
          roomIdRef.current = message.room.roomId;
          localStorage.setItem(tokenKey(message.room.roomId), message.token);
          localStorage.setItem("ludo_last_room", message.room.roomId);
          setError(undefined);
          break;
        case "room_update":
          setRoom(message.room);
          roomIdRef.current = message.room.roomId;
          break;
        case "game_update":
          setGame(message.state);
          setLastEvents(message.events);
          break;
        case "emote": {
          const id = emoteIdRef.current++;
          setEmotes((prev) => [
            ...prev,
            { id, color: message.color, emoji: message.emoji },
          ]);
          setTimeout(
            () => setEmotes((prev) => prev.filter((e) => e.id !== id)),
            EMOTE_TIMEOUT_MS,
          );
          break;
        }
        case "error":
          showError(message.message);
          break;
      }
    };
    return ws;
  }, [scheduleReconnect, showError]);

  connectRef.current = getSocket;

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
      roomIdRef.current = lastRoom;
      const token = localStorage.getItem(tokenKey(lastRoom));
      if (token) send({ type: "reconnect", roomId: lastRoom, token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { room, game, lastEvents, mySeat, error, connected, emotes, send };
}

export function readRoomCodeFromUrl(): string | undefined {
  return new URLSearchParams(window.location.search).get("room") ?? undefined;
}

export function roomShareUrl(roomId: string): string {
  const url = new URL(window.location.href);
  url.search = `?room=${roomId}`;
  return url.toString();
}
