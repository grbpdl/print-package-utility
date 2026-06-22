#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const { version } = require(path.join(ROOT, "package.json"));

const TARGETS = [
  {
    id: "win-x64",
    npmScript: "build:win",
    binaryName: "syanko-agent.exe",
    distBinary: "syanko-agent.exe",
    archive: "syanko-agent-win-x64-v" + version + ".zip",
  },
  {
    id: "linux-x64",
    npmScript: "build:linux",
    binaryName: "syanko-agent",
    distBinary: "syanko-agent",
    archive: "syanko-agent-linux-x64-v" + version + ".tar.gz",
  },
  {
    id: "macos-x64",
    npmScript: "build:mac",
    binaryName: "syanko-agent",
    distBinary: "syanko-agent-macos",
    archive: "syanko-agent-macos-x64-v" + version + ".tar.gz",
  },
];

const INSTALL = `Syanko Print Agent v${version}
========================

1. Copy the agent binary to an install folder:
   - Windows: C:\\Program Files\\SyankoAgent\\
   - Linux:   /opt/syanko-agent/
   - macOS:   /Applications/SyankoAgent/

2. Create config.json (see config.example.json):
   - Windows: C:\\ProgramData\\Syanko\\config.json
   - Linux:   ~/.config/syanko/config.json
   - macOS:   ~/Library/Application Support/Syanko/config.json

3. First run activates the agent and removes activationCode from config.

4. Install as a system service for auto-start (recommended for production).

Dev override:
  SYANKO_CONFIG=/path/to/config.json ./syanko-agent
`;

function run(cmd) {
  console.log(">", cmd);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

function stageRelease(target) {
  const outDir = path.join(ROOT, "dist", "release", "syanko-agent-" + target.id);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const binarySrc = path.join(ROOT, "dist", target.distBinary);
  if (!fs.existsSync(binarySrc)) {
    throw new Error("Missing binary: " + binarySrc);
  }

  fs.copyFileSync(binarySrc, path.join(outDir, target.binaryName));
  fs.chmodSync(path.join(outDir, target.binaryName), 0o755);

  fs.writeFileSync(path.join(outDir, "version.txt"), version + "\n");
  fs.copyFileSync(
    path.join(ROOT, "config.example.json"),
    path.join(outDir, "config.example.json"),
  );
  fs.writeFileSync(path.join(outDir, "INSTALL.txt"), INSTALL);

  return outDir;
}

function archiveDir(target, stagedDir) {
  const releaseDir = path.join(ROOT, "dist", "release");
  const archivePath = path.join(releaseDir, target.archive);

  if (target.archive.endsWith(".zip")) {
    run(
      `cd "${stagedDir}" && zip -r "${archivePath}" .`,
    );
  } else {
    run(
      `tar -czf "${archivePath}" -C "${stagedDir}" .`,
    );
  }

  const stat = fs.statSync(archivePath);
  console.log(
    "  packaged " +
      target.archive +
      " (" +
      Math.round(stat.size / 1024 / 1024) +
      " MB)",
  );
}

function main() {
  const only = process.argv[2];
  const targets = only
    ? TARGETS.filter((t) => t.id === only || t.id.startsWith(only))
    : TARGETS;

  if (!targets.length) {
    console.error("Unknown target:", only);
    console.error("Available:", TARGETS.map((t) => t.id).join(", "));
    process.exit(1);
  }

  fs.mkdirSync(path.join(ROOT, "dist", "release"), { recursive: true });

  console.log("Building Syanko Agent v" + version + "\n");

  for (const target of targets) {
    console.log("\n── " + target.id + " ──");
    run("npm run " + target.npmScript);
    const staged = stageRelease(target);
    archiveDir(target, staged);
  }

  console.log("\nDone. Archives in dist/release/");
}

main();
