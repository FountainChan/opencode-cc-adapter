---
date: 2026-05-11
topic: cc-adapter-v2-claude-code-compat
---

# cc-adapter v2.0 — Claude Code 完整兼容层

## Problem Frame

cc-adapter v1 是一个 269 行的轻量桥接器，只能从 `.claude/commands/` 加载命令到 OpenCode。但 Claude Code 生态包含更多核心资产——技能（skills）、MCP 服务器、Agents、插件市场——这些在 OpenCode 中完全不可用。

OmO（oh-my-openagent）实现了完整的 Claude Code 兼容层（6 个模块，约 350 个源文件），但捆绑了大量 OmO 特有功能（多 Agent 编排、团队协作、后台任务、tmux 集成、Discord/Telegram 网关等）。

目标是：提取 OmO 的 Claude Code 兼容层，去掉所有 OmO 特有功能，打造 cc-adapter v2.0——一个纯粹、完整、可维护的 Claude Code → OpenCode 桥接插件。

## Requirements

**R1. Command Loader — 命令发现**
- 从 `.claude/commands/`（项目级）和 `~/.claude/commands/`（用户级）发现命令
- 支持多级子目录嵌套
- 解析 `---` frontmatter（使用 js-yaml）
- 命令自动注册到 OpenCode `/` 自动补全
- 保留 v1 的 `syncCommandsToFile()` 机制
- 保留分层写入策略：用户命令 → 全局 opencode.json，项目命令 → 本地 `.opencode/opencode.json`

**R2. Skill Loader — 技能发现**
- 从以下来源发现技能（优先级递减）：
  1. `.opencode/skills/*/SKILL.md`（项目级，OpenCode 原生）
  2. `~/.config/opencode/skills/*/SKILL.md`（用户级，OpenCode 原生）
  3. `.claude/skills/*/SKILL.md`（项目级，Claude Code 兼容）
  4. `~/.claude/skills/*/SKILL.md`（用户级，Claude Code 兼容）
  5. `.agents/skills/*/SKILL.md`（项目级，Agents 惯例）
  6. `~/.agents/skills/*/SKILL.md`（用户级，Agents 惯例）
  7. 内置技能目录
- 优先级顺序：编号越小优先级越高，项目级覆盖用户级同名技能
- 解析 `SKILL.md` frontmatter 提取 name、description、mcp 等元数据
- 技能注入 LLM system prompt
- 支持同名的技能覆盖机制

**R3. MCP Loader — MCP 服务器加载**
- 从 `.mcp.json`（项目 + 用户）加载 MCP 服务器配置
- 支持 `${VAR}` 环境变量展开（含 allowlist 安全机制）
- 支持两类 MCP：stdio（命令行）、HTTP（远程端点）
- ⚠️ OAuth MCP 暂不支持（与 Scope Boundaries 中"排除 MCP OAuth 实现"一致，需要在宿主支持 OAuth 流程后再添加）
- MCP 服务器在 OpenCode 中可用

**R4. Agent Loader — Agents 发现**
- 从 `.claude/agents/` 和 `.opencode/agents/` 加载 Agent 定义
- 支持 frontmatter 和 JSON 两种格式的 Agent 定义
- 模型名称自动映射（Claude Code 模型名 → OpenCode 格式）
- ⚠️ 依赖 OpenCode 宿主提供 Agent 运行时，否则加载的定义无法执行（可能成为"死数据"）

**R5. Plugin Loader — Claude Code 插件市场兼容**
- 加载 Claude Code 第三方插件（命令、技能、Agent、MCP、hooks）
- 插件发现路径：`.claude/plugins/` 等 Claude Code 惯例路径
- 插件格式使用 OmO 定义的 `plugin.json` manifest 约定
- ⚠️ 实验性模块。Claude Code 官方无标准插件格式，且功能与 R1-R4 存在重叠。如实际生态中无可消费的插件，可考虑移除或降级

**R6. Session State — 会话状态管理**
- 维护命令/技能/Agent 的注册状态（用简单 Map/对象，不引入框架）
- 支持插件卸载时的状态清理

**R7. 配置系统**
- 支持 `~/.config/opencode/opencode.json` 和项目级 `.opencode/opencode.json` 配置
- 每个功能模块有独立开关（`claude_code.commands`, `claude_code.skills`, `claude_code.mcp` 等）
- Zod schema 验证配置
- 支持多层配置合并（项目 > 用户 > 默认）

**R8. 精简依赖**
- 保留 OmO 的 `shared/` 工具库中 Claude Code 兼容层所需的 ~25 个文件
- 不包含 posthog（遥测）、oh-my-opencode-*（OmO 二进制包）等 OmO 特有依赖
- 核心依赖：`@opencode-ai/plugin`, `@opencode-ai/sdk`, `js-yaml`, `jsonc-parser`, `@modelcontextprotocol/sdk`, `picomatch`, `zod`

**R9. 许可合规**
- 在项目中保留 OmO 的 `LICENSE.md`（Sustainable Use License）
- 在 README 中醒目注明"基于 oh-my-openagent 修改"
- 保留原始版权和许可声明

**R10. v1 向后兼容**
- 保持 v1 的核心功能（command discovery + superpowers bootstrap）不退化
- 保留 `scripts/cleanup.py` 且适配 v2 架构
- 保留 `package.json` 的导出接口

## Success Criteria

- [ ] 6 个 Claude Code 兼容模块全部提取完毕，无 OmO 特有功能残留
- [ ] commands 从 `.claude/commands/` 正确加载并出现在 `/` 自动补全
- [ ] skills 从 `.claude/skills/` 正确发现并注入 system prompt
- [ ] MCP 服务器从 `.mcp.json` 正确加载并可用
- [ ] agents 从 `.claude/agents/` 正确加载
- [ ] 插件市场兼容层正确加载 Claude Code 插件
- [ ] 每个模块可通过配置独立开关
- [ ] 项目通过 `npm install` 安装后可直接使用
- [ ] 原有 v1 用户升级后功能不退化
- [ ] 测试通过（至少保留/迁移核心 feature 模块的关键测试）
- [ ] SUL 许可合规，版权声明齐全

## Scope Boundaries

- ❌ 不包含 OmO 的 Agent 系统（Sisyphus、Hephaestus 等 11 个 agents）
- ❌ 不包含 Team Mode（团队协作功能）
- ❌ 不包含 Background Agent（后台任务系统）
- ❌ 不包含 Tmux Subagent（tmux 面板管理）
- ❌ 不包含 OpenClaw（Discord/Telegram 集成）
- ❌ 不包含 Skill MCP Manager（MCP 连接生命周期管理）
- ❌ 不包含 MCP OAuth 实现
- ❌ 不包含 OmO 特有的内置工具（call-omo-agent, delegate-task 等）
- ❌ 不包含 PostHog 遥测
- ❌ 不包含 OmO 二进制包 oh-my-opencode-*

## Key Decisions

- **提取方式**：从 OmO 源码中复制保留文件，删除/不复制剥离文件，而非基于 OmO 做继承/补丁
  - ⚠️ 93% 的代码被删除（保留 ~25 个 shared 文件 + ~80 个模块文件，共 ~350 个），存在模块间隐藏交叉引用风险
  - 替代方案（纯重写）未选中的原因：OmO 的兼容逻辑大量依赖其内部 shared 工具库，重写意味着重新实现底层基础设施（frontmatter 解析、配置加载、路径发现等），成本可能更高
- **入口重写**：`src/index.ts` 完全重写，简化入口逻辑，只初始化 Claude Code 兼容模块
- **类型解耦**：`opencode-skill-loader` 中引用 `skill-mcp-manager` 的类型改为内联，消除对剥离模块的依赖
- **配置简化**：保留 Zod schema 验证，但移除 OmO 特有的 Agent 和团队配置项
- **分支策略**：在 `v2-claude-code-compat` 分支开发，成功后合并为默认分支
- **开源合规**：复制 OmO 的 LICENSE.md，在 README 添加修改声明

## Dependencies / Assumptions

- OmO 代码库位于 `D:\WorkDev\github_repositories\oh-my-openagent`
- SUL v1.0 协议允许创建衍生作品并免费分发（非商业目的）
- OpenCode 的 `@opencode-ai/plugin` API 在 v1.4.0+ 保持稳定
- `experimental.chat.system.transform` hook 在短期内不会移除（但需关注更新）
- OmO 的部分源码使用了 Bun API（如 `Bun.file()`、`Bun.write()`），提取后需替换为 Node.js 原生 API
- `project-discovery-dirs` 使用 `git rev-parse --show-toplevel` 检测 worktree 边界，在非 git 目录中会有无界向上搜索行为
- v2 引入 TypeScript 后需要构建系统（推荐 esbuild 或 tsc）

## Outstanding Questions

### Resolve Before Planning
- ~~[Affects R10] Superpowers bootstrap 处理~~ ✅ 已决定
  - 方案：skill-loader 统一接管技能注入，废弃 `experimental.chat.system.transform` hook
  - 额外：提供 `scripts/migration-check.sh` 帮助 v1 用户检查 SKILL.md 是否在 v2 的搜索路径内

### Deferred to Planning
- [Affects R1-R6][Technical] OmO 的模块间存在交叉引用（如 `opencode-skill-loader` 引用了 `skill-mcp-manager` 的类型），具体解耦方案需在规划时明确
- [Affects R3][Technical] `.mcp.json` 的加载是否需要支持 `${VAR}` env allowlist 安全机制？从 OmO 完整保留即可
- [Affects R8][Technical] 具体保留哪些 `shared/` 文件需在提取过程中逐一确认（需做依赖图分析，建议用 madge 或 dpdm）
- [Affects R4][Technical] OpenCode 宿主是否支持 Agent 运行时？如果否，Agent Loader 加载的定义无法执行
- [Affects R5][Risk] Plugin Loader 的生态价值需要验证——能否找到 3 个以上现有 Claude Code 插件来证明该模块的存在价值？
- [Affects R10][Technical] 构建系统选型（esbuild vs tsc）及 `package.json` 入口路径变更方案

## Next Steps
→ `/ce:plan` for structured implementation planning
