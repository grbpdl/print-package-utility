#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const binary = path.join(ROOT, "dist", "syanko-agent");

if (!fs.existsSync(binary)) {
  console.error("Build first: npm run build:linux");
  process.exit(1);
}

function getConfigPath() {
  return path.join(os.homedir(), ".config", "syanko", "config.json");
}

async function main() {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);
  fs.mkdirSync(configDir, { recursive: true });

  const prior = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, "utf8")
    : null;

  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        backendUrl: "http://127.0.0.1:15174",
        activationCode: "TEST-1234",
      },
      null,
      2,
    ),
  );

  const mock = spawn("node", [path.join(ROOT, "scripts/mock-backend.js")], {
    env: { ...process.env, MOCK_PORT: "15174" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await new Promise((r) => setTimeout(r, 800));

  console.log("Running binary with config:", configPath);
  const agent = spawn(binary, [], { stdio: ["ignore", "pipe", "pipe"] });

  let out = "";
  agent.stdout.on("data", (d) => {
    const s = d.toString();
    out += s;
    process.stdout.write(s);
  });
  agent.stderr.on("data", (d) => {
    const s = d.toString();
    out += s;
    process.stderr.write(s);
  });

  await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 10_000);
    const check = setInterval(() => {
      if (out.includes("Ready — listening for print jobs")) {
        clearTimeout(timer);
        clearInterval(check);
        resolve(true);
      }
    }, 200);
  });

  agent.kill("SIGTERM");
  mock.kill("SIGTERM");

  const saved = JSON.parse(fs.readFileSync(configPath, "utf8"));
  console.log("\nActivated config:");
  console.log(JSON.stringify(saved, null, 2));

  if (!saved.franchiseId || saved.activationCode) {
    console.error("\nBinary E2E failed");
    process.exit(1);
  }

  if (prior !== null) {
    fs.writeFileSync(configPath, prior);
  } else {
    fs.unlinkSync(configPath);
  }

  console.log("\nBinary E2E passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
