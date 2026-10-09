import { useConnection } from "./connection.ts";
import { Home } from "./screens/Home.tsx";
import { Lobby } from "./screens/Lobby.tsx";
import { Game } from "./screens/Game.tsx";
import "./App.css";

function App() {
  const { room, game, mySeat, error, send } = useConnection();

  if (!room) return <Home send={send} error={error} />;
  if (room.status === "lobby")
    return <Lobby room={room} mySeat={mySeat} send={send} error={error} />;
  if (game) return <Game game={game} room={room} mySeat={mySeat} send={send} />;
  return <p>Carregando partida...</p>;
}

export default App;
