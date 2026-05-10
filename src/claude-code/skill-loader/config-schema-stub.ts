export type BrowserAutomationProvider = "playwright" | "agent-browser" | "dev-browser" | "playwright-cli";

export interface GitMasterConfig {
  commit_footer?: boolean | string;
  include_co_authored_by?: boolean;
  git_env_prefix?: string;
}

const GIT_ENV_ASSIGNMENT_PATTERN = /^(?:[A-Za-z_][A-Za-z0-9_]*=[A-Za-z0-9_-]*)(?: [A-Za-z_][A-Za-z0-9_]*=[A-Za-z0-9_-]*)*$/;

export function assertValidGitEnvPrefix(value: string): string {
  if (value === "") return value;
  if (!GIT_ENV_ASSIGNMENT_PATTERN.test(value)) {
    throw new Error('git_env_prefix must be empty or use shell-safe env assignments like "GIT_MASTER=1"');
  }
  return value;
}

export interface SkillDefinition {
  description?: string;
  template?: string;
  from?: string;
  model?: string;
  agent?: string;
  subtask?: boolean;
  "argument-hint"?: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, unknown>;
  "allowed-tools"?: string[];
  disable?: boolean;
}

export type SkillsConfig = string[] | {
  sources?: Array<string | { path: string; recursive?: boolean; glob?: string }>;
  enable?: string[];
  disable?: string[];
  [key: string]: unknown;
};
