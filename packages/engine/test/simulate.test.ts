import { test } from "node:test";
import assert from "node:assert/strict";
import { simulateGame } from "../src/simulate.ts";
import type { AiLevel } from "../src/ai.ts";
import type { Color } from "../src/types.ts";

const ALL_COLORS: Color[] = ["red", "green", "yellow", "blue"];
const ALL_LEVELS: AiLevel[] = ["easy", "medium", "hard"];

/** PRNG determinístico (mulberry32) só pra essas 1000 partidas serem reproduzíveis. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("1000 partidas bot x bot sempre terminam, sem travar", () => {
  const GAMES = 1000;
  let maxActions = 0;
  const winnersByLevel: Record<AiLevel, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  };

  for (let i = 0; i < GAMES; i++) {
    const rng = mulberry32(i + 1);
    const numPlayers = 2 + Math.floor(rng() * 3); // 2-4
    const colors = ALL_COLORS.slice(0, numPlayers);
    const players = colors.map((color) => ({
      color,
      level: ALL_LEVELS[Math.floor(rng() * ALL_LEVELS.length)]!,
    }));

    const result = simulateGame({ players, rng, maxActions: 5000 });

    assert.equal(
      result.finished,
      true,
      `partida ${i} não terminou em 5000 ações (travou?)`,
    );
    assert.ok(result.winner, `partida ${i} terminou sem vencedor`);
    maxActions = Math.max(maxActions, result.actions);

    const winnerLevel = players.find((p) => p.color === result.winner)!.level;
    winnersByLevel[winnerLevel]++;
  }

  assert.ok(
    maxActions < 5000,
    "nenhuma partida deveria chegar perto do teto de ações",
  );
});
