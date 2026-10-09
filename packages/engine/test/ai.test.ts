import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/state.ts";
import { chooseAiMove } from "../src/ai.ts";

test("IA difícil prioriza captura sobre um avanço neutro", () => {
  const state = createGame(["red", "blue"]);
  state.pieces.red[0] = 6; // red no ring 5 (não é casa segura)
  state.pieces.blue[0] = 18; // captura red com dado 1
  state.pieces.blue[1] = 5; // avanço neutro, sem captura
  state.turnColor = "blue";
  state.pendingDice = 1;

  assert.equal(chooseAiMove(state, "hard"), 0);
  assert.equal(chooseAiMove(state, "medium"), 0);
});

test("IA difícil prioriza finalizar um peão sobre capturar", () => {
  const state = createGame(["red", "blue"]);
  state.pieces.blue[0] = 55; // termina com dado 2
  state.pieces.red[0] = 7; // ring 6
  state.pieces.blue[1] = 18; // com dado 2 cairia no ring 6 e capturaria red, mas terminar vale mais
  state.turnColor = "blue";
  state.pendingDice = 2;

  assert.equal(chooseAiMove(state, "hard"), 0);
});

test("IA fácil escolhe aleatoriamente entre as jogadas legais", () => {
  const state = createGame(["red", "blue"]);
  state.pieces.blue[0] = 1;
  state.pieces.blue[1] = 1;
  state.turnColor = "blue";
  state.pendingDice = 2;

  assert.equal(
    chooseAiMove(state, "easy", () => 0),
    0,
  );
  assert.equal(
    chooseAiMove(state, "easy", () => 0.99),
    1,
  );
});
