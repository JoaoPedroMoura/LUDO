import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";
import type { ClientMessage, Color } from "engine";
import { InMemoryGameRepository } from "./repository.ts";
import { Room } from "./room.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../../client/dist");
const port = Number(process.env.PORT ?? 3000);

const app = express();
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use(express.static(clientDist));
app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const repository = new InMemoryGameRepository();
const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  let code: string;
  do {
    code = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (rooms.has(code));
  return code;
}

function send(socket: WebSocket, message: unknown): void {
  socket.send(JSON.stringify(message));
}

interface Connection {
  roomId: string;
  color: Color;
}
const connections = new Map<WebSocket, Connection>();

function handleMessage(socket: WebSocket, message: ClientMessage): void {
  switch (message.type) {
    case "create_room": {
      const roomId = generateRoomCode();
      const room = new Room(roomId, repository);
      rooms.set(roomId, room);
      const color = room.firstEmptySeat()!;
      const token = room.addHuman(color, message.name);
      room.attachSocket(color, socket);
      connections.set(socket, { roomId, color });
      send(socket, { type: "joined", token, seat: color, room: room.view() });
      return;
    }
    case "join_room": {
      const room = rooms.get(message.roomId);
      if (!room) {
        send(socket, { type: "error", message: "sala não encontrada" });
        return;
      }
      const color = room.firstEmptySeat();
      if (!color) {
        send(socket, { type: "error", message: "sala cheia" });
        return;
      }
      const token = room.addHuman(color, message.name);
      room.attachSocket(color, socket);
      connections.set(socket, { roomId: room.id, color });
      send(socket, { type: "joined", token, seat: color, room: room.view() });
      room.broadcast({ type: "room_update", room: room.view() });
      return;
    }
    case "reconnect": {
      const room = rooms.get(message.roomId);
      if (!room) {
        send(socket, { type: "error", message: "sala não encontrada" });
        return;
      }
      const color = room.findByToken(message.token);
      if (!color) {
        send(socket, { type: "error", message: "token inválido" });
        return;
      }
      room.attachSocket(color, socket);
      connections.set(socket, { roomId: room.id, color });
      send(socket, {
        type: "joined",
        token: message.token,
        seat: color,
        room: room.view(),
      });
      if (room.state)
        send(socket, { type: "game_update", state: room.state, events: [] });
      room.advance();
      room.broadcast({ type: "room_update", room: room.view() });
      return;
    }
    case "start_solo": {
      const roomId = generateRoomCode();
      const room = new Room(roomId, repository);
      rooms.set(roomId, room);
      const color = room.startSolo(message.name, message.levels);
      const seat = room.seats[color];
      const token = seat.kind === "human" ? seat.token : "";
      room.attachSocket(color, socket);
      connections.set(socket, { roomId, color });
      send(socket, { type: "joined", token, seat: color, room: room.view() });
      if (room.state)
        send(socket, { type: "game_update", state: room.state, events: [] });
      return;
    }
  }

  const existing = connections.get(socket);
  if (!existing) {
    send(socket, { type: "error", message: "entre em uma sala primeiro" });
    return;
  }
  const room = rooms.get(existing.roomId);
  if (!room) return;

  switch (message.type) {
    case "set_seat":
      if (existing.color !== room.hostSeat) {
        send(socket, {
          type: "error",
          message: "só o anfitrião pode mudar assentos",
        });
        return;
      }
      room.setSeat(message.color, message.occupant, message.level);
      room.broadcast({ type: "room_update", room: room.view() });
      return;
    case "update_config":
      if (existing.color !== room.hostSeat) {
        send(socket, {
          type: "error",
          message: "só o anfitrião pode mudar a configuração",
        });
        return;
      }
      room.updateConfig(message.config);
      room.broadcast({ type: "room_update", room: room.view() });
      return;
    case "start_game":
      if (existing.color !== room.hostSeat) {
        send(socket, {
          type: "error",
          message: "só o anfitrião pode iniciar a partida",
        });
        return;
      }
      room.start();
      room.broadcast({ type: "room_update", room: room.view() });
      return;
    case "roll":
      room.handlePlayerAction(existing.color, { type: "roll" });
      return;
    case "move":
      room.handlePlayerAction(existing.color, {
        type: "move",
        pieceIndex: message.pieceIndex,
      });
      return;
    case "leave_room":
      room.disconnect(existing.color);
      connections.delete(socket);
      return;
  }
}

wss.on("connection", (socket) => {
  socket.on("message", (raw) => {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(socket, { type: "error", message: "mensagem inválida" });
      return;
    }
    handleMessage(socket, message);
  });

  socket.on("close", () => {
    const conn = connections.get(socket);
    if (!conn) return;
    connections.delete(socket);
    rooms.get(conn.roomId)?.disconnect(conn.color);
  });
});

server.listen(port, () => console.log(`servidor em http://localhost:${port}`));
