import type { Color, GameState } from "./types.ts";
import { getLegalMoves } from "./rules.ts";
import {
  COLORS,
  HOME_STEPS,
  isOnRing,
  isSafeRingIndex,
  ringIndex,
} from "./board.ts";

export type AiLevel = "easy" | "medium" | "hard";

function isInDanger(state: GameState, color: Color, steps: number): boolean {
  if (!isOnRing(steps)) return false;
  const idx = ringIndex(color, steps);
  if (isSafeRingIndex(idx)) return false;
  for (const other of COLORS) {
    if (other === color) continue;
    for (const oSteps of state.pieces[other]) {
      if (!isOnRing(oSteps)) continue;
      const dist = (idx - ringIndex(other, oSteps) + 52) % 52;
      if (dist >= 1 && dist <= 6) return true;
    }
  }
  return false;
}

/** Prioriza, nessa ordem: finalizar, capturar, sair de perigo (só no "hard"), casa segura, peão mais atrasado. */
function scoreMove(
  state: GameState,
  pieceIndex: number,
  considerDanger: boolean,
): number {
  const color = state.turnColor;
  const dice = state.pendingDice!;
  const from = state.pieces[color][pieceIndex]!;
  const to = from === 0 ? 1 : from + dice;
  let score = 0;

  if (to === HOME_STEPS) score += 1000;

  if (isOnRing(to)) {
    const idx = ringIndex(color, to);
    if (isSafeRingIndex(idx)) {
      score += 30;
    } else {
      for (const other of COLORS) {
        if (other === color) continue;
        for (const oSteps of state.pieces[other]) {
          if (isOnRing(oSteps) && ringIndex(other, oSteps) === idx)
            score += 500;
        }
      }
    }
  } else if (to < HOME_STEPS) {
    score += 50; // entrou na reta final, não pode mais ser capturado
  }

  if (from === 0) score += 20; // tirar peão da base

  if (considerDanger) {
    const wasInDanger = isInDanger(state, color, from);
    const willBeInDanger = isInDanger(state, color, to);
    if (wasInDanger && !willBeInDanger) score += 40;
    else if (!wasInDanger && willBeInDanger) score -= 25;
  }

  score -= from * 0.05; // empate: prioriza avançar o peão mais atrasado
  return score;
}

/** Escolhe o índice do peão a mover. Mesma interface de um humano (reduce com ação MOVE). */
export function chooseAiMove(
  state: GameState,
  level: AiLevel,
  rng: () => number = Math.random,
): number {
  const legal = getLegalMoves(state);
  if (legal.length === 0) {
    throw new Error("chooseAiMove chamado sem jogada legal disponível");
  }
  if (level === "easy") {
    return legal[Math.floor(rng() * legal.length)]!;
  }

  const considerDanger = level === "hard";
  let best = legal[0]!;
  let bestScore = -Infinity;
  for (const pieceIndex of legal) {
    const score = scoreMove(state, pieceIndex, considerDanger);
    if (score > bestScore) {
      bestScore = score;
      best = pieceIndex;
    }
  }
  return best;
}
