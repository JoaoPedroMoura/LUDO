import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../../client/dist");
const port = Number(process.env.PORT ?? 3000);

const app = express();
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use(express.static(clientDist));
app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));

app.listen(port, () => console.log(`servidor em http://localhost:${port}`));
