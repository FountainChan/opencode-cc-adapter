import { readFileSync, writeFileSync } from "node:fs"
import type { CommandDefinition } from "./types.js"

const CC_SOURCE_PROPERTY = "__cc_source"

export function syncCommandsToFile(
  configFilePath: string,
  commands: Record<string, CommandDefinition>,
  sourceTag: string,
): void {
  const cmdCount = Object.keys(commands).length
  if (cmdCount === 0) return

  try {
    let parsed: Record<string, unknown> = {}
    try {
      const raw = readFileSync(configFilePath, "utf-8")
      parsed = JSON.parse(raw)
    } catch {
      // File doesn't exist or is invalid — start fresh
    }

    const existing: Record<string, unknown> = (parsed.command as Record<string, unknown>) || {}

    // Remove stale entries from this source
    for (const key of Object.keys(existing)) {
      const entry = existing[key] as Record<string, unknown> | undefined
      if (entry?.[CC_SOURCE_PROPERTY] === sourceTag) {
        delete existing[key]
      }
    }

    // Add fresh commands with __cc_source tagging
    for (const [name, def] of Object.entries(commands)) {
      existing[name] = {
        ...def,
        [CC_SOURCE_PROPERTY]: sourceTag,
      }
    }

    parsed.command = existing
    writeFileSync(configFilePath, JSON.stringify(parsed, null, 2), "utf-8")
    console.log(`[cc-adapter] Synced ${cmdCount} commands (${sourceTag}) to ${configFilePath}`)
  } catch (e) {
    console.error(`[cc-adapter] Failed to sync commands (${sourceTag}):`, (e as Error).message)
  }
}
