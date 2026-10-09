import { useMemo } from "react";
import type { ClientMessage, Color, GameState, RoomView } from "engine";
import { getLegalMoves } from "engine";
import { Board } from "../components/Board.tsx";
import { Dice } from "../components/Dice.tsx";

const COLOR_LABEL: Record<Color, string> = {
  red: "Vermelho",
  green: "Verde",
  yellow: "Amarelo",
  blue: "Azul",
};

function seatName(room: RoomView | undefined, color: Color): string {
  const seat = room?.seats.find((s) => s.color === color);
  if (seat?.occupant.kind === "human") return seat.occupant.name;
  if (seat?.occupant.kind === "bot") return `Bot (${COLOR_LABEL[color]})`;
  return COLOR_LABEL[color];
}

export function Game({
  game,
  room,
  mySeat,
  send,
}: {
  game: GameState;
  room: RoomView | undefined;
  mySeat: Color | undefined;
  send: (message: ClientMessage) => void;
}) {
  const isMyTurn = game.turnColor === mySeat && game.status === "playing";
  const legalMoves = useMemo(
    () =>
      isMyTurn && game.pendingDice !== undefined ? getLegalMoves(game) : [],
    [game, isMyTurn],
  );
  const canRoll = isMyTurn && game.pendingDice === undefined;

  return (
    <div className="screen game">
      <div className="status-bar">
        <span className={`turn-indicator turn-${game.turnColor}`}>
          Vez de {seatName(room, game.turnColor)}
          {isMyTurn && " (você)"}
        </span>
        <Dice
          value={game.pendingDice}
          canRoll={canRoll}
          onRoll={() => send({ type: "roll" })}
        />
      </div>

      <Board
        game={game}
        legalMoves={legalMoves}
        onMovePiece={(pieceIndex) => send({ type: "move", pieceIndex })}
      />

      {game.status === "finished" && game.winner && (
        <div className="winner-overlay">
          <p>{seatName(room, game.winner)} venceu!</p>
          <button
            onClick={() => {
              localStorage.removeItem("ludo_last_room");
              window.location.href = window.location.pathname;
            }}
          >
            Voltar ao início
          </button>
        </div>
      )}
    </div>
  );
}
