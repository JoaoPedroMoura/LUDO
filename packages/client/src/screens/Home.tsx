import { useState } from "react";
import type { ClientMessage } from "engine";
import { readRoomCodeFromUrl } from "../connection.ts";

export function Home({
  send,
  error,
}: {
  send: (message: ClientMessage) => void;
  error: string | undefined;
}) {
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState(readRoomCodeFromUrl() ?? "");

  const canSubmit = name.trim().length > 0;

  return (
    <div className="screen home">
      <h1>Ludo</h1>
      <label className="field">
        Seu nome
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Como vamos te chamar?"
          maxLength={20}
        />
      </label>

      <div className="home-actions">
        <button
          disabled={!canSubmit}
          onClick={() => send({ type: "start_solo", name: name.trim() })}
        >
          Jogar sozinho (vs. bots)
        </button>
        <button
          disabled={!canSubmit}
          onClick={() => send({ type: "create_room", name: name.trim() })}
        >
          Criar sala
        </button>
        <div className="join-row">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Código da sala"
            maxLength={8}
          />
          <button
            disabled={!canSubmit || joinCode.trim().length === 0}
            onClick={() =>
              send({
                type: "join_room",
                roomId: joinCode.trim(),
                name: name.trim(),
              })
            }
          >
            Entrar
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
