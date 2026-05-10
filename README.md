[🇨🇳 中文](README.md) | [🇬🇧 English](README.en.md)

---

# 🚀 cc-adapter-v2

**Bridge Claude Code ecosystem to OpenCode.**  
把 Claude Code 的命令、技能、MCP 服务器、Agent、插件桥接到 OpenCode。

[![Release](https://img.shields.io/github/v/release/FountainChan/opencode-cc-adapter?sort=semver)](https://github.com/FountainChan/opencode-cc-adapter/releases)
[![License](https://img.shields.io/badge/license-SUL-blue)](./LICENSE.md)

> **💡 为什么有这个项目？**  
> [oh-my-openagent](https://github.com/oh-my-openagent/oh-my-openagent)（OmO）实现了完整的 Claude Code 兼容层，但它也捆绑了大量功能——11 个内置 Agent、团队协作、后台任务、tmux 集成……  
> 对于只想在 OpenCode 里用上 `.claude/commands/`、技能和 MCP 的用户来说，**太重了**。  
> cc-adapter-v2 就是 OmO 的 Claude Code 兼容层的**轻量提取版**——去掉 Agent 编排、去掉团队功能，只保留桥接核心。

> **⚠️ 基于 oh-my-openagent 修改**  
> 本作品基于 oh-my-openagent 的 Claude Code 兼容层提取而成，原始代码采用 [Sustainable Use License v1.0](./LICENSE.md)。

---

## ✨ 功能一览

| 功能 | Emoji | 说明 | 默认 | 状态 |
|------|-------|------|------|------|
| **Commands** | 📋 | 从 `.claude/commands/` 加载命令到 `/` 自动补全 | ✅ 开启 | 🟢 稳定 |
| **Skills** | 🎯 | 从 7 个来源发现技能，注入 system prompt | ✅ 开启 | 🟢 稳定 |
| **MCP** | 🔌 | 加载 `.mcp.json` MCP 服务器（stdio + HTTP） | ✅ 开启 | 🟢 稳定 |
| **Agents** | 🤖 | 从 `.claude/agents/` 加载 Agent 定义 | ❌ 关闭 | 🟡 实验性 |
| **Plugins** | 🧩 | 从 `.claude/plugins/` 加载 Claude Code 插件 | ❌ 关闭 | 🟡 实验性 |

---

## 📥 安装

### 方法一：从 GitHub Release 安装（推荐 🏆）

```bash
# 用 tag 安装（自动从 GitHub 下载）
npm install FountainChan/opencode-cc-adapter#v2.0.0
```

### 方法二：从 tgz 包安装

到 [GitHub Releases](https://github.com/FountainChan/opencode-cc-adapter/releases) 下载 `cc-adapter-v2-2.0.0.tgz`：

```bash
npm install ./cc-adapter-v2-2.0.0.tgz
```

### 方法三：本地开发安装

```bash
npm install /path/to/cc-adapter-v2
```

然后编辑你的 OpenCode 配置（`~/.config/opencode/opencode.json`）：

```json
{
  "plugin": [
    "opencode-runtime-fallback",
    "cc-adapter-v2"
  ]
}
```

> 💡 安装后重启 OpenCode，在插件列表中应该能看到 `cc-adapter-v2`。

---

## ⚙️ 配置

通过 OpenCode 配置文件开启或关闭各个模块：

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

配置优先级：**项目级 > 用户级**

| 层级 | 文件路径 |
|------|---------|
| 🏢 项目级 | `.opencode/opencode.json` |
| 👤 用户级 | `~/.config/opencode/opencode.json` |

---

## 🧩 开启 Plugin Loader（实验性）

> ⚠️ 这是一个实验性功能！默认关闭，需要手动开启。

**前置条件：** 先用 Claude Code 安装你想要的插件。例如：

```bash
# 在 Claude Code 中运行
/plugin marketplace add thedotmack/claude-mem
```

Claude Code 会把插件安装到 `.claude/plugins/` 或 `~/.claude/plugins/` 目录。

**开启方式：**

```json
{
  "claude_code": {
    "plugins": true
  }
}
```

重启 OpenCode 后，插件会自动被发现并加载。

**📝 待办事项（见 docs/tracking/）：**
- [ ] 实际测试 Claude Code 插件 ↔ OpenCode 的兼容性
- [ ] 确认插件安装目录（`.claude/plugins/` vs `~/.claude/plugins/`）
- [ ] 验证插件中的命令是否出现在 `/` 自动补全

---

## 🤖 开启 Agent Loader（实验性）

```json
{
  "claude_code": {
    "agents": true
  }
}
```

从 `.claude/agents/` 和 `~/.claude/agents/` 加载 Agent 定义。  
> ⚠️ 需要 OpenCode 宿主支持 Agent 运行时，否则加载的定义只是"死数据"。

---

## 🔄 v1 → v2 升级指南

### 1️⃣ 运行迁移检查

```bash
# 简易模式 — 只看数量摘要
node scripts/migration-check.mjs

# 详细模式 — 看到每个文件的路径
node scripts/migration-check.mjs --verbose
```

### 2️⃣ 注意事项

- ✅ v1 的命令发现功能在 v2 中完全保留（`loadCommandsFromDir`）
- ✅ v1 的 `__cc_source` 标记机制兼容，旧标记会被 v2 自动覆盖
- ⚠️ v1 的 `experimental.chat.system.transform` hook 被 **skill-loader 统一接管**
  - 如果你的 Superpowers skill 在标准路径，v2 会自动发现
  - 如果不在标准路径，迁移脚本会提示你移动位置

### 3️⃣ 清理旧版本

```bash
python scripts/cleanup.py --source cc-adapter-user
python scripts/cleanup.py --source cc-adapter-project --project-dir /path/to/project
```

---

## 🏗️ 构建

```bash
npm run build
```

输出：`dist/index.js`（21.6KB，由 81 个源文件打包而成）

---

## 📂 源码结构

```
src/
├── index.ts                          # 🚪 插件入口（重写）
├── claude-code/
│   ├── command-loader/  (5 files)    # 📋 命令发现
│   ├── skill-loader/    (29 files)   # 🎯 技能发现 ✨ 最复杂
│   ├── mcp-loader/      (11 files)   # 🔌 MCP 服务器
│   ├── agent-loader/    (12 files)   # 🤖 Agent 定义
│   ├── plugin-loader/   (16 files)   # 🧩 插件市场
│   └── session-state/   (3 files)    # 💾 注册中心
├── shared/              (20 files)   # 🛠️ 工具库
└── config/                           # ⚙️ 配置 schema
scripts/
├── build.js             # 🔨 esbuild 构建
├── migration-check.mjs  # 🔄 v1→v2 迁移检查
└── cleanup.py           # 🧹 残留清理
```

| 统计 | 数值 |
|------|------|
| 📄 源文件 | 81 个 `.ts` |
| 🧪 测试文件 | 16 个（vitest 格式） |
| 🛠️ 共享工具 | 20 个 |
| 📦 编译产物 | 21.6KB |

---

## 🔗 相关链接

- **上游项目:** [oh-my-openagent](https://github.com/oh-my-openagent/oh-my-openagent)
- **OpenCode 插件 SDK:** `@opencode-ai/plugin` >= v1.4.0
- **许可证:** [Sustainable Use License v1.0](./LICENSE.md)

---

## 📝 开发计划

> 见 `docs/plans/2026-05-11-001-feat-cc-adapter-v2-extraction-plan.md`

### ✅ 完成
- [x] 6 个 Claude Code 兼容模块提取完毕
- [x] shared 工具库剥离 OmO 特有代码
- [x] TypeScript + esbuild 构建系统
- [x] Zod 配置系统 + 模块独立开关
- [x] v1→v2 迁移检查脚本
- [x] SUL 许可合规

### 🔄 待验证
- [ ] Plugin Loader 实际兼容性测试（见上文"开启 Plugin Loader"）
- [ ] Agent Loader + OpenCode 宿主兼容性
- [ ] vitest 测试适配（`vi.mock` 提升问题）
