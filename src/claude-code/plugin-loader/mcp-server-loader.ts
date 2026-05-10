import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import type { McpServerConfig } from "../mcp-loader/types.js"
import { expandEnvVarsInObject } from "../mcp-loader/env-expander.js"
import { shouldLoadMcpServer } from "../mcp-loader/scope-filter.js"
import { transformMcpServer } from "../mcp-loader/transformer.js"
import type { ClaudeCodeMcpConfig } from "../mcp-loader/types.js"
import { log } from "../../shared/logger.js"
import type { LoadedPlugin } from "./types.js"
import { resolvePluginPaths } from "./plugin-path-resolver.js"

export async function loadPluginMcpServers(
  plugins: LoadedPlugin[],
): Promise<Record<string, McpServerConfig>> {
  const servers: Record<string, McpServerConfig> = {}
  const cwd = process.cwd()

  for (const plugin of plugins) {
    if (!plugin.mcpPath || !existsSync(plugin.mcpPath)) continue

    try {
      const content = await readFile(plugin.mcpPath, "utf-8")
      let config = JSON.parse(content) as ClaudeCodeMcpConfig

      config = resolvePluginPaths(config, plugin.installPath)
      config = expandEnvVarsInObject(config)

      if (!config.mcpServers) continue

      for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
        if (!shouldLoadMcpServer(serverConfig, cwd)) {
          log(`Skipping local plugin MCP server "${name}" outside current cwd`, {
            path: plugin.mcpPath,
            projectPath: serverConfig.projectPath,
            cwd,
          })
          continue
        }

        if (serverConfig.disabled) {
          log(`Skipping disabled MCP server "${name}" from plugin ${plugin.name}`)
          continue
        }

        try {
          const transformed = transformMcpServer(name, serverConfig)
          const namespacedName = `${plugin.name}:${name}`
          servers[namespacedName] = transformed
          log(`Loaded plugin MCP server: ${namespacedName}`, { path: plugin.mcpPath })
        } catch (error) {
          log(`Failed to transform plugin MCP server "${name}"`, error)
        }
      }
    } catch (error) {
      log(`Failed to load plugin MCP config: ${plugin.mcpPath}`, error)
    }
  }

  return servers
}
