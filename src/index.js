#!/usr/bin/env node
"use strict";

const fs = require("fs");
const { randomUUID } = require("crypto");
const { loadConfig, saveConfig, getConfigPath, ensureDirs } = require("./config");
const { activate } = require("./activate");
const { startAgent } = require("./agent");

async function main() {
  ensureDirs();

  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error("[agent] " + err.message);
    console.error("[agent] Create config at: " + getConfigPath());
    process.exit(1);
  }

  if (!config.backendUrl) {
    console.error("[agent] Config missing backendUrl");
    process.exit(1);
  }

  if (!config.agentId) {
    config.agentId = randomUUID();
    saveConfig(config);
  }

  try {
    if (!config.franchiseId) {
      if (!config.activationCode) {
        console.error(
          "[agent] Not activated and no activationCode in config",
        );
        process.exit(1);
      }
      await activate(config);
    } else {
      startAgent(config);
    }
  } catch (err) {
    const msg =
      err.response?.data?.message || err.response?.data?.error || err.message;
    console.error("[agent] Fatal: " + msg);
    process.exit(1);
  }

  fs.watchFile(getConfigPath(), { interval: 1000 }, () => {
    console.log("[agent] Config changed — restarting...");
    process.exit(100);
  });
}

main();
