#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const FAILURES = [];

function fail(msg) {
  FAILURES.push(msg);
  console.error("  FAIL:", msg);
}

function pass(msg) {
  console.log("  OK:", msg);
}

function testModules() {
  console.log("\n[1] Module load");
  try {
    require(path.join(ROOT, "src/config"));
    require(path.join(ROOT, "src/print"));
    require(path.join(ROOT, "src/agent"));
    require(path.join(ROOT, "src/activate"));
    pass("all modules load");
  } catch (err) {
    fail("module load: " + err.message);
  }
}

function testConfigPaths() {
  console.log("\n[2] Config paths");
  const { getConfigPath, getLogDir, getCacheDir } = require(path.join(
    ROOT,
    "src/config",
  ));
  if (!getConfigPath() || !getLogDir() || !getCacheDir()) {
    fail("missing path exports");
    return;
  }
  pass("CONFIG_PATH = " + getConfigPath());
}

function testTcpPrint() {
  console.log("\n[3] TCP print helper");
  const { tcpPrint } = require(path.join(ROOT, "src/print"));
  if (typeof tcpPrint !== "function") {
    fail("tcpPrint is not a function");
    return;
  }
  pass("tcpPrint exported");
}

async function testActivationFlow() {
  console.log("\n[4] Activation flow (mock backend)");

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "syanko-test-"));
  const configPath = path.join(tmpDir, "config.json");
  const port = 15173;

  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        backendUrl: "http://127.0.0.1:" + port,
        activationCode: "TEST-1234",
      },
      null,
      2,
    ),
  );

  const mock = spawn("node", [path.join(ROOT, "scripts/mock-backend.js")], {
    env: { ...process.env, MOCK_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await new Promise((resolve) => setTimeout(resolve, 800));

  const agent = spawn("node", [path.join(ROOT, "src/index.js")], {
    env: { ...process.env, SYANKO_CONFIG: configPath },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let agentOut = "";
  agent.stdout.on("data", (d) => {
    agentOut += d.toString();
  });
  agent.stderr.on("data", (d) => {
    agentOut += d.toString();
  });

  const ready = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 12_000);
    const check = setInterval(() => {
      if (agentOut.includes("Ready — listening for print jobs")) {
        clearTimeout(timer);
        clearInterval(check);
        resolve(true);
      }
      if (agentOut.includes("Fatal:")) {
        clearTimeout(timer);
        clearInterval(check);
        resolve(false);
      }
    }, 200);
  });

  agent.kill("SIGTERM");
  mock.kill("SIGTERM");

  if (!ready) {
    fail("agent did not reach ready state\n" + agentOut);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return;
  }

  const saved = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (!saved.franchiseId || !saved.agentId || saved.activationCode) {
    fail("activated config invalid: " + JSON.stringify(saved));
  } else {
    pass("activation saved franchiseId + agentId, removed activationCode");
  }

  if (!agentOut.includes("Activated")) {
    fail("missing activation log");
  } else {
    pass("activation log present");
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

function testBinaryIfPresent() {
  console.log("\n[5] Built binary (if present)");
  const binary = path.join(ROOT, "dist", "syanko-agent");
  if (!fs.existsSync(binary)) {
    console.log("  SKIP: dist/syanko-agent not built yet");
    return;
  }

  const { getConfigPath, ensureDirs } = require(path.join(ROOT, "src/config"));
  const configPath = getConfigPath();
  ensureDirs();

  const prior = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, "utf8")
    : null;

  fs.writeFileSync(
    configPath,
    JSON.stringify({ backendUrl: "http://127.0.0.1:1" }, null, 2),
  );

  const result = require("child_process").spawnSync(binary, [], {
    encoding: "utf8",
    timeout: 5000,
  });

  if (prior !== null) {
    fs.writeFileSync(configPath, prior);
  } else {
    fs.unlinkSync(configPath);
  }

  const output = (result.stdout || "") + (result.stderr || "");
  if (result.status === 1 && output.includes("Not activated")) {
    pass("binary runs and validates config at " + configPath);
  } else {
    fail(
      "binary unexpected exit " +
        result.status +
        " output=" +
        output.slice(0, 300),
    );
  }
}

async function main() {
  console.log("Syanko Agent — smoke tests");
  testModules();
  testConfigPaths();
  testTcpPrint();
  await testActivationFlow();
  testBinaryIfPresent();

  console.log("");
  if (FAILURES.length) {
    console.error(FAILURES.length + " test(s) failed");
    process.exit(1);
  }
  console.log("All smoke tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
