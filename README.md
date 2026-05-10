# 🔌 cc-adapter

**Bridge [Claude Code](https://docs.anthropic.com/en/docs/claude-code) ecosystem to [OpenCode](https://opencode.ai)**

将 Claude Code 的 `.claude/commands/` 自定义命令和 Superpowers 技能体系桥接到 OpenCode，让你在 OpenCode 中无缝使用 Claude Code 项目的命令和技能。

## ✨ 功能

### 📜 命令桥接

自动扫描以下目录中的 `.md` 命令文件，注册为 OpenCode 原生命令：

- `~/.claude/commands/` — 用户级全局命令
- `<project>/.claude/commands/` — 项目级命令

支持 frontmatter 元数据（`description`、`subtask`），支持子目录命令。

输入 `/` 即可在 OpenCode 中看到所有已加载的命令。

### 🦸 Superpowers 注入

自动检测 `~/.config/opencode/skills/superpowers/` 中的 Superpowers 技能体系，通过 system prompt transform 注入 bootstrap 上下文，包括工具映射和技能发现指引。

## 📦 安装

> ⚠️ **关键**：OpenCode 从 `~/.cache/opencode/` 加载插件，不是 `~/.config/opencode/`。

### 方式一：本地路径安装（推荐，开发用）

编辑 `~/.cache/opencode/package.json`，添加依赖：

```json
{
  "dependencies": {
    "cc-adapter": "file:///path/to/opencode-cc-adapter"
  }
}
```

然后安装：

```bash
cd ~/.cache/opencode
npm install
```

> 💡 这会在 `node_modules/` 下创建符号链接指向本地目录。
> 修改源码后无需重新安装，改动实时生效。

### 方式二：GitHub 仓库安装

```bash
cd ~/.cache/opencode
npm install FountainChan/opencode-cc-adapter
```

## ⚙️ 配置

在 `~/.config/opencode/opencode.json` 中添加插件：

```json
{
  "plugin": [
    "cc-adapter"
  ]
}
```

## 🗂️ 项目结构

```
opencode-cc-adapter/
├── src/
│   └── index.js        # 插件入口
├── package.json
├── README.md
└── .gitignore
```

## 🔧 工作原理

| Hook | 功能 |
|------|------|
| `config` | 扫描 `.claude/commands/*.md` → 注入到 `opencode.json` 的 `command` 字段 |
| `experimental.chat.system.transform` | 检测 Superpowers 技能 → 注入 bootstrap 系统提示词 |

## 📋 前置依赖

- [OpenCode](https://opencode.ai) >= 1.0.0
- `@opencode-ai/plugin` >= 1.0.0（通常随 OpenCode 安装）

## 📜 License

MIT
