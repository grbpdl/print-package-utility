#!/usr/bin/env node
"use strict";

const http = require("http");
const { Server } = require("socket.io");

const PORT = Number(process.env.MOCK_PORT || 15173);
const FRANCHISE_ID = "019e8d0b-63fc-7993-88c4-32a17a2586a2";

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/agent/activate") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const data = JSON.parse(body || "{}");
      if (data.activationCode !== "TEST-1234") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Invalid code" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          franchiseId: FRANCHISE_ID,
          printerGroup: "Kitchen",
        }),
      );
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

const io = new Server(server, {
  cors: { origin: "*" },
  transports: ["websocket"],
});

io.on("connection", (socket) => {
  socket.on("join:franchise", (payload) => {
    console.log("[mock] join:franchise", payload);
  });
  socket.on("agent:heartbeat", (payload) => {
    console.log("[mock] heartbeat", payload.agentId);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("[mock] listening on http://127.0.0.1:" + PORT);
});
