import type { Action, ActionResult, Color, GameEvent, GameState } from "./types.ts";
import { HOME_STEPS } from "./board.ts";
import { COLORS, isOnRing, isSafeRingIndex, ringIndex } from "./board.ts";

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function canMove(state: GameState, color: Color, currentSteps: number, dice: number): boolean {
  if (currentSteps === HOME_STEPS) return false;
  if (currentSteps === 0) return dice === 6;
  const target = currentSteps + dice;
  if (target > HOME_STEPS) return false;
  if (state.config.blockRule && isOnRing(target) && isBlockedByOpponent(state, color, ringIndex(color, target))) {
    return false;
  }
  return true;
}

function isBlockedByOpponent(state: GameState, color: Color, targetRingIndex: number): boolean {
  for (const other of COLORS) {
    if (other === color) continue;
    const count = state.pieces[other].filter((s) => isOnRing(s) && ringIndex(other, s) === targetRingIndex).length;
    if (count >= 2) return true;
  }
  return false;
}

/** Peças que podem se mover com o dado pendente. Vazio se não houver dado ou nenhuma jogada válida. */
export function getLegalMoves(state: GameState): number[] {
  const dice = state.pendingDice;
  if (dice === undefined || state.status === "finished") return [];
  const steps = state.pieces[state.turnColor];
  const legal: number[] = [];
  for (let i = 0; i < steps.length; i++) {
    if (canMove(state, state.turnColor, steps[i]!, dice)) legal.push(i);
  }
  return legal;
}

function resolveTurnEnd(state: GameState, rolledSix: boolean, events: GameEvent[]): GameState {
  const next = cloneState(state);
  next.pendingDice = undefined;
  const streak = rolledSix ? state.sixStreak + 1 : 0;
  const forfeit = rolledSix && state.config.threeSixesForfeit && streak >= 3;
  if (rolledSix && !forfeit) {
    next.sixStreak = streak;
    events.push({ type: "EXTRA_TURN", color: state.turnColor });
    return next;
  }
  const idx = state.players.indexOf(state.turnColor);
  next.turnColor = state.players[(idx + 1) % state.players.length]!;
  next.sixStreak = 0;
  events.push({ type: "TURN_PASSED", from: state.turnColor, to: next.turnColor });
  return next;
}

function applyRoll(state: GameState, color: Color, rng: () => number): ActionResult {
  if (state.pendingDice !== undefined) {
    return { ok: false, reason: "já há um dado pendente, jogue uma peça antes de rolar de novo" };
  }
  const value = 1 + Math.floor(rng() * 6);
  const events: GameEvent[] = [{ type: "DICE_ROLLED", color, value }];
  const rolled = cloneState(state);
  rolled.pendingDice = value;

  if (getLegalMoves(rolled).length === 0) {
    events.push({ type: "NO_LEGAL_MOVE", color });
    return { ok: true, state: resolveTurnEnd(rolled, value === 6, events), events };
  }
  return { ok: true, state: rolled, events };
}

function applyMove(state: GameState, color: Color, pieceIndex: number): ActionResult {
  if (state.pendingDice === undefined) {
    return { ok: false, reason: "role o dado antes de mover uma peça" };
  }
  if (pieceIndex < 0 || pieceIndex >= state.config.numPieces) {
    return { ok: false, reason: "peça inexistente" };
  }
  if (!getLegalMoves(state).includes(pieceIndex)) {
    return { ok: false, reason: "jogada inválida para essa peça com esse dado" };
  }

  const dice = state.pendingDice;
  const from = state.pieces[color][pieceIndex]!;
  const to = from === 0 ? 1 : from + dice;
  const next = cloneState(state);
  next.pieces[color][pieceIndex] = to;

  const events: GameEvent[] = [];
  if (from === 0) events.push({ type: "PIECE_LEFT_BASE", color, pieceIndex });
  events.push({ type: "PIECE_MOVED", color, pieceIndex, from, to });

  if (isOnRing(to)) {
    const landedRing = ringIndex(color, to);
    if (!isSafeRingIndex(landedRing)) {
      for (const other of COLORS) {
        if (other === color) continue;
        const otherSteps = next.pieces[other];
        for (let i = 0; i < otherSteps.length; i++) {
          if (isOnRing(otherSteps[i]!) && ringIndex(other, otherSteps[i]!) === landedRing) {
            otherSteps[i] = 0;
            events.push({ type: "PIECE_CAPTURED", color: other, pieceIndex: i, by: color });
          }
        }
      }
    }
  }

  if (to === HOME_STEPS) {
    events.push({ type: "PIECE_FINISHED", color, pieceIndex });
    if (next.pieces[color].every((s) => s === HOME_STEPS)) {
      next.status = "finished";
      next.winner = color;
      next.pendingDice = undefined;
      events.push({ type: "GAME_WON", color });
      return { ok: true, state: next, events };
    }
  }

  return { ok: true, state: resolveTurnEnd(next, dice === 6, events), events };
}

export function reduce(state: GameState, action: Action, rng: () => number = Math.random): ActionResult {
  if (state.status === "finished") {
    return { ok: false, reason: "a partida já terminou" };
  }
  if (action.by !== state.turnColor) {
    return { ok: false, reason: `não é a vez de ${action.by}` };
  }
  if (action.type === "ROLL") {
    return applyRoll(state, action.by, rng);
  }
  return applyMove(state, action.by, action.pieceIndex);
}
