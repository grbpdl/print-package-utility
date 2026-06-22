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

  const body = res.data || {};
  const payload =
    body.data != null && typeof body.data === "object" ? body.data : body;
  const franchiseId = payload.franchiseId ?? payload.franchise_id;

  if (!franchiseId) {
    throw new Error(
      "Activation response missing franchiseId: " + JSON.stringify(body),
    );
  }

  const activated = {
    backendUrl: config.backendUrl,
    franchiseId,
    agentId,
    activatedAt: new Date().toISOString(),
  };

  if (payload.franchiseName) {
    activated.franchiseName = payload.franchiseName;
  }

  if (payload.printerGroup ?? payload.printer_group) {
    activated.printerGroup = payload.printerGroup ?? payload.printer_group;
  }

  saveConfig(activated);
  const franchiseLabel = activated.franchiseName || activated.franchiseId;
  console.log("[agent] Activated — franchise " + franchiseLabel);

  startAgent(activated);
}

module.exports = { activate };
