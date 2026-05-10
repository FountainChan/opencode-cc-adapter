# cc-adapter

**Bridge Claude Code ecosystem to OpenCode.**  
Loads commands, skills, MCP servers, and agents from Claude Code conventions into OpenCode.

> **⚠️ v2.0-dev — 基于 oh-my-openagent 修改**  
> 本作品基于 [oh-my-openagent](https://github.com/oh-my-openagent/oh-my-openagent) 的 Claude Code 兼容层提取而成，  
> 原始代码采用 [Sustainable Use License v1.0](./LICENSE.md)。

---

## Features

| Feature | Description | Default |
|---------|-------------|---------|
| 📋 **Commands** | Load `.claude/commands/*.md` into `/` autocomplete | ✅ on |
| 🎯 **Skills** | Discover skills from 7 sources, inject into system prompt | ✅ on |
| 🔌 **MCP** | Load `.mcp.json` servers (stdio + HTTP) | ✅ on |
| 🤖 **Agents** | Load agent definitions from `.claude/agents/` | ❌ off |
| 🧩 **Plugins** | Load Claude Code plugins from `.claude/plugins/` | ❌ off |

## Installation

```bash
# From local directory
npm install /path/to/cc-adapter
```

Then add to your OpenCode config (`~/.config/opencode/opencode.json`):

```json
{
  "plugins": ["cc-adapter"]
}
```

## Configuration

Configure via OpenCode config files:

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

Project-level `.opencode/opencode.json` overrides user-level `~/.config/opencode/opencode.json`.

## Upgrading from v1

Run the migration check script before upgrading:

```bash
node scripts/migration-check.mjs
```

This will:
- Check your existing `.claude/commands/` files
- Verify Superpowers skill is in a discoverable path
- Report any necessary adjustments

## Uninstall

```bash
pip install -r scripts/requirements.txt
python scripts/cleanup.py --source cc-adapter-user
python scripts/cleanup.py --source cc-adapter-project --project-dir /path/to/project
```

Then remove `"cc-adapter"` from your OpenCode config.

## Build

```bash
npm run build
```

Output: `dist/index.js`

## Source Files

- **81 source files** in `src/claude-code/` (6 feature modules)
- **19 shared utility files** in `src/shared/`
- **16 test files** (vitest format)

## License

Sustainable Use License v1.0 — see [LICENSE.md](./LICENSE.md).

This is a derivative work of [oh-my-openagent](https://github.com/oh-my-openagent/oh-my-openagent).  
Modifications: extracted Claude Code compatibility layer, removed OmO-specific agents/team-mode/background features, adapted for Node.js runtime.
