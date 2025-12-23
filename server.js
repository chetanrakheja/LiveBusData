import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getVehiclesCached } from "./lib/vehicles.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8000;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

async function sendFile(res, filePath, contentType) {
  const body = await readFile(filePath);
  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": body.length,
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    if (!req.url || req.method !== "GET") {
      res.writeHead(405);
      res.end();
      return;
    }

    if (req.url === "/vehicles" || req.url === "/api/vehicles") {
      const payload = await getVehiclesCached();
      sendJson(res, 200, payload);
      return;
    }

    if (req.url === "/" || req.url === "/index.html") {
      const filePath = path.join(__dirname, "public", "index.html");
      await sendFile(res, filePath, "text/html; charset=utf-8");
      return;
    }

    if (req.url === "/app.js") {
      const filePath = path.join(__dirname, "public", "app.js");
      await sendFile(res, filePath, "text/javascript; charset=utf-8");
      return;
    }

    if (req.url === "/style.css") {
      const filePath = path.join(__dirname, "public", "style.css");
      await sendFile(res, filePath, "text/css; charset=utf-8");
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`GTFS-RT map server running at http://localhost:${PORT}`);
});
