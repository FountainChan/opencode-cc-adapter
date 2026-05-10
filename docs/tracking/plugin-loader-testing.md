# 🧩 Plugin Loader — 测试计划

> 创建日期：2026-05-11  
> 状态：⏳ 待做

## 背景

cc-adapter-v2 已从 OmO 提取 `claude-code-plugin-loader` 模块并接入入口开关  
（`claude_code.plugins: true`），但**未经过实际测试**。

## 📁 发现的插件

你的 `~/.claude/plugins/` 目录已有 **28 个 Claude Code 官方插件**：

```
agent-sdk-dev         clangd-lsp            claude-code-setup
claude-md-management  code-review           code-simplifier
commit-commands       csharp-lsp            example-plugin
explanatory-output-style  feature-dev       frontend-design
gopls-lsp             hookify               jdtls-lsp
kotlin-lsp            learning-output-style lua-lsp
php-lsp               playground            plugin-dev
pr-review-toolkit     pyright-lsp           ralph-loop
rust-analyzer-lsp     security-guidance     swift-lsp
typescript-lsp
```

来源：`anthropics/claude-plugins-official` GitHub 仓库克隆到  
`~/.claude/plugins/marketplaces/claude-plugins-official/plugins/`

## ⚠️ 关键发现：当前 plugin-loader 读不到这些插件

OmO 的 `discoverInstalledPlugins()` 通过读取 `installed_plugins.json` 来发现插件，  
但 Claude Code 官方市场不使用这个文件——它直接把插件目录挂在那里。

**Plugin loader 的发现路径：**
```
installed_plugins.json  → 不存在 → 返回空列表 ❌
```

**Claude Code 的实际安装路径：**
```
~/.claude/plugins/marketplaces/claude-plugins-official/plugins/{name}/
  ├── .claude-plugin/plugin.json   ✅ 格式兼容
  ├── commands/                    ✅ 命令
  ├── skills/                      ✅ 技能
  └── .mcp.json                    ✅ MCP 配置
```

**需要做的：** 给 `discovery.ts` 添加一个备选发现路径——扫描  
`marketplaces/*/plugins/*/` 下面的每个目录，检查是否有 `.claude-plugin/plugin.json`。

## 测试步骤

- [ ] **🔧 修复发现路径**：让 plugin-loader 也能扫描 `marketplaces/*/plugins/*/`
- [ ] **配置开启 plugin-loader**
  - 在 `~/.config/opencode/opencode.json` 或项目 `.opencode/opencode.json` 中设置
    ```json
    { "claude_code": { "plugins": true } }
    ```
- [ ] **重启 OpenCode**
- [ ] **验证插件命令出现在 `/` 自动补全**
- [ ] **验证插件技能注入 system prompt**
- [ ] **验证插件 MCP 服务器可被加载**
- [ ] **测试插件卸载后清理**
  - 删除插件目录
  - 重启 OpenCode
  - 确认命令/技能/MCP 不再出现

## 已知风险

| 风险 | 说明 |
|------|------|
| 🟡 **发现路径缺失** | OmO 的实现假设有 `installed_plugins.json`，而 Claude Code 官方市场没有它 |
| 🟡 **scope 机制** | 有的插件设置了 project-scope，只在特定项目目录下生效 |
| 🟡 **hooks 支持** | 插件可能包含 hooks，cc-adapter 没有实现 hook 执行 |

## 参考资料

- Plugin loader 源码：`src/claude-code/plugin-loader/`
- 发现逻辑：`src/claude-code/plugin-loader/discovery.ts`（`discoverInstalledPlugins()`）
- 插件入口配置：`src/index.ts`（搜索 `config.claude_code?.plugins`）
- 上游 OmO 实现：`src/features/claude-code-plugin-loader/`
