[🇨🇳 中文](README.md) | [🇬🇧 English](README.en.md)

---

# 🚀 cc-adapter-v2

**Bridge Claude Code ecosystem to OpenCode.**  
Load commands, skills, MCP servers, agents, and plugins from Claude Code conventions into OpenCode.

[![Release](https://img.shields.io/github/v/release/FountainChan/opencode-cc-adapter?sort=semver)](https://github.com/FountainChan/opencode-cc-adapter/releases)
[![License](https://img.shields.io/badge/license-SUL-blue)](./LICENSE.md)

> **💡 Why this project?**  
> [oh-my-openagent](https://github.com/oh-my-openagent/oh-my-openagent) (OmO) has a full Claude Code compatibility layer, but it also bundles 11 built-in agents, team collaboration, background tasks, tmux integration, and more.  
> For users who just want `.claude/commands/`, skills, and MCP in OpenCode, **it's too heavy**.  
> cc-adapter-v2 is a **lightweight extraction** of OmO's Claude Code compatibility layer — stripped of agent orchestration, team features, and background services. Just the bridge, nothing more.

> **⚠️ Derived from oh-my-openagent**  
> This project is a derivative work of oh-my-openagent's Claude Code compatibility layer.  
> Original code is licensed under [Sustainable Use License v1.0](./LICENSE.md).

---

## ✨ Features

| Feature | Description | Default | Status |
|---------|-------------|---------|--------|
| **Commands** 📋 | Load `.claude/commands/*.md` into `/` autocomplete | ✅ on | 🟢 Stable |
| **Skills** 🎯 | Discover skills from 7 sources, inject into system prompt | ✅ on | 🟢 Stable |
| **MCP** 🔌 | Load `.mcp.json` servers (stdio + HTTP) | ✅ on | 🟢 Stable |
| **Agents** 🤖 | Load agent definitions from `.claude/agents/` | ❌ off | 🟡 Experimental |
| **Plugins** 🧩 | Load Claude Code plugins from `.claude/plugins/` | ❌ off | 🟡 Experimental |

---

## 📥 Installation

### Option 1: From GitHub Release (recommended 🏆)

```bash
npm install FountainChan/opencode-cc-adapter#v2.0.0
```

### Option 2: From .tgz

Download `cc-adapter-v2-2.0.0.tgz` from [GitHub Releases](https://github.com/FountainChan/opencode-cc-adapter/releases):

```bash
npm install ./cc-adapter-v2-2.0.0.tgz
```

### Option 3: Local development

```bash
npm install /path/to/cc-adapter-v2
```

Then add to your OpenCode config (`~/.config/opencode/opencode.json`):

```json
{
  "plugin": [
    "opencode-runtime-fallback",
    "cc-adapter-v2"
  ]
}
```

> 💡 Restart OpenCode after installation. You should see `cc-adapter-v2` in the plugin list.

---

## ⚙️ Configuration

Toggle modules via OpenCode config files:

```json
{
  "claude_code": {
    "commands": true,
    "skills": true,
    "mcp": true,
    "agents": false,
    "plugins": false,
    "mcp_env_allowlist": ["MY_API_KEY", "MY_SECRET"]
  }
}
```

Config file locations:

| Level | File | Scope |
|-------|------|-------|
| 👤 **User** (recommended) | `~/.config/opencode/opencode.json` | Global — applies to all projects |
| 🏢 **Project** | `<project>/.opencode/opencode.json` | Local — overrides user config for this project |

Priority: **Project-level > User-level**

---

## 🧩 Enabling Plugin Loader (Experimental)

> ⚠️ Experimental — off by default.

First, install a plugin via Claude Code:

```bash
# In Claude Code
/plugin marketplace add thedotmack/claude-mem
```

Then enable in `~/.config/opencode/opencode.json` (user-level) or `<project>/.opencode/opencode.json` (project-level):

```json
{
  "claude_code": {
    "plugins": true
  }
}
```

For example, edit `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["cc-adapter-v2"],
  "claude_code": {
    "plugins": true
  }
}
```

Restart OpenCode. The plugin's commands, skills, and MCP servers will be auto-discovered.

Check `docs/tracking/plugin-loader-testing.md` for known limitations and roadmap.

---

## 🤖 Enabling Agent Loader (Experimental)

Add to `~/.config/opencode/opencode.json` (user-level) or `<project>/.opencode/opencode.json` (project-level):

```json
{
  "claude_code": {
    "agents": true
  }
}
```

For example, edit `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["cc-adapter-v2"],
  "claude_code": {
    "agents": true
  }
}
```

> ⚠️ Requires OpenCode host to support agent runtime.

---

## 🔄 Upgrading from v1

### 1️⃣ Run migration check

```bash
# Summary mode
node scripts/migration-check.mjs

# Verbose mode (show full file paths)
node scripts/migration-check.mjs --verbose
```

### 2️⃣ Notes

- ✅ Command discovery is fully backward-compatible
- ✅ `__cc_source` tag mechanism is preserved — old tags auto-overwritten by v2
- ⚠️ v1's `experimental.chat.system.transform` hook is replaced by the **skill-loader**
  - If your Superpowers skill is in a standard path, v2 finds it automatically
  - The migration script will warn you if it's in a non-standard location

### 3️⃣ Clean up old version

```bash
python scripts/cleanup.py --source cc-adapter-user
python scripts/cleanup.py --source cc-adapter-project --project-dir /path/to/project
```

---

## 🏗️ Build

```bash
npm run build
```

Output: `dist/index.js` (21.6KB, bundled from 81 source files)

---

## 📂 Source Structure

```
src/
├── index.ts                          # 🚪 Plugin entry (rewritten)
├── claude-code/
│   ├── command-loader/  (5 files)    # 📋 Command discovery
│   ├── skill-loader/    (29 files)   # 🎯 Skill discovery (most complex)
│   ├── mcp-loader/      (11 files)   # 🔌 MCP server loading
│   ├── agent-loader/    (12 files)   # 🤖 Agent definitions
│   ├── plugin-loader/   (16 files)   # 🧩 Plugin marketplace compat
│   └── session-state/   (3 files)    # 💾 Registration registry
├── shared/              (20 files)   # 🛠️ Utility library
└── config/                           # ⚙️ Config schema
scripts/
├── build.js             # 🔨 esbuild build
├── migration-check.mjs  # 🔄 v1→v2 migration checker
└── cleanup.py           # 🧹 Cleanup utility
```

## 🔗 Links

- **Upstream:** [oh-my-openagent](https://github.com/oh-my-openagent/oh-my-openagent)
- **OpenCode Plugin SDK:** `@opencode-ai/plugin` >= v1.4.0
- **License:** [Sustainable Use License v1.0](./LICENSE.md)

---

## 📝 Changelog

### v2.0.0 (2026-05-11)

- Initial extraction from oh-my-openagent
- 6 Claude Code compatibility modules: commands, skills, MCP, agents, plugins, session-state
- Removed: OmO agent system, team-mode, background agents, tmux, OpenClaw, PostHog telemetry
- Node.js runtime (replaced Bun APIs)
- TypeScript + esbuild build pipeline
- Zod config schema with per-module toggles
- v1→v2 migration check script

See `docs/plans/2026-05-11-001-feat-cc-adapter-v2-extraction-plan.md` for details.
