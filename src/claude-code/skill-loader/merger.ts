import type { LoadedSkill } from "./types.js"
import type { SkillsConfig } from "./config-schema-stub.js"
import type { BuiltinSkill } from "./types.js"
import { builtinToLoadedSkill } from "./merger/builtin-skill-converter.js"
import { configEntryToLoadedSkill } from "./merger/config-skill-entry-loader.js"
import { mergeSkillDefinitions } from "./merger/skill-definition-merger.js"
import { normalizeSkillsConfig } from "./merger/skills-config-normalizer.js"
import { SCOPE_PRIORITY } from "./merger/scope-priority.js"

export interface MergeSkillsOptions {
  configDir?: string
}

export function mergeSkills(
  builtinSkills: BuiltinSkill[],
  config: SkillsConfig | undefined,
  configSourceSkills: LoadedSkill[],
  userClaudeSkills: LoadedSkill[],
  userOpencodeSkills: LoadedSkill[],
  projectClaudeSkills: LoadedSkill[],
  projectOpencodeSkills: LoadedSkill[],
  options: MergeSkillsOptions = {}
): LoadedSkill[] {
  const skillMap = new Map<string, LoadedSkill>()

  for (const builtin of builtinSkills) {
    const loaded = builtinToLoadedSkill(builtin)
    skillMap.set(loaded.name, loaded)
  }

  const normalizedConfig = normalizeSkillsConfig(config)

  for (const [name, entry] of Object.entries(normalizedConfig.entries)) {
    if (entry === false) continue
    if (entry === true) continue

    if (entry.disable) continue

    const loaded = configEntryToLoadedSkill(name, entry, options.configDir)
    if (loaded) {
      const existing = skillMap.get(name)
      if (existing && !entry.template && !entry.from) {
        skillMap.set(name, mergeSkillDefinitions(existing, entry))
      } else {
        skillMap.set(name, loaded)
      }
    }
  }

  const fileSystemSkills = [
    ...configSourceSkills,
    ...userClaudeSkills,
    ...userOpencodeSkills,
    ...projectClaudeSkills,
    ...projectOpencodeSkills,
  ]

  for (const skill of fileSystemSkills) {
    const existing = skillMap.get(skill.name)
    if (!existing || SCOPE_PRIORITY[skill.scope] > SCOPE_PRIORITY[existing.scope]) {
      skillMap.set(skill.name, skill)
    }
  }

  for (const [name, entry] of Object.entries(normalizedConfig.entries)) {
    if (entry === true) continue
    if (entry === false) {
      skillMap.delete(name)
      continue
    }
    if (entry.disable) {
      skillMap.delete(name)
      continue
    }

    const existing = skillMap.get(name)
    if (existing && !entry.template && !entry.from) {
      skillMap.set(name, mergeSkillDefinitions(existing, entry))
    }
  }

  for (const name of normalizedConfig.disable) {
    skillMap.delete(name)
  }

  if (normalizedConfig.enable.length > 0) {
    const enableSet = new Set(normalizedConfig.enable)
    for (const name of skillMap.keys()) {
      if (!enableSet.has(name)) {
        skillMap.delete(name)
      }
    }
  }

  return Array.from(skillMap.values())
}
