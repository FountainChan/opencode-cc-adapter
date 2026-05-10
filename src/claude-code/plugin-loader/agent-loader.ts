import { existsSync, readdirSync, readFileSync } from "fs"
import { basename, join } from "path"
import { parseFrontmatter } from "../../shared/frontmatter.js"
import { isMarkdownFile } from "../../shared/file-utils.js"
import { log } from "../../shared/logger.js"
import { parseToolsConfig } from "../../shared/parse-tools-config.js"
import type { AgentFrontmatter, ClaudeCodeAgentConfig } from "../agent-loader/types.js"
import { mapClaudeModelToOpenCode } from "../agent-loader/claude-model-mapper.js"
import type { LoadedPlugin } from "./types.js"

export function loadPluginAgents(plugins: LoadedPlugin[]): Record<string, ClaudeCodeAgentConfig> {
  const agents: Record<string, ClaudeCodeAgentConfig> = {}

  for (const plugin of plugins) {
    if (!plugin.agentsDir || !existsSync(plugin.agentsDir)) continue

    const entries = readdirSync(plugin.agentsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!isMarkdownFile(entry)) continue

      const agentPath = join(plugin.agentsDir, entry.name)
      const agentName = basename(entry.name, ".md")
      const namespacedName = `${plugin.name}:${agentName}`

      try {
        const content = readFileSync(agentPath, "utf-8")
        const { data, body } = parseFrontmatter<AgentFrontmatter>(content)

        const originalDescription = data.description || ""
        const formattedDescription = `(plugin: ${plugin.name}) ${originalDescription}`

        const mappedModelOverride = mapClaudeModelToOpenCode(data.model)
        const modelString = mappedModelOverride
          ? `${mappedModelOverride.providerID}/${mappedModelOverride.modelID}`
          : undefined

        const config: ClaudeCodeAgentConfig = {
          description: formattedDescription,
          mode: "subagent",
          prompt: body.trim(),
          ...(modelString ? { model: modelString } : {}),
        }

        const toolsConfig = parseToolsConfig(data.tools)
        if (toolsConfig) {
          config.tools = toolsConfig
        }

        agents[namespacedName] = config
        log(`Loaded plugin agent: ${namespacedName}`, { path: agentPath })
      } catch (error) {
        log(`Failed to load plugin agent: ${agentPath}`, error)
      }
    }
  }

  return agents
}
