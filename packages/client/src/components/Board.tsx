import type { GameState } from "engine";
import { COLORS } from "engine";
import {
  BOARD_SIZE,
  colorForBaseCell,
  colorForHomeCell,
  isRingCell,
  isSafeCell,
  pieceCell,
} from "../board-geometry.ts";

function cellClassName(row: number, col: number): string {
  const base = colorForBaseCell(row, col);
  if (base) return `cell base base-${base}`;
  const home = colorForHomeCell(row, col);
  if (home) return `cell home home-${home}`;
  if (row === 7 && col === 7) return "cell center";
  if (isRingCell(row, col))
    return `cell ring${isSafeCell(row, col) ? " safe" : ""}`;
  return "cell deco";
}

export function Board({
  game,
  legalMoves,
  onMovePiece,
}: {
  game: GameState;
  legalMoves: number[];
  onMovePiece: (pieceIndex: number) => void;
}) {
  const cells = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      cells.push(
        <div
          key={`${row}-${col}`}
          className={cellClassName(row, col)}
          style={{ gridRow: row + 1, gridColumn: col + 1 }}
        />,
      );
    }
  }

  const pieces = COLORS.flatMap((color) =>
    game.pieces[color].map((steps, pieceIndex) => {
      const [row, col] = pieceCell(color, pieceIndex, steps);
      const movable =
        color === game.turnColor && legalMoves.includes(pieceIndex);
      return (
        <button
          key={`${color}-${pieceIndex}`}
          className={`piece piece-${color}${movable ? " movable" : ""}`}
          style={{ gridRow: row + 1, gridColumn: col + 1 }}
          disabled={!movable}
          onClick={() => onMovePiece(pieceIndex)}
          aria-label={`peão ${pieceIndex + 1} de ${color}`}
        >
          {pieceIndex + 1}
        </button>
      );
    }),
  );

  return (
    <div className="board">
      {cells}
      {pieces}
    </div>
  );
}
