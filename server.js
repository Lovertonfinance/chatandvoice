const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let clients = new Set();

wss.on("connection", (ws) => {
  clients.add(ws);
  broadcastUserCount();

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    if (data.type === "message") {
      broadcast({ type: "message", username: data.username, message: data.message });
    }

    if (data.type === "ping") {
      ws.send(JSON.stringify({
        type: "pong",
        clientTime: data.time,
        serverTime: performance.now(),
      }));
    }

    if (data.type === "voice") {
      data._relay = true; // mark for relay
      for (const client of clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      }
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    broadcastUserCount();
  });
});

function broadcastUserCount() {
  broadcast({ type: "userCount", count: clients.size });
}

function broadcast(data) {
  const message = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
