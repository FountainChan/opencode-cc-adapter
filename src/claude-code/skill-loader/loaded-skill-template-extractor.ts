import { readFileSync } from "node:fs"
import { parseFrontmatter } from "../../shared/frontmatter.js"
import type { LoadedSkill } from "./types.js"

export function extractSkillTemplate(skill: LoadedSkill): string {
  if (skill.scope === "config" && skill.definition.template) {
    return skill.definition.template
  }

  if (skill.path) {
    const content = readFileSync(skill.path, "utf-8")
    const { body } = parseFrontmatter(content)
		return body.trim()
	}
	return skill.definition.template || ""
}
