import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/state.ts";
import { reduce, getLegalMoves } from "../src/rules.ts";
import type { GameState } from "../src/types.ts";

/** rng que sempre devolve o mesmo valor de dado (1-6). */
function fixedDice(value: number): () => number {
  return () => (value - 1) / 6;
}

function rollAndMove(state: GameState, color: GameState["turnColor"], dice: number, pieceIndex: number) {
  const rolled = reduce(state, { type: "ROLL", by: color }, fixedDice(dice));
  assert.equal(rolled.ok, true);
  return reduce(rolled.ok ? rolled.state : state, { type: "MOVE", by: color, pieceIndex });
}

test("peão só sai da base tirando 6", () => {
  const state = createGame(["red", "blue"]);
  const rolledFour = reduce(state, { type: "ROLL", by: "red" }, fixedDice(4));
  assert.equal(rolledFour.ok, true);
  if (!rolledFour.ok) return;
  assert.deepEqual(getLegalMoves(rolledFour.state), []);
  assert.equal(rolledFour.state.turnColor, "blue", "sem jogada válida, a vez passa");

  const state2 = createGame(["red", "blue"]);
  const rolledSix = reduce(state2, { type: "ROLL", by: "red" }, fixedDice(6));
  assert.equal(rolledSix.ok, true);
  if (!rolledSix.ok) return;
  assert.deepEqual(getLegalMoves(rolledSix.state), [0, 1, 2, 3]);
});

test("tirar 6 dá direito a jogar de novo", () => {
  const state = createGame(["red", "blue"]);
  const result = rollAndMove(state, "red", 6, 0);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.state.turnColor, "red");
  assert.equal(result.state.pieces.red[0], 1);
  assert.ok(result.events.some((e) => e.type === "EXTRA_TURN"));
});

test("sem seis, a vez passa para o próximo jogador", () => {
  const afterExtra = rollAndMove(createGame(["red", "blue"]), "red", 6, 0);
  assert.equal(afterExtra.ok, true);
  if (!afterExtra.ok) return;
  const result = rollAndMove(afterExtra.state, "red", 3, 0);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.state.turnColor, "blue");
});

test("captura peão adversário fora de casa segura", () => {
  const state = createGame(["red", "blue"]);
  state.pieces.red[0] = 6; // red no ring 5 (não é casa segura)
  state.pieces.blue[0] = 18; // um passo de cair no mesmo ring 5
  state.turnColor = "blue";

  const result = rollAndMove(state, "blue", 1, 0);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.state.pieces.blue[0], 19);
  assert.equal(result.state.pieces.red[0], 0, "red foi capturado e voltou pra base");
  assert.ok(result.events.some((e) => e.type === "PIECE_CAPTURED"));
});

test("casa segura não permite captura", () => {
  const state = createGame(["red", "blue"]);
  state.pieces.red[0] = 1; // red na sua própria casa de saída (segura)
  state.pieces.blue[0] = 13; // um passo de cair no ring 0 (casa de saída do red)
  state.turnColor = "blue";

  const result = rollAndMove(state, "blue", 1, 0);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.state.pieces.blue[0], 14);
  assert.equal(result.state.pieces.red[0], 1, "red fica parado na casa segura, não é capturado");
});

test("reta final: precisa cair exatamente no centro (passo 57)", () => {
  const state = createGame(["red", "blue"]);
  state.pieces.red[0] = 55;

  const rolledTooFar = reduce(state, { type: "ROLL", by: "red" }, fixedDice(4));
  assert.equal(rolledTooFar.ok, true);
  if (!rolledTooFar.ok) return;
  assert.deepEqual(getLegalMoves(rolledTooFar.state), [], "4 passaria do centro (55+4=59), inválido");

  const result = rollAndMove(state, "red", 2, 0);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.state.pieces.red[0], 57);
  assert.ok(result.events.some((e) => e.type === "PIECE_FINISHED"));
});

test("vitória ao levar todos os peões ao centro", () => {
  const state = createGame(["red", "blue"], { numPieces: 1 });
  state.pieces.red[0] = 55;

  const result = rollAndMove(state, "red", 2, 0);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.state.status, "finished");
  assert.equal(result.state.winner, "red");
  assert.ok(result.events.some((e) => e.type === "GAME_WON"));

  const afterWin = reduce(result.state, { type: "ROLL", by: "blue" });
  assert.equal(afterWin.ok, false, "não dá pra jogar depois do jogo terminar");
});

test("jogadas inválidas são rejeitadas", () => {
  const state = createGame(["red", "blue"]);

  assert.equal(reduce(state, { type: "ROLL", by: "blue" }).ok, false, "não é a vez de blue");
  assert.equal(reduce(state, { type: "MOVE", by: "red", pieceIndex: 0 }).ok, false, "precisa rolar antes de mover");

  const rolled = reduce(state, { type: "ROLL", by: "red" }, fixedDice(3));
  assert.equal(rolled.ok, true);
  if (!rolled.ok) return;
  assert.equal(
    reduce(rolled.state, { type: "MOVE", by: "red", pieceIndex: 0 }).ok,
    false,
    "peão na base não pode mover com dado 3",
  );
  assert.equal(
    reduce(rolled.state, { type: "MOVE", by: "red", pieceIndex: 99 }).ok,
    false,
    "índice de peça inexistente",
  );
});

test("3 seis seguidos perde a vez quando a regra opcional está ativa", () => {
  const state = createGame(["red", "blue"], { threeSixesForfeit: true });

  const m1 = rollAndMove(state, "red", 6, 0);
  assert.equal(m1.ok, true);
  if (!m1.ok) return;
  assert.equal(m1.state.turnColor, "red");

  const m2 = rollAndMove(m1.state, "red", 6, 1);
  assert.equal(m2.ok, true);
  if (!m2.ok) return;
  assert.equal(m2.state.turnColor, "red");

  const m3 = rollAndMove(m2.state, "red", 6, 2);
  assert.equal(m3.ok, true);
  if (!m3.ok) return;
  assert.equal(m3.state.turnColor, "blue", "terceiro 6 seguido perde a vez");
});
