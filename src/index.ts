import { readFileSync } from "node:fs";
import type { PluginInput, Hooks } from "@opencode-ai/plugin";
import type { CommandDefinition } from "./claude-code/command-loader/types.js";
import { loadUserCommands, loadProjectCommands } from "./claude-code/command-loader/loader.js";
import { syncCommandsToFile } from "./claude-code/command-loader/sync-to-file.js";
import { loadUserSkills, loadProjectSkills } from "./claude-code/skill-loader/loader.js";
import { loadUserAgents, loadProjectAgents } from "./claude-code/agent-loader/loader.js";
import { discoverInstalledPlugins } from "./claude-code/plugin-loader/discovery.js";
import { loadPluginCommands } from "./claude-code/plugin-loader/command-loader.js";
import { loadPluginSkillsAsCommands } from "./claude-code/plugin-loader/skill-loader.js";

export interface CcAdapterConfig {
  claude_code?: {
    commands?: boolean;
    skills?: boolean;
    mcp?: boolean;
    agents?: boolean;
    plugins?: boolean;
    mcp_env_allowlist?: string[];
  };
}

// Simple config merge: project config overrides user config
function loadConfig(directory?: string | null): CcAdapterConfig {
  const configPaths: string[] = [];
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const xdgConfig = process.env.XDG_CONFIG_HOME || `${homeDir}/.config`;

  if (homeDir) {
    configPaths.push(`${xdgConfig}/opencode/opencode.json`);
  }

  if (directory) {
    configPaths.push(`${directory}/.opencode/opencode.json`);
  }

  let config: CcAdapterConfig = {};

  for (const configPath of configPaths) {
    try {
      const content = readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed.claude_code) {
        config = {
          ...config,
          claude_code: {
            ...config.claude_code,
            ...parsed.claude_code,
          },
        };
      }
    } catch {
      // Config file doesn't exist or invalid, skip
    }
  }

  // Apply defaults
  return {
    claude_code: {
      commands: true,
      skills: true,
      mcp: true,
      agents: false,
      plugins: false,
      ...config.claude_code,
    },
  };
}

export default function ccAdapterPlugin(
  input: PluginInput,
): Hooks {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const configDir =
    process.env.OPENCODE_CONFIG_DIR ||
    `${homeDir}/.config/opencode`;

  const projectDir = input.directory || process.cwd() || null;
  const config = loadConfig(projectDir);

  // ── Commands ──
  const userCommands: Record<string, CommandDefinition> = {};
  const projectCommands: Record<string, CommandDefinition> = {};

  if (config.claude_code?.commands !== false) {
    try {
      const loaded = loadUserCommands();
      if (loaded) Object.assign(userCommands, loaded);
    } catch {
      // User commands dir doesn't exist
    }
    if (projectDir) {
      try {
        const loaded = loadProjectCommands(projectDir);
        if (loaded) Object.assign(projectCommands, loaded);
      } catch {
        // Project commands dir doesn't exist
      }
    }
  }

  const allCommands = { ...userCommands, ...projectCommands };

  if (Object.keys(userCommands).length > 0) {
    syncCommandsToFile(`${configDir}/opencode.json`, userCommands, "cc-adapter-user");
  }
  if (Object.keys(projectCommands).length > 0 && projectDir) {
    syncCommandsToFile(`${projectDir}/.opencode/opencode.json`, projectCommands, "cc-adapter-project");
  }

  // ── Skills ──
  const skillTemplates: string[] = [];
  if (config.claude_code?.skills !== false) {
    try {
      const skills = loadUserSkills();
      if (skills) {
        for (const s of Object.values(skills)) {
          if (s.template) skillTemplates.push(s.template);
        }
      }
    } catch { /* skip */ }
    if (projectDir) {
      try {
        const skills = loadProjectSkills(projectDir);
        if (skills) {
          for (const s of Object.values(skills)) {
            if (s.template) skillTemplates.push(s.template);
          }
        }
      } catch { /* skip */ }
    }
  }

  // ── Experimental: Plugin Loader ──
  // Enable by setting "claude_code.plugins": true in opencode.json
  // Requires Claude Code plugins installed in .claude/plugins/ or ~/.claude/plugins/
  let pluginCommands: Record<string, CommandDefinition> = {};
  if (config.claude_code?.plugins === true) {
    try {
      const plugins = discoverInstalledPlugins();
      if (plugins && plugins.length > 0) {
        pluginCommands = loadPluginCommands(plugins);
        // Merge plugin commands into allCommands
        Object.assign(allCommands, pluginCommands);
      }
    } catch (e) {
      // Plugin loading failed — this is experimental, don't crash
      console.error("[cc-adapter-v2] Plugin loader error (experimental):", e);
    }
  }

  // ── Experimental: Agent Loader ──
  // Enable by setting "claude_code.agents": true in opencode.json
  // Loads agent definitions from .claude/agents/ and ~/.claude/agents/
  if (config.claude_code?.agents === true) {
    try {
      loadUserAgents();
    } catch { /* skip */ }
    if (projectDir) {
      try {
        loadProjectAgents(projectDir);
      } catch { /* skip */ }
    }
  }

  return {
    config: async (inputConfig) => {
      const existing = inputConfig.command || {};
      inputConfig.command = { ...existing, ...allCommands };
    },

    "experimental.chat.system.transform": async (_input, output) => {
      for (const template of skillTemplates) {
        (output.system || []).push(
          `<skill_definition>\n${template}\n</skill_definition>`
        );
      }
    },
  };
}

export type { CommandDefinition } from "./claude-code/command-loader/types.js";
