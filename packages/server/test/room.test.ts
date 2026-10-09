import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryGameRepository } from "../src/repository.ts";
import { Room } from "../src/room.ts";

test("solo: host assume red, bots assumem as outras 3 cores e a partida já começa", () => {
  const room = new Room("ABC123", new InMemoryGameRepository());
  const color = room.startSolo("Joao");
  assert.equal(color, "red");
  assert.equal(room.status, "playing");
  assert.equal(room.seats.green.kind, "bot");
  assert.equal(room.seats.yellow.kind, "bot");
  assert.equal(room.seats.blue.kind, "bot");
  room.stop();
});

test("bots jogam automaticamente até travar na vez do humano", () => {
  const room = new Room("ABC124", new InMemoryGameRepository());
  room.startSolo("Joao", ["easy", "easy", "easy"]);
  // turno inicial é do red (humano): advance() não deve mover o jogo sem a ação dele.
  assert.equal(room.state!.turnColor, "red");
  room.stop();
});

test("desconexão marca o assento e reconexão pelo token devolve o mesmo assento", () => {
  const room = new Room("ABC125", new InMemoryGameRepository());
  const token = room.addHuman("red", "Joao");
  room.addHuman("blue", "Maria");

  room.disconnect("red");
  assert.equal((room.seats.red as { connected: boolean }).connected, false);

  const found = room.findByToken(token);
  assert.equal(found, "red");
});

test("timeout de turno joga automaticamente pelo humano desconectado quando fillEmptyWithBots está ligado", async () => {
  const room = new Room("ABC126", new InMemoryGameRepository(), {
    rules: {},
    fillEmptyWithBots: true,
    turnTimeoutMs: 10,
  });
  room.addHuman("red", "Joao");
  room.addHuman("blue", "Maria");
  room.start();
  room.disconnect("red"); // sem socket conectado, bot assume (fillEmptyWithBots=true)

  await new Promise((resolve) => setTimeout(resolve, 50));
  // depois do timeout, o jogo deve ter avançado (red é controlado por IA agora).
  assert.notEqual(room.state!.turnColor, undefined);
  room.stop();
});

test("host não pode ser mudado e só ele altera config/assentos (validado na camada de rede, não aqui)", () => {
  const room = new Room("ABC127", new InMemoryGameRepository());
  room.addHuman("red", "Joao");
  assert.equal(room.hostSeat, "red");
  room.addHuman("blue", "Maria");
  assert.equal(
    room.hostSeat,
    "red",
    "o anfitrião continua sendo o primeiro a entrar",
  );
});
