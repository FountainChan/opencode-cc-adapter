# 🧩 Plugin Loader — 测试计划

> 创建日期：2026-05-11  
> 状态：⏳ 待做

## 背景

cc-adapter-v2 已从 OmO 提取 `claude-code-plugin-loader` 模块并接入入口开关  
（`claude_code.plugins: true`），但**未经过实际测试**。

## 测试步骤

- [ ] **确认 Claude Code 插件安装目录**
  - 用 Claude Code 运行 `/plugin marketplace add thedotmack/claude-mem`
  - 检查 `.claude/plugins/` 和 `~/.claude/plugins/` 哪个有文件
- [ ] **配置开启 plugin-loader**
  - 在 `~/.config/opencode/opencode.json` 或项目 `.opencode/opencode.json` 中设置
    ```json
    { "claude_code": { "plugins": true } }
    ```
- [ ] **重启 OpenCode**
- [ ] **验证插件命令出现在 `/` 自动补全**
- [ ] **验证插件技能注入 system prompt**
- [ ] **验证插件 Agent 定义可被加载**
- [ ] **验证 MCP 服务器可被加载**（如果插件包含 MCP 配置）
- [ ] **测试插件卸载后清理**
  - 删除插件目录
  - 重启 OpenCode
  - 确认命令/技能/MCP 不再出现

## 已知风险

| 风险 | 说明 |
|------|------|
| 🔴 格式不兼容 | Claude Code 无标准插件格式，`plugin.json` 是 OmO 自己定义的 |
| 🟡 生态不足 | 目前市场上可直接消费的 Claude Code 插件数量有限 |
| 🟡 目录不确定 | `.claude/plugins/` 是 Claude Code 实际使用的路径吗？ |

## 参考资料

- Plugin loader 源码：`src/claude-code/plugin-loader/`
- 插件入口配置：`src/index.ts`（搜索 `config.claude_code?.plugins`）
- 上游 OmO 实现：`src/features/claude-code-plugin-loader/`
