import { promises as fs } from "node:fs"
import { resolve } from "node:path"

import type { CommandDefinition } from "./types.js"

const commandLoaderCache = new Map<string, Promise<Record<string, CommandDefinition>>>()

export async function getCommandLoaderCacheKey(directory?: string): Promise<string> {
  const resolvedDirectory = resolve(directory ?? process.cwd())

  try {
    return await fs.realpath(resolvedDirectory)
  } catch {
    return resolvedDirectory
  }
}

export function getCachedCommands(
  cacheKey: string,
): Promise<Record<string, CommandDefinition>> | undefined {
  return commandLoaderCache.get(cacheKey)
}

export function setCachedCommands(
  cacheKey: string,
  commands: Promise<Record<string, CommandDefinition>>,
): void {
  commandLoaderCache.set(cacheKey, commands)
}

export function deleteCachedCommands(cacheKey: string): void {
  commandLoaderCache.delete(cacheKey)
}

export function clearCommandLoaderCache(): void {
  commandLoaderCache.clear()
}
