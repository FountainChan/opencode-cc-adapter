import { existsSync, readdirSync, readFileSync } from "fs"
import { join } from "path"
import { parseFrontmatter } from "../../shared/frontmatter.js"
import { resolveSymlink } from "../../shared/file-utils.js"
import { sanitizeModelField } from "../../shared/model-sanitizer.js"
import { resolveSkillPathReferences } from "../../shared/skill-path-resolver.js"
import { log } from "../../shared/logger.js"
import type { CommandDefinition } from "../command-loader/types.js"
import type { SkillMetadata } from "../skill-loader/types.js"
import type { LoadedPlugin } from "./types.js"

export function loadPluginSkillsAsCommands(
  plugins: LoadedPlugin[],
): Record<string, CommandDefinition> {
  const skills: Record<string, CommandDefinition> = {}

  for (const plugin of plugins) {
    if (!plugin.skillsDir || !existsSync(plugin.skillsDir)) continue

    const entries = readdirSync(plugin.skillsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue

      const skillPath = join(plugin.skillsDir, entry.name)
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue

      const resolvedPath = resolveSymlink(skillPath)
      const skillMdPath = join(resolvedPath, "SKILL.md")
      if (!existsSync(skillMdPath)) continue

      try {
        const content = readFileSync(skillMdPath, "utf-8")
        const { data, body } = parseFrontmatter<SkillMetadata>(content)

        const skillName = data.name || entry.name
        const namespacedName = `${plugin.name}:${skillName}`
        const originalDescription = data.description || ""
        const formattedDescription = `(plugin: ${plugin.name} - Skill) ${originalDescription}`

        const resolvedBody = resolveSkillPathReferences(body.trim(), resolvedPath)
        const wrappedTemplate = `<skill-instruction>\nBase directory for this skill: ${resolvedPath}/\nFile references (@path) in this skill are relative to this directory.\n\n${resolvedBody}\n</skill-instruction>\n\n<user-request>\n$ARGUMENTS\n</user-request>`

        const definition = {
          name: namespacedName,
          description: formattedDescription,
          template: wrappedTemplate,
          model: sanitizeModelField(data.model),
        }

        const { name: _name, ...openCodeCompatible } = definition
        skills[namespacedName] = openCodeCompatible as CommandDefinition

        log(`Loaded plugin skill: ${namespacedName}`, { path: resolvedPath })
      } catch (error) {
        log(`Failed to load plugin skill: ${skillPath}`, error)
      }
    }
  }

  return skills
}
