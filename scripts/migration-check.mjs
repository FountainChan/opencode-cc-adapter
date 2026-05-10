#!/usr/bin/env node

/**
 * cc-adapter v1 → v2 migration check
 * Verifies that existing commands and skills will be found by v2's skill-loader.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { createInterface } from "node:readline";

const home = homedir();
let exitCode = 0;

function info(msg) {
  console.log(`  ℹ️  ${msg}`);
}

function ok(msg) {
  console.log(`  ✅ ${msg}`);
}

function warn(msg) {
  console.log(`  ⚠️  ${msg}`);
  exitCode = 1;
}

function header(title) {
  console.log(`\n── ${title} ──`);
}

// ── Claude Code commands 检查 ──
header("Claude Code Commands");

const userCmdDir = resolve(home, ".claude/commands");
const userCmdExists = existsSync(userCmdDir);

if (userCmdExists) {
  const count = readdirSync(userCmdDir).filter((f) => f.endsWith(".md")).length;
  ok(`用户命令目录 (~/.claude/commands/) 存在，含 ${count} 个 .md 命令文件`);
} else {
  info("用户命令目录 ~/.claude/commands/ 不存在（可选）");
}

// 扫描项目级 .claude/commands/
const cwd = process.cwd();
const projectCmdDir = resolve(cwd, ".claude/commands");
if (existsSync(projectCmdDir)) {
  const count = readdirSync(projectCmdDir).filter((f) => f.endsWith(".md")).length;
  ok(`项目命令目录 (.claude/commands/) 存在，含 ${count} 个 .md 命令文件`);
} else {
  info("项目命令目录 .claude/commands/ 不存在（可选）");
}

// ── Superpowers skill 检查 ──
header("Superpowers Skills (v1 → v2 compatibility)");

const skillSearchPaths = [
  resolve(cwd, ".opencode/skills"),
  resolve(home, ".config/opencode/skills"),
  resolve(cwd, ".claude/skills"),
  resolve(home, ".claude/skills"),
  resolve(cwd, ".agents/skills"),
  resolve(home, ".agents/skills"),
];

const foundSkills = [];

for (const basePath of skillSearchPaths) {
  if (!existsSync(basePath)) continue;
  try {
    const entries = readdirSync(basePath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillFile = resolve(basePath, entry.name, "SKILL.md");
        if (existsSync(skillFile)) {
          foundSkills.push(skillFile);
        }
      }
    }
  } catch {
    // skip
  }
}

if (foundSkills.length > 0) {
  ok(`v2 discovery 发现了 ${foundSkills.length} 个 SKILL.md 文件：`);
  for (const s of foundSkills) {
    info(`  ${s}`);
  }
} else {
  warn("未发现任何 SKILL.md 文件。如果你的 Superpowers skill 在非标准路径，请移到 v2 搜索路径之一。");
  info("v2 搜索路径优先级（项目级优先于用户级）：");
  skillSearchPaths.forEach((p, i) => info(`  ${i + 1}. ${p}`));
}

// ── opencode.json 残留检查 ──
header("Legacy Config Cleanup");

const configPaths = [
  resolve(home, ".config/opencode/opencode.json"),
  resolve(cwd, ".opencode/opencode.json"),
];

for (const configPath of configPaths) {
  if (!existsSync(configPath)) continue;
  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content);
    if (parsed.command) {
      const ccSourceEntries = Object.entries(parsed.command).filter(
        ([_, v]) => v.__cc_source,
      );
      if (ccSourceEntries.length > 0) {
        const sources = [
          ...new Set(ccSourceEntries.map(([_, v]) => v.__cc_source)),
        ];
        info(`${configPath}: 发现 ${ccSourceEntries.length} 条 __cc_source 标记的命令`);
        info(`来源: ${sources.join(", ")}`);
        info(`升级到 v2 后，旧标记会自动被 v2 覆盖`);
      } else {
        ok(`${configPath}: 无遗留 __cc_source 标记`);
      }
    }
  } catch {
    // skip
  }
}

// ── 结果 ──
console.log("");
if (exitCode === 0) {
  console.log("🎉 迁移检查通过！你的环境与 v2 兼容。");
} else {
  console.log("⚠️  发现需要关注的问题，请按上述建议处理。");
}

process.exit(exitCode);
