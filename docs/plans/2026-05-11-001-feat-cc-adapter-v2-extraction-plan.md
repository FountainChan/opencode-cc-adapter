---
title: feat: cc-adapter v2 — Claude Code 完整兼容层提取
type: feat
status: active
date: 2026-05-11
origin: docs/brainstorms/2026-05-11-cc-adapter-v2-claude-code-compat-requirements.md
---

# cc-adapter v2 — Claude Code 完整兼容层提取

## Overview

从 OmO（oh-my-openagent）源码中提取 Claude Code 兼容层（6 个 feature 模块 + 约 25 个 shared 工具），去除所有 OmO 特有功能（Agent 系统、团队协作、后台任务等），打造 cc-adapter v2.0。v1 的 269 行 JS 实现将被替换为完整的 TypeScript Claude Code 桥接插件。

## Problem Frame

cc-adapter v1 只能从 `.claude/commands/` 加载命令。Claude Code 生态的技能（skills）、MCP 服务器、Agents、插件市场在 OpenCode 中完全不可用。OmO 实现了完整的兼容层但捆绑了大量无关功能。需要提取其 Claude Code 兼容部分，做成一个纯粹、完整、可维护的独立插件。

## Requirements Trace

- R1. Command Loader — 命令发现（继承 v1 能力 + 多来源）
- R2. Skill Loader — 7 来源技能发现
- R3. MCP Loader — `.mcp.json` 加载（stdio + HTTP，不含 OAuth）
- R4. Agent Loader — Agents 定义发现
- R5. Plugin Loader — 插件市场兼容（实验性）
- R6. Session State — 注册状态管理
- R7. 配置系统 — Zod schema + 模块独立开关
- R8. 精简依赖 — 排除 OmO 特有依赖
- R9. 许可合规 — SUL License 保留
- R10. v1 向后兼容 — 命令发现 + 迁移脚本

## Scope Boundaries

- ❌ 不包含 OmO Agent 系统（Sisyphus、Hephaestus 等）
- ❌ 不包含 Team Mode / 后台任务 / Tmux / OpenClaw
- ❌ 不包含 MCP OAuth 实现
- ❌ 不包含 Skill MCP Manager
- ❌ 不包含 PostHog 遥测、OmO 二进制包

## Context & Research

### Relevant Code and Patterns

**源仓库**：`D:\WorkDev\github_repositories\oh-my-openagent`

**需要提取的 feature 模块（6 个）：**

| 模块 | 路径 | 文件数 |
|------|------|--------|
| command-loader | `src/features/claude-code-command-loader/` | 5 |
| skill-loader | `src/features/opencode-skill-loader/` | 32 |
| mcp-loader | `src/features/claude-code-mcp-loader/` | 12 |
| agent-loader | `src/features/claude-code-agent-loader/` | 12 |
| plugin-loader | `src/features/claude-code-plugin-loader/` | 17 |
| session-state | `src/features/claude-code-session-state/` | 3 |
| **小计** | | **~80** |

**需要提取的 shared 工具库（~25 个文件）：**
`frontmatter.ts`, `logger.ts`, `contains-path.ts`, `file-utils.ts`, `claude-config-dir.ts`, `opencode-config-dir.ts`, `opencode-command-dirs.ts`, `opencode-config-dir-types.ts`, `model-sanitizer.ts`, `model-format-normalizer.ts`, `model-normalization.ts`, `parse-tools-config.ts`, `jsonc-parser.ts`, `resolve-agent-definition-paths.ts`, `skill-path-resolver.ts`, `project-discovery-dirs.ts`, `plugin-identity.ts`, `excluded-dirs.ts`, `agent-display-names.ts`, `deep-merge.ts` 等

**需要剥离的目录：**
`src/agents/` (105), `src/features/team-mode/` (22), `src/features/background-agent/` (56), `src/features/tmux-subagent/` (38), `src/features/mcp-oauth/` (19), `src/features/skill-mcp-manager/` (19), `src/openclaw/` (27)

### Key Technical Context

- OmO 使用 Bun 运行时（`Bun.file()`、`Bun.write()`），需替换为 Node.js 原生 API
- OmO 的 `@opencode-ai/plugin` 依赖 >=1.4.0
- OmO 使用 `js-yaml` 解析 SKILL.md frontmatter
- `project-discovery-dirs.ts` 依赖 `git rev-parse --show-toplevel` 检测 worktree 边界
- 插件入口需要用 TypeScript 重写，输出到 `dist/`（esbuild 编译）

## Key Technical Decisions

- **构建系统**：esbuild（比 tsc 轻量，适合插件库场景，与 OmO 的 bun build 不同但输出等效）
- **TypeScript 严格度**：`strict: true`，保留 OmO 源码的原始类型定义
- **输出结构**：TypeScript 源码在 `src/`，编译输出到 `dist/`，`main` 指向 `dist/index.js`
- **Bun API 替换**：`Bun.file().text()` → `fs.promises.readFile(…, 'utf-8')`；`Bun.write()` → `fs.promises.writeFile()`
- **类型解耦**：`SkillMcpConfig` 类型内联到 `opencode-skill-loader`，移除 OAuth 相关字段
- **配置简化**：保留 Zod 验证但移除 Agent/Team 特有配置项
- **技能注入**：skill-loader 统一接管，废弃 `experimental.chat.system.transform` hook
- **测试框架**：vitest（Node.js 兼容，API 与 Bun test 相似）

## Open Questions

### Resolved During Planning

- Superpowers bootstrap → skill-loader 统一接管 + migration-check.sh
- R3 OAuth → 移除，标注"暂不支持"
- 构建系统 → esbuild
- 测试框架 → vitest

### Deferred to Implementation

- [Affects R1-R6] 具体 shared/ 文件保留清单 → 需做依赖图分析（`madge` 或 `dpdm`）确认
- [Affects R4] OpenCode 宿主是否支持 Agent 运行时 → 需在运行时验证
- [Affects R5] Plugin Loader 的生态价值 → 作为实验性模块保留，实际可消费插件需在实现时发现
- [Affects R10] 具体 package.json 入口路径 → 实现时按 esbuild 输出配置

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
cc-adapter v2 目录结构（提取后）：

opencode-cc-adapter/
├── package.json              # 重写：type:module + deps
├── tsconfig.json             # 新建
├── LICENSE.md                # 从 OmO 复制（SUL）
├── README.md                 # 重写
├── scripts/
│   ├── cleanup.py            # 更新：适配 v2 架构
│   └── migration-check.sh    # 新建：v1→v2 迁移检查
├── src/
│   ├── index.ts              # ★ 重写：插件入口
│   ├── plugin-config.ts      # 提取自 OmO（简化）
│   ├── claude-code/
│   │   ├── command-loader/   # 提取自 OmO
│   │   ├── skill-loader/     # 提取自 OmO（内联 SkillMcpConfig）
│   │   ├── mcp-loader/       # 提取自 OmO（Bun→Node）
│   │   ├── agent-loader/     # 提取自 OmO
│   │   ├── plugin-loader/    # 提取自 OmO
│   │   └── session-state/    # 提取自 OmO
│   ├── shared/               # 提取自 OmO（~25 文件）
│   └── config/               # 提取自 OmO（简化 schema）
└── dist/                     # esbuild 编译输出
```

**插件初始化流程（提取后）：**

```typescript
// src/index.ts — 简化版入口
export default function ccAdapterPlugin(input: PluginInput): Hooks {
  // 1. 加载配置（项目级 + 用户级合并）
  const config = loadConfig(input);
  
  // 2. 初始化 6 个模块（受 config 开关控制）
  const commandLoader = config.commands ? new CommandLoader(input) : null;
  const skillLoader = config.skills ? new SkillLoader(input) : null;
  const mcpLoader = config.mcp ? new McpLoader(input) : null;
  const agentLoader = config.agents ? new AgentLoader(input) : null;
  const pluginLoader = config.plugins ? new PluginLoader(input) : null;
  const sessionState = new SessionState();
  
  // 3. 返回 hooks
  return {
    config: async (cfg) => {
      // 注入命令 / 配置
      commandLoader?.syncToConfig(cfg);
      pluginLoader?.syncToConfig(cfg);
    },
    'experimental.chat.system.transform': async (_, output) => {
      // skill-loader 统一接管技能注入
      skillLoader?.injectSkills(output);
    },
  };
}
```

**数据流：**

```
OpenCode 启动
  → 插件加载
    → loadConfig() 合并项目/用户配置
    → 各模块 init()（受开关控制）
    → config hook: 命令注入 + 自动补全同步
    → system.transform hook: 技能注入
  → OpenCode 根据配置启用/禁用各模块
```

## Implementation Units

- [ ] **Unit 1: 依赖分析 + 构建系统搭建**

**Goal:** 确定 OmO shared/ 工具的精确保留清单，搭建 esbuild + TypeScript 构建流水线

**Requirements:** R7, R8, R10

**Dependencies:** None

**Files:**
- Create: `tsconfig.json`
- Create: `package.json`（重写）
- Modify: `.gitignore`（添加 `dist/`）
- Tools: `madge` 或 `dpdm` 在 OmO 代码库上运行

**Approach:**
- 在 OmO 代码库上运行 `madge` 或 `dpdm`，生成从保留 feature 模块出发的依赖图
- 只包含被 feature 模块直接或间接引用的 shared/ 文件
- 过滤掉引用 OmO 特有模块（agents/、team-mode/等）的依赖
- package.json 更新：`"type": "module"`, `"main": "dist/index.js"`, 添加 deps
- tsconfig.json: `strict: true`, `target: ES2022`, `module: NodeNext`

**Test scenarios:**
- 依赖图分析完成后，确认每个保留的 shared 文件至少被一个 feature 模块引用
- 确认没有保留文件引用被剥离的模块（agents/、team-mode/等）

**Verification:**
- `npm install` 成功安装所有依赖
- `npx esbuild src/index.ts` 成功编译输出到 `dist/`

---

- [ ] **Unit 2: shared/ 工具库提取 + Bun API 替换**

**Goal:** 复制、清理并适配 OmO 的 shared 工具文件到 cc-adapter

**Requirements:** R8

**Dependencies:** Unit 1

**Files:**
- Create: `src/shared/` 目录下的所有保留文件
- Source: OmO 的 `src/shared/` 对应文件

**Approach:**
- 复制 Unit 1 确定的 shared 文件清单
- 全文搜索 `Bun.` 调用并替换为 Node.js 原生 API：
  - `Bun.file(path).text()` → `fs.promises.readFile(path, 'utf-8')`
  - `Bun.write(path, content)` → `fs.promises.writeFile(path, content)`
  - `Bun.spawn()` → `child_process.spawn()`
  - `import.meta.dir` → ESM `dirname` 兼容写法
- 在 `logger.ts` 中移除 PostHog 遥测调用（如有）
- 在 `agent-display-names.ts` 中移除 OmO 特有 Agent 名称（Sisyphus, Hephaestus等），只保留必要的显示名

**Patterns to follow:**
- OmO shared/ 文件的已有 API 签名（保持导出接口不变）
- Node.js `fs/promises` 官方文档

**Verification:**
- 每个文件在 `node` 下能 import 成功（不报模块未找到）
- 没有 `Bun.` 调用残留

---

- [ ] **Unit 3: command-loader 提取**

**Goal:** 复制 claude-code-command-loader，适配 cc-adapter 的 syncCommandsToFile() 机制

**Requirements:** R1, R10

**Dependencies:** Unit 2

**Files:**
- Create: `src/claude-code/command-loader/`（从 OmO 复制）
- Modify: `src/claude-code/command-loader/loader.ts`
- Source: `src/features/claude-code-command-loader/`（OmO）

**Approach:**
- 复制所有源文件（不包括测试文件）
- 导入路径从 OmO 的内部路径改为指向 `src/shared/`
- 将 cc-adapter v1 的 `syncCommandsToFile()` 逻辑整合进来
- 保留 v1 的分层写入策略（用户→全局 opencode.json，项目→本地 .opencode/opencode.json）
- 确保命令的 `__cc_source` 标记兼容 cleanup.py

**Patterns to follow:**
- cc-adapter v1 `src/index.js` 中的 `syncCommandsToFile()` 和 `loadCommandsFromDir()` 逻辑
- OmO 的 `claude-code-command-loader/loader.ts` 的发现逻辑

**Test scenarios:**
- 从 `.claude/commands/` 加载命令，验证注册到 OpenCode 自动补全
- 用户级命令（`~/.claude/commands/`）vs 项目级命令（`.claude/commands/`），验证项目级优先级更高
- 子目录嵌套命令（如 `tools/format.md`→`tools/format`）正确解析
- 多级目录命令正确合并
- 修改命令文件后重启 OpenCode，新命令出现在 `/` 自动补全

---

- [ ] **Unit 4: skill-loader 提取 + 类型解耦**

**Goal:** 复制 opencode-skill-loader，内联 SkillMcpConfig 类型，移除对 skill-mcp-manager 的依赖

**Requirements:** R2, R10

**Dependencies:** Unit 2

**Files:**
- Create: `src/claude-code/skill-loader/`（从 OmO 复制）
- Modify: `src/claude-code/skill-loader/types.ts`（内联 SkillMcpConfig）
- Source: `src/features/opencode-skill-loader/`（OmO）

**Approach:**
- 复制所有源文件（不包括测试文件、不包括 team-mode 相关 skill）
- 在 `types.ts` 中内联 `SkillMcpConfig` 类型定义，移除 OAuth 相关字段，只保留 stdio 和 HTTP 结构
- 导入路径调整为指向 `src/shared/`
- skill-loader 接管 system prompt 注入（废弃 v1 的 `experimental.chat.system.transform` hook）

**Patterns to follow:**
- OmO 的 `opencode-skill-loader/types.ts` 中的类型定义（内联后简化）
- OmO 的 `opencode-skill-loader/loader.ts` 中的发现逻辑

**Test scenarios:**
- 从 `.claude/skills/` 发现一个 SKILL.md，验证其 frontmatter 被正确解析
- 7 个来源的优先级测试：项目级 `.opencode/skills/` > 项目级 `.claude/skills/` > 用户级
- 同名技能覆盖：高优先级来源覆盖低优先级
- 系统 prompt 注入后，LLM 能感知技能的存在
- 不含 OAuth 相关类型定义（编译通过验证）

---

- [ ] **Unit 5: mcp-loader 提取**

**Goal:** 复制 claude-code-mcp-loader，替换 Bun API，移除 OAuth 引用

**Requirements:** R3

**Dependencies:** Unit 2

**Files:**
- Create: `src/claude-code/mcp-loader/`（从 OmO 复制）
- Modify: `src/claude-code/mcp-loader/loader.ts`（Bun→Node）
- Source: `src/features/claude-code-mcp-loader/`（OmO）

**Approach:**
- 复制所有源文件（不包括测试文件）
- 替换 `Bun.file(path).text()` 为 `fs.promises.readFile(path, 'utf-8')`
- 保留 `${VAR}` 环境变量展开机制 + allowlist 安全机制
- 保留 stdio 和 HTTP 两类 MCP 支持
- 移除 OAuth 相关代码路径（仅保留 `mcpEnvAllowlist` 安全机制）

**Patterns to follow:**
- OmO 的 `claude-code-mcp-loader/loader.ts` 和 `env-expander.ts`
- OmO 的 `claude-code-mcp-loader/configure-allowed-env-vars.ts`

**Test scenarios:**
- 加载一个标准 `.mcp.json` 文件，验证 MCP 服务器配置被正确解析
- `${VAR}` 环境变量展开正确
- allowlist 机制：未允许的 env var 不展开
- OAuth 配置被忽略（不会报错）
- HTTP 端点和 stdio 命令两种 MCP 类型都正确加载

---

- [ ] **Unit 6: agent-loader + plugin-loader + session-state 提取**

**Goal:** 复制剩余 3 个模块，处理各自的解耦需求

**Requirements:** R4, R5, R6

**Dependencies:** Unit 2

**Files:**
- Create: `src/claude-code/agent-loader/`（从 OmO 复制）
- Create: `src/claude-code/plugin-loader/`（从 OmO 复制）
- Create: `src/claude-code/session-state/`（从 OmO 复制）
- Source: 对应 OmO 的 `src/features/` 子目录

**Approach:**
- agent-loader：复制，保留 frontmatter 和 JSON 两种格式，标注为实验性（依赖 OpenCode 宿主支持）
- plugin-loader：复制，保留 plugin.json manifest 解析，标注为实验性（Claude Code 无标准插件格式）
- session-state：复制，简化为使用 Map/对象的轻量注册中心
- 所有导入路径调整为指向 `src/shared/`

**Test scenarios:**
- agent-loader：加载 `.claude/agents/` 中的 Agent 定义文件
- plugin-loader：加载 `.claude/plugins/` 中的 plugin.json
- session-state：注册一个 command，查询到已注册，卸载后查询不到

---

- [ ] **Unit 7: 插件入口重写 + 配置系统**

**Goal:** 重写 `src/index.ts`，串联所有模块，实现 Zod 配置系统的简化版本

**Requirements:** R7, R10

**Dependencies:** Unit 3, 4, 5, 6

**Files:**
- Create: `src/index.ts`（重写）
- Create: `src/plugin-config.ts`（提取自 OmO，简化）
- Create: `src/config/`（提取自 OmO，移除 Agent/Team 配置）
- Source: OmO 的 `src/index.ts`、`src/plugin-config.ts`、`src/config/schema/`

**Approach:**
- 插件入口 TS 重写，只引用保留的 6 个模块
- 移除所有 OmO Agent 初始化和工具注册逻辑
- 配置系统从 OmO 的 Zod schema 中只保留 `claude_code` 相关字段和模块开关
- 每个模块通过 `claude_code.{feature}` 配置项独立开关
- 保留实验性 system.transform hook，但由 skill-loader 填充内容

**Patterns to follow:**
- OmO 的 `src/index.ts` 的插件入口模式（`config` hook + `system.transform` hook）
- OmO 的 `src/plugin-config.ts` 的多层配置合并逻辑

**Configuration schema（简化版）：**
```typescript
const ConfigSchema = z.object({
  claude_code: z.object({
    commands: z.boolean().default(true),
    skills: z.boolean().default(true),
    mcp: z.boolean().default(true),
    agents: z.boolean().default(false),     // 默认关闭（实验性）
    plugins: z.boolean().default(false),    // 默认关闭（实验性）
    mcp_env_allowlist: z.array(z.string()).optional(),
  }).optional(),
})
```

**Test scenarios:**
- 全部模块开启：所有 6 个模块初始化成功
- 部分关闭：`claude_code.commands: false` 时 command-loader 不初始化
- 配置合并：项目级 `.opencode/opencode.json` 覆盖用户级 `~/.config/opencode/opencode.json`
- 无配置时使用默认值（全部开启）

---

- [ ] **Unit 8: 许可合规 + 文档 + 迁移脚本**

**Goal:** 处理 SUL 许可合规，更新文档，创建 v1→v2 迁移脚本

**Requirements:** R9, R10

**Dependencies:** Unit 1 (package.json)

**Files:**
- Create: `LICENSE.md`（复制自 OmO）
- Create: `scripts/migration-check.sh`（新建）
- Modify: `README.md`（重写）
- Modify: `scripts/cleanup.py`（更新以兼容 v2 架构）

**Approach:**
- LICENSE.md：从 OmO 原样复制 Sustainable Use License v1.0
- README.md：添加"基于 oh-my-openagent 修改"声明，更新安装/卸载说明，标注 v2 新增功能
- migration-check.sh：
  1. 检查 v1 的 `.claude/commands/` 是否存在
  2. 检查用户是否有 Superpowers SKILL.md 在非标准路径
  3. 检查 `.opencode/opencode.json` 中是否有 v1 残留的 `__cc_source` 标记
  4. 输出迁移报告和建议
- cleanup.py：更新为 v2 架构（新的 `__cc_source` 标记值，新的配置文件路径）

**Patterns to follow:**
- OmO 的 LICENSE.md（直接复制）
- cc-adapter v1 的 cleanup.py 和 README.md 风格

**Verification:**
- `npm pack` 打包后的包中包含 LICENSE.md
- README 中醒目位置可见"基于 oh-my-openagent 修改"
- migration-check.sh 在 v1 安装环境下能检测到并给出建议
- cleanup.py 能正确清理 v2 的命令条目

---

## System-Wide Impact

- **Interaction graph**：插件入口简化，从 OmO 的 10 个 hook handler 降为 2 个（config + system.transform）
- **Error propagation**：各模块独立初始化，一个模块失败不影响其他模块（错误日志 + 跳过）
- **State lifecycle**：session-state 在插件加载时初始化，卸载时清理；无持久化状态
- **API surface parity**：v1 用户可以通过 migration-check.sh 评估升级影响
- **Unchanged invariants**：`.claude/commands/` 发现功能保持不变，`syncCommandsToFile()` 机制保持不变，命令的 `__cc_source` 标记机制保持不变

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| OmO 模块间隐藏交叉引用导致提取后编译失败 | Unit 1 先做依赖图分析；迭代提取，每个模块提取后先编译验证 |
| OpenCode 的 `experimental.*` hook 在开发期间被移除 | Skill-loader 作为备选方案直接修改 system prompt 注入，不依赖特定 hook |
| Bun API 替换遗漏 | 全局搜索 `Bun.` 模式，编译时通过类型检查捕获 |
| 提取后的 shared/ 文件包含对剥离模块的引用 | 依赖图分析过滤 + 编译时验证（报模块未找到即发现） |
| SUL 许可证的商业使用边界不清晰 | 当前明确为非商业个人使用；如未来需要商业使用，另行评估 |

## Documentation / Operational Notes

- `README.md` 需包含：安装方式、v1→v2 升级步骤、配置项说明、模块开关说明
- `migration-check.sh` 需添加 `--help` 和 `--verbose` 参数
- 发布时注意 `npm pack` 确认不包含 `.git/`、`docs/` 等非必要文件

## Sources & References

- **Origin document:** `docs/brainstorms/2026-05-11-cc-adapter-v2-claude-code-compat-requirements.md`
- **OmO source:** `D:\WorkDev\github_repositories\oh-my-openagent`
- **cc-adapter v1:** `D:\WorkDev\MyShare\opencode-cc-adapter` (current repo, `master` branch)
- **OpenCode plugin API:** `@opencode-ai/plugin` >= v1.4.0
- **OmO license:** SUL v1.0 (Sustainable Use License)
