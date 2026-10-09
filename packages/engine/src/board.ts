import type { Color } from "./types.ts";

export const COLORS: readonly Color[] = ["red", "green", "yellow", "blue"];

/** Posição (0-51) do anel comum em que cada cor entra ao tirar a peça da base. */
export const START_OFFSET: Record<Color, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

export const RING_LENGTH = 52;
/** Passos 1-51 = anel comum, 52-56 = reta final, 57 = centro (peça concluída). */
export const HOME_STEPS = 57;
export const HOME_ENTRY_STEP = 51;

const SAFE_SQUARES: ReadonlySet<number> = new Set(
  COLORS.flatMap((color) => [
    START_OFFSET[color],
    (START_OFFSET[color] + 8) % RING_LENGTH,
  ]),
);

/** Índice (0-51) no anel comum ocupado por uma peça com `steps` passos dados por `color`. */
export function ringIndex(color: Color, steps: number): number {
  return (START_OFFSET[color] + steps - 1) % RING_LENGTH;
}

export function isOnRing(steps: number): boolean {
  return steps >= 1 && steps <= HOME_ENTRY_STEP;
}

export function isSafeRingIndex(ringIdx: number): boolean {
  return SAFE_SQUARES.has(ringIdx);
}
