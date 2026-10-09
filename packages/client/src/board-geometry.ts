import { COLORS, HOME_STEPS, isSafeRingIndex, ringIndex } from "engine";
import type { Color } from "engine";

export type Cell = readonly [row: number, col: number];

/** As 52 casas do anel comum, em ordem de ring-index (0-51). Gerado e verificado por script. */
export const RING_CELLS: readonly Cell[] = [
  [6, 1],
  [6, 0],
  [7, 0],
  [8, 0],
  [8, 1],
  [8, 2],
  [8, 3],
  [8, 4],
  [8, 5],
  [9, 6],
  [10, 6],
  [11, 6],
  [12, 6],
  [13, 6],
  [14, 6],
  [14, 7],
  [14, 8],
  [13, 8],
  [12, 8],
  [11, 8],
  [10, 8],
  [9, 8],
  [8, 9],
  [8, 10],
  [8, 11],
  [8, 12],
  [8, 13],
  [8, 14],
  [7, 14],
  [6, 14],
  [6, 13],
  [6, 12],
  [6, 11],
  [6, 10],
  [6, 9],
  [5, 8],
  [4, 8],
  [3, 8],
  [2, 8],
  [1, 8],
  [0, 8],
  [0, 7],
  [0, 6],
  [1, 6],
  [2, 6],
  [3, 6],
  [4, 6],
  [5, 6],
  [6, 5],
  [6, 4],
  [6, 3],
  [6, 2],
];

export const CENTER: Cell = [7, 7];

/** As 5 casas da reta final de cada cor (passos 52-56), em ordem até o centro. */
export const HOME_COLUMNS: Record<Color, readonly Cell[]> = {
  red: [
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
  ],
  green: [
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
  ],
  yellow: [
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
  ],
  blue: [
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
  ],
};

/** Canto superior-esquerdo (linha,coluna) do bloco 6x6 da base de cada cor. */
export const BASE_ORIGIN: Record<Color, Cell> = {
  red: [0, 0],
  green: [9, 0],
  yellow: [9, 9],
  blue: [0, 9],
};

/** Posição relativa dos 4 peões dentro do bloco 6x6 da base. */
const BASE_SLOTS: readonly Cell[] = [
  [1, 1],
  [1, 4],
  [4, 1],
  [4, 4],
];

export function baseSlotCell(color: Color, pieceIndex: number): Cell {
  const [or, oc] = BASE_ORIGIN[color];
  const [dr, dc] = BASE_SLOTS[pieceIndex % BASE_SLOTS.length]!;
  return [or + dr, oc + dc];
}

/** Posição visual de um peão dado seus passos (0=base, 1-51=anel, 52-56=reta final, 57=centro). */
export function pieceCell(
  color: Color,
  pieceIndex: number,
  steps: number,
): Cell {
  if (steps === 0) return baseSlotCell(color, pieceIndex);
  if (steps === HOME_STEPS) return CENTER;
  if (steps > 51) return HOME_COLUMNS[color][steps - 52]!;
  return RING_CELLS[ringIndex(color, steps)]!;
}

export const BOARD_SIZE = 15;

export function colorForBaseCell(row: number, col: number): Color | undefined {
  return COLORS.find((color) => {
    const [or, oc] = BASE_ORIGIN[color];
    return row >= or && row < or + 6 && col >= oc && col < oc + 6;
  });
}

export function colorForHomeCell(row: number, col: number): Color | undefined {
  return COLORS.find((color) =>
    HOME_COLUMNS[color].some(([r, c]) => r === row && c === col),
  );
}

export function isRingCell(row: number, col: number): boolean {
  return RING_CELLS.some(([r, c]) => r === row && c === col);
}

export function isSafeCell(row: number, col: number): boolean {
  const idx = RING_CELLS.findIndex(([r, c]) => r === row && c === col);
  return idx !== -1 && isSafeRingIndex(idx);
}
