"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

function getConfigDir() {
  if (process.env.SYANKO_CONFIG_DIR) {
    return process.env.SYANKO_CONFIG_DIR;
  }

  if (process.platform === "win32") {
    return path.join(
      process.env.PROGRAMDATA || "C:\\ProgramData",
      "Syanko",
    );
  }

  if (process.platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "Syanko",
    );
  }

  return path.join(os.homedir(), ".config", "syanko");
}

function getPortableConfigPath() {
  return path.join(path.dirname(process.execPath), "config.json");
}

function getConfigPath() {
  if (process.env.SYANKO_CONFIG) {
    return path.resolve(process.env.SYANKO_CONFIG);
  }

  const osConfig = path.join(getConfigDir(), "config.json");
  if (fs.existsSync(osConfig)) {
    return osConfig;
  }

  const portableConfig = getPortableConfigPath();
  if (fs.existsSync(portableConfig)) {
    return portableConfig;
  }

  return osConfig;
}

function getLogDir() {
  return path.join(path.dirname(getConfigPath()), "logs");
}

function getCacheDir() {
  return path.join(path.dirname(getConfigPath()), "cache");
}

function ensureDirs() {
  const configDir = path.dirname(getConfigPath());
  for (const dir of [configDir, getLogDir(), getCacheDir()]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadConfig() {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    throw new Error("Config not found: " + configPath);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function saveConfig(config) {
  const configPath = getConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

module.exports = {
  getConfigDir,
  getConfigPath,
  getLogDir,
  getCacheDir,
  ensureDirs,
  loadConfig,
  saveConfig,
};
