#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const sourcePath =
  process.env.CODEX_CONFIG_SOURCE ||
  path.join(repoRoot, "config", "config.toml");
const targetPath =
  process.env.CODEX_CONFIG_TARGET ||
  path.join(os.homedir(), ".codex", "config.toml");
const targetDir = path.dirname(targetPath);

function extractProjectBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (/^\[projects\.".*"\]\s*$/.test(lines[i])) {
      const start = i;
      i += 1;
      while (i < lines.length && !/^\[.*\]\s*$/.test(lines[i])) {
        i += 1;
      }
      const blockLines = lines.slice(start, i);
      while (blockLines.length > 0 && blockLines[blockLines.length - 1].trim() === "") {
        blockLines.pop();
      }
      blocks.push(blockLines.join("\n"));
      i -= 1;
    }
  }

  return blocks;
}

const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /secret/i,
  /(^|[_-])token(s)?($|[_-])/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
  /refresh[_-]?token/i,
  /client[_-]?secret/i,
  /authorization/i,
  /bearer/i,
];

function findSensitiveKeys(text) {
  const lines = text.split(/\r?\n/);
  const hits = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === "" || /^\s*#/.test(line)) {
      continue;
    }

    const match = line.match(/^\s*([^=\s]+|\"[^\"]+\")\s*=\s*.+$/);
    if (!match) {
      continue;
    }

    let key = match[1];
    if (key.startsWith("\"") && key.endsWith("\"")) {
      key = key.slice(1, -1);
    }

    if (SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      hits.push({ line: i + 1, key });
    }
  }

  return hits;
}

if (!fs.existsSync(sourcePath)) {
  console.error(`Missing source file: ${sourcePath}`);
  process.exit(1);
}

const sourceText = fs.readFileSync(sourcePath, "utf8");
const sensitiveKeys = findSensitiveKeys(sourceText);
if (sensitiveKeys.length > 0) {
  console.warn("Warning: possible sensitive keys found in source config:");
  for (const hit of sensitiveKeys) {
    console.warn(`- line ${hit.line}: ${hit.key}`);
  }
  console.warn("Consider moving secrets to a local file before sharing.");
  process.exit(2);
}

const existingTarget = fs.existsSync(targetPath)
  ? fs.readFileSync(targetPath, "utf8")
  : "";
const projectBlocks = existingTarget ? extractProjectBlocks(existingTarget) : [];

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourcePath, targetPath);

if (projectBlocks.length > 0) {
  const installed = fs.readFileSync(targetPath, "utf8");
  const separator = installed.trim().length === 0 ? "" : "\n\n";
  const blocksText = `${projectBlocks.join("\n\n")}\n`;
  fs.appendFileSync(targetPath, `${separator}${blocksText}`, "utf8");
}

console.log(`Synced config to: ${targetPath}`);
