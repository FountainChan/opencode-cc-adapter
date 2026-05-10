import { readFileSync } from "node:fs";
import type { PluginInput, Hooks } from "@opencode-ai/plugin";
import type { CommandDefinition } from "./claude-code/command-loader/types.js";
import { loadUserCommands, loadProjectCommands } from "./claude-code/command-loader/loader.js";
import { syncCommandsToFile } from "./claude-code/command-loader/sync-to-file.js";
import { loadUserSkills, loadProjectSkills } from "./claude-code/skill-loader/loader.js";

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

  // Load commands from Claude Code directory
  const userCommands: Record<string, CommandDefinition> = {};
  const projectCommands: Record<string, CommandDefinition> = {};

  if (config.claude_code?.commands !== false) {
    try {
      const loaded = loadUserCommands();
      if (loaded) Object.assign(userCommands, loaded);
    } catch {
      // User commands directory doesn't exist
    }

    if (projectDir) {
      try {
        const loaded = loadProjectCommands(projectDir);
        if (loaded) Object.assign(projectCommands, loaded);
      } catch {
        // Project commands directory doesn't exist
      }
    }
  }

  // Merge: project commands override user commands
  const allCommands = { ...userCommands, ...projectCommands };

  // Sync commands to opencode.json for / autocomplete
  if (Object.keys(userCommands).length > 0) {
    const userConfigFile = `${configDir}/opencode.json`;
    syncCommandsToFile(userConfigFile, userCommands, "cc-adapter-user");
  }

  if (Object.keys(projectCommands).length > 0 && projectDir) {
    const projectConfigFile = `${projectDir}/.opencode/opencode.json`;
    syncCommandsToFile(projectConfigFile, projectCommands, "cc-adapter-project");
  }

  // Pre-load skill templates for injection
  const skillTemplates: string[] = [];
  if (config.claude_code?.skills !== false) {
    try {
      const skills = loadUserSkills();
      if (skills) {
        for (const skill of Object.values(skills)) {
          if (skill.template) skillTemplates.push(skill.template);
        }
      }
    } catch {
      // skill loading failed
    }
    if (projectDir) {
      try {
        const skills = loadProjectSkills(projectDir);
        if (skills) {
          for (const skill of Object.values(skills)) {
            if (skill.template) skillTemplates.push(skill.template);
          }
        }
      } catch {
        // skill loading failed
      }
    }
  }

  return {
    config: async (inputConfig) => {
      const existing = inputConfig.command || {};
      inputConfig.command = { ...existing, ...allCommands };
    },

    "experimental.chat.system.transform": async (_input, output) => {
      // Inject skill templates into system prompt
      for (const template of skillTemplates) {
        (output.system || []).push(
          `<skill_definition>\n${template}\n</skill_definition>`
        );
      }
    },
  };
}

// Re-export types for consumers
export type { CommandDefinition } from "./claude-code/command-loader/types.js";
