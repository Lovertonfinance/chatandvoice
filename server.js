const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let clients = new Set();

wss.on("connection", (ws, req) => {
  // Force low-latency, disable Nagle's algorithm
  if (req.socket) {
    req.socket.setNoDelay(true);
  }

  clients.add(ws);
  broadcastUserCount();

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      switch (data.type) {
        case "ping":
          ws.send(
            JSON.stringify({
              type: "pong",
              clientTime: data.time,
              serverTime: Date.now(),
            })
          );
          break;

        case "message":
          broadcast(
            {
              type: "message",
              username: data.username,
              message: data.message,
            },
            null
          );
          break;

        case "sound":
          broadcast(
            {
              type: "sound",
              drum: data.drum,
              username: data.username,
              serverTime: Date.now(),
            },
            ws
          );
          break;

        case "piano":
          broadcast(
            {
              type: "piano",
              note: data.note,
              username: data.username,
              serverTime: Date.now(),
            },
            ws
          );
          break;

        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (e) {
      console.log(`Error parsing message: ${e}`);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    broadcastUserCount();
  });
});

function broadcast(data, exclude = null) {
  try {
    const json = JSON.stringify(data);
    for (let client of clients) {
      if (client.readyState === WebSocket.OPEN && client !== exclude) {
        client.send(json);
      }
    }
  } catch (e) {
    console.log(`Error broadcasting message: ${e}`);
  }
}

function broadcastUserCount() {
  broadcast({ type: "userCount", count: clients.size });
}

app.get("/", (req, res) => {
  res.send("WebSocket Server Running");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
