#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const syncScript = path.join(repoRoot, "scripts", "sync.js");

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "codex-config-test-"));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

const tempDir = makeTempDir();
const sourcePath = path.join(tempDir, "repo", "config.toml");
const targetPath = path.join(tempDir, "home", "config.toml");

writeText(
  sourcePath,
  [
    'model = "gpt-5.2-codex"',
    "",
    "[features]",
    "shell_snapshot = true",
    "",
  ].join("\n"),
);

writeText(
  targetPath,
  [
    'model = "old"',
    "",
    "[projects.\"/Users/develar/projects/idea-1\"]",
    'trust_level = "trusted"',
    "",
    "[projects.\"/Users/develar/projects/idea\"]",
    'trust_level = "trusted"',
    "",
    "[mcp_servers.jetbrains]",
    'url = "http://127.0.0.1:64344/stream"',
    "",
  ].join("\n"),
);

const result = spawnSync(process.execPath, [syncScript], {
  env: {
    ...process.env,
    CODEX_CONFIG_SOURCE: sourcePath,
    CODEX_CONFIG_TARGET: targetPath,
  },
  stdio: "inherit",
});

assert.strictEqual(result.status, 0, "sync script should exit cleanly");

const synced = readText(targetPath);

assert.ok(
  synced.includes('model = "gpt-5.2-codex"'),
  "synced config should include repo settings",
);
assert.ok(
  synced.includes("[features]\nshell_snapshot = true"),
  "synced config should include repo blocks",
);
assert.ok(
  synced.includes('[projects."/Users/develar/projects/idea-1"]'),
  "synced config should preserve project blocks",
);
assert.ok(
  synced.includes('[projects."/Users/develar/projects/idea"]'),
  "synced config should preserve all project blocks",
);

console.log("sync.test.js passed");

const strictDir = makeTempDir();
const strictSourcePath = path.join(strictDir, "repo", "config.toml");
const strictTargetPath = path.join(strictDir, "home", "config.toml");

writeText(
  strictSourcePath,
  [
    'model = "gpt-5.2-codex"',
    "",
    'api_key = "shh"',
    "",
  ].join("\n"),
);

writeText(strictTargetPath, 'model = "keep"\\n');

const strictResult = spawnSync(process.execPath, [syncScript], {
  env: {
    ...process.env,
    CODEX_CONFIG_SOURCE: strictSourcePath,
    CODEX_CONFIG_TARGET: strictTargetPath,
  },
  stdio: "inherit",
});

assert.strictEqual(
  strictResult.status,
  2,
  "sync script should fail in strict mode on sensitive keys",
);

const strictTargetText = readText(strictTargetPath);
assert.strictEqual(
  strictTargetText,
  'model = "keep"\\n',
  "target config should remain unchanged on strict failure",
);

console.log("sync strict-mode test passed");
