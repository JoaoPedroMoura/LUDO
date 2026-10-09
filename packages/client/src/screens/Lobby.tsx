import type { AiLevel, ClientMessage, Color, RoomView } from "engine";
import { roomShareUrl } from "../connection.ts";

const COLOR_LABEL: Record<Color, string> = {
  red: "Vermelho",
  green: "Verde",
  yellow: "Amarelo",
  blue: "Azul",
};
const LEVELS: AiLevel[] = ["easy", "medium", "hard"];

export function Lobby({
  room,
  mySeat,
  send,
  error,
}: {
  room: RoomView;
  mySeat: Color | undefined;
  send: (message: ClientMessage) => void;
  error: string | undefined;
}) {
  const isHost = mySeat === room.hostSeat;
  const occupiedCount = room.seats.filter(
    (s) => s.occupant.kind !== "empty",
  ).length;
  const shareUrl = roomShareUrl(room.roomId);

  return (
    <div className="screen lobby">
      <h1>Sala {room.roomId}</h1>
      <p className="share">
        Convide: <code>{shareUrl}</code>
        <button onClick={() => navigator.clipboard.writeText(shareUrl)}>
          Copiar link
        </button>
      </p>

      <ul className="seats">
        {room.seats.map((seat) => (
          <li key={seat.color} className={`seat seat-${seat.color}`}>
            <span className="seat-color">{COLOR_LABEL[seat.color]}</span>
            {seat.color === room.hostSeat && (
              <span className="badge">anfitrião</span>
            )}
            {seat.occupant.kind === "human" && (
              <span>
                {seat.occupant.name}{" "}
                {!seat.occupant.connected && "(desconectado)"}
              </span>
            )}
            {seat.occupant.kind === "bot" && (
              <span>Bot ({seat.occupant.level})</span>
            )}
            {seat.occupant.kind === "empty" && (
              <span className="muted">vazio</span>
            )}

            {isHost &&
              seat.color !== room.hostSeat &&
              seat.occupant.kind !== "human" && (
                <span className="seat-controls">
                  {seat.occupant.kind === "empty" ? (
                    <button
                      onClick={() =>
                        send({
                          type: "set_seat",
                          color: seat.color,
                          occupant: "bot",
                          level: "medium",
                        })
                      }
                    >
                      + Bot
                    </button>
                  ) : (
                    <>
                      <select
                        value={seat.occupant.level}
                        onChange={(e) =>
                          send({
                            type: "set_seat",
                            color: seat.color,
                            occupant: "bot",
                            level: e.target.value as AiLevel,
                          })
                        }
                      >
                        {LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() =>
                          send({
                            type: "set_seat",
                            color: seat.color,
                            occupant: "empty",
                          })
                        }
                      >
                        Esvaziar
                      </button>
                    </>
                  )}
                </span>
              )}
          </li>
        ))}
      </ul>

      {isHost && (
        <div className="host-config">
          <label>
            <input
              type="checkbox"
              checked={room.config.fillEmptyWithBots}
              onChange={(e) =>
                send({
                  type: "update_config",
                  config: { fillEmptyWithBots: e.target.checked },
                })
              }
            />
            Preencher vagas vazias e assentos desconectados com IA
          </label>
          <label>
            <input
              type="checkbox"
              checked={room.config.rules.blockRule ?? false}
              onChange={(e) =>
                send({
                  type: "update_config",
                  config: {
                    rules: {
                      ...room.config.rules,
                      blockRule: e.target.checked,
                    },
                  },
                })
              }
            />
            Bloqueio com 2 peões na mesma casa
          </label>
          <label>
            <input
              type="checkbox"
              checked={room.config.rules.threeSixesForfeit ?? false}
              onChange={(e) =>
                send({
                  type: "update_config",
                  config: {
                    rules: {
                      ...room.config.rules,
                      threeSixesForfeit: e.target.checked,
                    },
                  },
                })
              }
            />
            3 seis seguidos perde a vez
          </label>

          <button
            disabled={occupiedCount < 2}
            onClick={() => send({ type: "start_game" })}
          >
            Iniciar partida
          </button>
        </div>
      )}

      {!isHost && (
        <p className="muted">Esperando o anfitrião iniciar a partida...</p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
