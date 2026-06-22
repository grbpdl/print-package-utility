"use strict";

const axios = require("axios");
const os = require("os");
const { randomUUID } = require("crypto");
const { saveConfig } = require("./config");
const { startAgent } = require("./agent");

async function activate(config) {
  const agentId = config.agentId || randomUUID();

  if (!config.agentId) {
    saveConfig({ ...config, agentId });
    config.agentId = agentId;
  }

  const baseUrl = config.backendUrl.replace(/\/$/, "");
  const url = baseUrl + "/api/agent/activate";

  console.log("[agent] Activating with code " + config.activationCode + "...");

  const res = await axios.post(url, {
    activationCode: config.activationCode,
    agentId,
    hostname: os.hostname(),
    platform: process.platform,
  });

  const activated = {
    backendUrl: config.backendUrl,
    franchiseId: res.data.franchiseId,
    agentId,
    activatedAt: new Date().toISOString(),
  };

  if (res.data.printerGroup) {
    activated.printerGroup = res.data.printerGroup;
  }

  saveConfig(activated);
  console.log("[agent] Activated — franchise " + activated.franchiseId);

  startAgent(activated);
}

module.exports = { activate };
