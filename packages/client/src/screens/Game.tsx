import { useEffect, useMemo, useState } from "react";
import type {
  ClientMessage,
  Color,
  Emote,
  GameEvent,
  GameState,
  RoomView,
} from "engine";
import { EMOTES, getLegalMoves } from "engine";
import { Board } from "../components/Board.tsx";
import { Dice } from "../components/Dice.tsx";
import type { EmoteBubble } from "../connection.ts";
import { isMuted, setMuted, sounds } from "../sound.ts";

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
  lastEvents,
  emotes,
  error,
  send,
}: {
  game: GameState;
  room: RoomView | undefined;
  mySeat: Color | undefined;
  lastEvents: GameEvent[];
  emotes: EmoteBubble[];
  error: string | undefined;
  send: (message: ClientMessage) => void;
}) {
  const isMyTurn = game.turnColor === mySeat && game.status === "playing";
  const legalMoves = useMemo(
    () =>
      isMyTurn && game.pendingDice !== undefined ? getLegalMoves(game) : [],
    [game, isMyTurn],
  );
  const canRoll = isMyTurn && game.pendingDice === undefined;
  const [muted, setMutedState] = useState(isMuted());

  useEffect(() => {
    const types = new Set(lastEvents.map((e) => e.type));
    if (types.has("GAME_WON")) sounds.win();
    else if (types.has("PIECE_CAPTURED")) sounds.capture();
    else if (types.has("PIECE_MOVED") || types.has("PIECE_FINISHED"))
      sounds.move();
    else if (types.has("DICE_ROLLED")) sounds.roll();
  }, [lastEvents]);

  return (
    <div className="screen game">
      <div className="status-bar">
        <span className={`turn-indicator turn-${game.turnColor}`}>
          Vez de {seatName(room, game.turnColor)}
          {isMyTurn && " (você)"}
        </span>
        <div className="status-bar-right">
          <button
            className="mute-toggle"
            onClick={() => {
              setMuted(!muted);
              setMutedState(!muted);
            }}
            aria-label={muted ? "ativar som" : "silenciar som"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <Dice
            value={game.pendingDice}
            canRoll={canRoll}
            onRoll={() => send({ type: "roll" })}
          />
        </div>
      </div>

      <Board
        game={game}
        legalMoves={legalMoves}
        onMovePiece={(pieceIndex) => send({ type: "move", pieceIndex })}
      />

      <div className="emote-bar">
        {EMOTES.map((emoji) => (
          <button
            key={emoji}
            onClick={() => send({ type: "emote", emoji })}
            aria-label={`mandar emote ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="emote-feed">
        {emotes.map((e) => (
          <EmoteBubbleView
            key={e.id}
            bubble={e}
            name={seatName(room, e.color)}
          />
        ))}
      </div>

      {error && <p className="error">{error}</p>}

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

function EmoteBubbleView({
  bubble,
  name,
}: {
  bubble: { color: Color; emoji: Emote };
  name: string;
}) {
  return (
    <span className={`emote-bubble emote-${bubble.color}`}>
      {name}: {bubble.emoji}
    </span>
  );
}
