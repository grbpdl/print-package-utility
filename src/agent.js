"use strict";

const { io } = require("socket.io-client");
const { tcpPrint } = require("./print");

const HEARTBEAT_INTERVAL_MS = 30_000;

let heartbeatTimer = null;

function getVersion() {
  try {
    return require("../package.json").version;
  } catch {
    return "unknown";
  }
}

function startAgent(config) {
  const { backendUrl, franchiseId, agentId } = config;
  const version = getVersion();

  console.log("[agent] Connecting to " + backendUrl);

  const socket = io(backendUrl, {
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    console.log("[agent] Connected (" + socket.id + ")");
    socket.emit("join:franchise", { franchiseId, agentId });
    console.log("[agent] Ready — listening for print jobs.");
  });

  socket.on("disconnect", (reason) => {
    console.warn("[agent] Disconnected: " + reason + " — reconnecting...");
  });

  socket.on("connect_error", (err) => {
    console.error("[agent] Connection error: " + err.message);
  });

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }

  heartbeatTimer = setInterval(() => {
    if (socket.connected) {
      socket.emit("agent:heartbeat", { franchiseId, agentId, version });
    }
  }, HEARTBEAT_INTERVAL_MS);

  socket.on("print:job", (job) => {
    const { jobId, printerIp, printerPort, content } = job;
    if (!printerIp || !content) {
      console.error("[agent] job " + jobId + " — missing fields, skipping");
      return;
    }
    const port = printerPort != null ? printerPort : 9100;
    console.log("[agent] job " + jobId + " → " + printerIp + ":" + port);
    tcpPrint(printerIp, port, content, jobId);
  });
}

module.exports = { startAgent };
