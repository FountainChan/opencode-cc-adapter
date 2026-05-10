#!/usr/bin/env node

/**
 * cc-adapter v1 → v2 migration check
 * 检查当前环境是否能平滑升级到 v2
 *
 * Usage:
 *   node scripts/migration-check.mjs          # 简易模式（只显示数量摘要）
 *   node scripts/migration-check.mjs --verbose # 详细模式（列出每个文件路径）
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const verbose = args.includes("--verbose") || args.includes("-v");

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
  if (verbose && count > 0) {
    for (const f of readdirSync(userCmdDir).filter((f) => f.endsWith(".md"))) {
      info(`  ${resolve(userCmdDir, f)}`);
    }
  }
} else {
  info("用户命令目录 ~/.claude/commands/ 不存在（可选）");
}

const cwd = process.cwd();
const projectCmdDir = resolve(cwd, ".claude/commands");
if (existsSync(projectCmdDir)) {
  const count = readdirSync(projectCmdDir).filter((f) => f.endsWith(".md")).length;
  ok(`项目命令目录 (.claude/commands/) 存在，含 ${count} 个 .md 命令文件`);
  if (verbose && count > 0) {
    for (const f of readdirSync(projectCmdDir).filter((f) => f.endsWith(".md"))) {
      info(`  ${resolve(projectCmdDir, f)}`);
    }
  }
} else {
  info("项目命令目录 .claude/commands/ 不存在（可选）");
}

// ── Skills 检查 ──
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
  ok(`v2 discovery 发现了 ${foundSkills.length} 个 SKILL.md 文件`);

  // Group by base path for summary
  const grouped = {};
  for (const s of foundSkills) {
    for (const basePath of skillSearchPaths) {
      if (s.startsWith(basePath)) {
        const key = basePath.replace(home, "~");
        grouped[key] = (grouped[key] || 0) + 1;
        break;
      }
    }
  }
  for (const [path, count] of Object.entries(grouped)) {
    info(`${path}/  → ${count} 个 skill`);
    if (verbose) {
      for (const s of foundSkills) {
        for (const basePath of skillSearchPaths) {
          if (s.startsWith(basePath) && basePath.replace(home, "~") === path) {
            info(`  ${s.replace(home, "~")}`);
            break;
          }
        }
      }
    }
  }
} else {
  warn("未发现任何 SKILL.md 文件。如果你的 Superpowers skill 在非标准路径，请移到 v2 搜索路径之一。");
  if (verbose) {
    info("v2 搜索路径优先级（项目级优先于用户级）：");
    skillSearchPaths.forEach((p, i) => info(`  ${i + 1}. ${p.replace(home, "~")}`));
  }
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
        if (verbose) {
          for (const [name, val] of ccSourceEntries) {
            info(`  ${name} → ${val.__cc_source}`);
          }
        }
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
