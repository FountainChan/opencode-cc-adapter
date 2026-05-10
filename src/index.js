import fs from 'fs';
import path from 'path';
import os from 'os';

// ─── Frontmatter Parser ────────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: content };

  const frontmatterStr = match[1];
  const body = match[2];
  const data = {};

  for (const line of frontmatterStr.split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      data[key] = value;
    }
  }

  return { data, body };
}

function extractAndStripFrontmatter(content) {
  const { data, body } = parseFrontmatter(content);
  return { frontmatter: data, content: body };
}

// ─── Path Normalizer ───────────────────────────────────────────────

function normalizePath(p, homeDir) {
  if (!p || typeof p !== 'string') return null;
  let normalized = p.trim();
  if (!normalized) return null;
  if (normalized.startsWith('~/')) {
    normalized = path.join(homeDir, normalized.slice(2));
  } else if (normalized === '~') {
    normalized = homeDir;
  }
  return path.resolve(normalized);
}

// ─── Commands Loader ───────────────────────────────────────────────

async function loadCommandsFromDir(commandsDir) {
  try {
    await fs.promises.access(commandsDir);
  } catch {
    return {};
  }

  const result = {};

  async function scanDir(dir, prefix = '') {
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await scanDir(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name);
        continue;
      }

      if (!entry.name.endsWith('.md')) continue;

      const commandName = prefix
        ? `${prefix}/${path.basename(entry.name, '.md')}`
        : path.basename(entry.name, '.md');

      try {
        const content = await fs.promises.readFile(fullPath, 'utf-8');
        const { data, body } = parseFrontmatter(content);

        const template = `<command-instruction>\n${body.trim()}\n</command-instruction>\n\n<user-request>\n$ARGUMENTS\n</user-request>`;

        result[commandName] = {
          template,
          description: data.description || '',
          subtask: data.subtask === 'true' ? true : undefined,
        };
      } catch (err) {
        console.error(`[cc-adapter] Failed to parse command ${fullPath}:`, err.message);
      }
    }
  }

  await scanDir(commandsDir);
  return result;
}

// ─── Superpowers Bootstrap ─────────────────────────────────────────

function getSuperpowersBootstrap(configDir) {
  const homeDir = os.homedir();
  const searchDirs = [
    path.join(configDir, 'skills', 'superpowers'),
    path.join(configDir, 'superpowers', 'skills'),
  ];

  let skillPath = null;
  for (const dir of searchDirs) {
    const candidate = path.join(dir, 'using-superpowers', 'SKILL.md');
    if (fs.existsSync(candidate)) {
      skillPath = candidate;
      break;
    }
  }

  if (!skillPath) return null;

  const fullContent = fs.readFileSync(skillPath, 'utf-8');
  const { content } = extractAndStripFrontmatter(fullContent);

  const toolMapping = `**Tool Mapping for OpenCode:**
When skills reference tools you don't have, substitute OpenCode equivalents:
- \`TodoWrite\` → \`update_plan\`
- \`Task\` tool with subagents → Use OpenCode's subagent system (@mention)
- \`Skill\` tool → OpenCode's native \`skill\` tool
- \`Read\`, \`Write\`, \`Edit\`, \`Bash\` → Your native tools

**Skills location:**
Superpowers skills are in \`${configDir}/skills/superpowers/\`
Use OpenCode's native \`skill\` tool to list and load skills.`;

  return `<EXTREMELY_IMPORTANT>
You have superpowers.

**IMPORTANT: The using-superpowers skill content is included below. It is ALREADY LOADED - you are currently doing so. Do NOT use the skill tool to load "using-superpowers" again - that would be redundant.**

${content}

${toolMapping}
</EXTREMELY_IMPORTANT>`;
}

// ─── Sync commands to a specific opencode.json ─────────────────────
// Merges commands into the "command" field, tagging them so stale entries
// can be cleaned up on next load.

function syncCommandsToFile(configFilePath, commands, sourceTag) {
  const cmdCount = Object.keys(commands).length;
  if (cmdCount === 0) return;

  try {
    let parsed = {};
    try {
      const raw = fs.readFileSync(configFilePath, 'utf-8');
      parsed = JSON.parse(raw);
    } catch {
      // File doesn't exist or is invalid — start fresh
    }

    const existing = parsed.command || {};

    // Remove stale entries from this source
    for (const key of Object.keys(existing)) {
      if (existing[key]?.__cc_source === sourceTag) {
        delete existing[key];
      }
    }

    // Add fresh commands
    for (const [name, def] of Object.entries(commands)) {
      existing[name] = {
        ...def,
        __cc_source: sourceTag,
      };
    }

    parsed.command = existing;
    fs.writeFileSync(configFilePath, JSON.stringify(parsed, null, 2), 'utf-8');
    console.log(`[cc-adapter] Synced ${cmdCount} commands (${sourceTag}) to ${configFilePath}`);
  } catch (e) {
    console.error(`[cc-adapter] Failed to sync commands (${sourceTag}):`, e.message);
  }
}

// ─── Main Plugin Export ────────────────────────────────────────────

export default async function ccAdapterPlugin({ directory }) {
  const homeDir = os.homedir();
  const envConfigDir = normalizePath(process.env.OPENCODE_CONFIG_DIR, homeDir);
  const configDir = envConfigDir || path.join(homeDir, '.config/opencode');

  // ── Load commands from both locations ──
  const userCommandsDir = path.join(homeDir, '.claude', 'commands');
  const projectCommandsDir = path.join(directory || '', '.claude', 'commands');

  const [userCommands, projectCommands] = await Promise.all([
    loadCommandsFromDir(userCommandsDir),
    loadCommandsFromDir(projectCommandsDir),
  ]);

  const allCommands = { ...userCommands, ...projectCommands };

  // ── Sync to config files for Desktop UI autocomplete ──
  //
  // Layer 1: User-level commands → global opencode.json (always available)
  //   These are global by nature (in ~/.claude/commands/), safe to persist.
  //
  // Layer 2: Project-level commands → local .opencode/opencode.json
  //   These are scoped to the current project and won't leak to other projects.
  //   opencode merges local config over global, so project commands take precedence.

  syncCommandsToFile(
    path.join(configDir, 'opencode.json'),
    userCommands,
    'cc-adapter-user',
  );

  if (directory) {
    syncCommandsToFile(
      path.join(directory, '.opencode', 'opencode.json'),
      projectCommands,
      'cc-adapter-project',
    );
  }

  // ── Return hooks ──
  return {
    name: 'cc-adapter',

    // Inject all commands into runtime config (for LLM system prompt injection)
    config: async (inputConfig) => {
      const existing = inputConfig.command || {};
      inputConfig.command = { ...existing, ...allCommands };
    },

    // Inject superpowers bootstrap into system prompt
    'experimental.chat.system.transform': async (_input, output) => {
      const bootstrap = getSuperpowersBootstrap(configDir);
      if (bootstrap) {
        (output.system || []).push(bootstrap);
      }
    },
  };
}
