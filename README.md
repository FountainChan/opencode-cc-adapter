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

```bash
cd ~/.cache/opencode
npm install /path/to/opencode-cc-adapter
```

> 💡 这会创建符号链接，修改源码后无需重新安装，改动实时生效。

### 方式二：GitHub 仓库安装

```bash
cd ~/.cache/opencode
npm install FountainChan/opencode-cc-adapter
```

### 方式三：直接文件路径（备选）

如果 npm 方式有问题，可直接在 `opencode.json` 的 `plugin` 字段引用 JS 文件路径：

```json
{
  "plugin": [
    "file:///path/to/opencode-cc-adapter/src/index.js"
  ]
}
```

> ⚠️ 缺点是插件名会显示为完整路径（较丑），但功能完全一致。

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
├── scripts/
│   └── cleanup.py      # 清理脚本（卸载前执行）
├── package.json
├── README.md
└── .gitignore
```

## 🧹 卸载

在删除插件前，执行清理脚本以移除残留的命令条目：

```bash
# 1. 预览要清理的内容
python scripts/cleanup.py --source cc-adapter-user --dry-run

# 2. 执行清理
python scripts/cleanup.py --source cc-adapter-user --project-dir .

# 3. 卸载 npm 包
npm uninstall cc-adapter

# 4. 从 opencode.json 的 plugin 数组中移除 "cc-adapter"
```

> 💡 `--source cc-adapter-user` 清理全局用户级命令，`--source cc-adapter-project` 清理项目级命令。
> `--dry-run` 可以先预览效果，确认无误后再实际执行。

## 🔧 工作原理

| Hook / 机制 | 功能 |
|-------------|------|
| 启动扫描 | 读取 `~/.claude/commands/` 和 `<project>/.claude/commands/` 中的 `.md` 命令文件 |
| 写配置文件 | 用户级命令 → `~/.config/opencode/opencode.json`（全局）；项目级命令 → `<project>/.opencode/opencode.json`（本地，不跨项目污染） |
| `config` hook | 注入命令到运行时 `inputConfig.command`（供 LLM 系统提示词使用） |
| `experimental.chat.system.transform` | 检测 Superpowers 技能 → 注入 bootstrap 系统提示词 |

> **为什么需要写配置文件？** OpenCode CLI 的 `/` 命令自动补全从**磁盘文件**读取，插件 `config` hook 仅修改运行时内存，不足以让命令出现在自动补全中。详见 [踩坑记录](https://github.com/FountainChan/opencode-cc-adapter)。

## 🐛 排错指南

### 插件已加载，但 `/` 没有 `.claude/commands/` 的命令

1. **检查插件是否正确安装**：确认 `~/.cache/opencode/node_modules/cc-adapter` 存在且为符号链接
2. **检查命令文件路径**：项目的 `.claude/commands/` 目录必须存在且包含 `.md` 文件
3. **检查配置文件**：重启后查看 `~/.config/opencode/opencode.json` 的 `command` 字段是否包含 cc-adapter 注入的命令
4. **查看日志**：在 opencode Desktop 按 `Ctrl+Shift+I` 打开 DevTools Console，搜索 `[cc-adapter]`

## 📋 前置依赖

- [OpenCode](https://opencode.ai) >= 1.0.0
- `@opencode-ai/plugin` >= 1.0.0（通常随 OpenCode 安装）

## 🔍 查询关键字

如需在知识库中快速找到相关经验，使用以下关键字：

- `opencode 插件开发`、`cc-adapter`、`opencode 命令注册`、`config hook 限制`
- `opencode 插件加载路径`、`syncCommandsToFile`、`process.cwd() 回退`

## 📜 License

MIT
