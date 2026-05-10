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
  // Scan multiple possible skill locations
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

**IMPORTANT: The using-superpowers skill content is included below. It is ALREADY LOADED - you are currently following it. Do NOT use the skill tool to load "using-superpowers" again - that would be redundant.**

${content}

${toolMapping}
</EXTREMELY_IMPORTANT>`;
}

// ─── Main Plugin Export ────────────────────────────────────────────

export default async function ccAdapterPlugin({ directory }) {
  const homeDir = os.homedir();
  const envConfigDir = normalizePath(process.env.OPENCODE_CONFIG_DIR, homeDir);
  const configDir = envConfigDir || path.join(homeDir, '.config/opencode');

  // ── Load .claude/commands/ ──
  const userCommandsDir = path.join(homeDir, '.claude', 'commands');
  const projectCommandsDir = path.join(directory, '.claude', 'commands');

  const [userCommands, projectCommands] = await Promise.all([
    loadCommandsFromDir(userCommandsDir),
    loadCommandsFromDir(projectCommandsDir),
  ]);

  const allCommands = { ...userCommands, ...projectCommands };

  const cmdCount = Object.keys(allCommands).length;
  console.log(`[cc-adapter] Loaded ${cmdCount} commands from .claude/commands/`);

  // ── Return hooks ──
  return {
    name: 'cc-adapter',

    // Register .claude/commands/ as native OpenCode commands
    config: async (inputConfig) => {
      const existing = inputConfig.command || {};
      inputConfig.command = { ...existing, ...allCommands };
    },

    // Inject superpowers bootstrap into system prompt
    'experimental.chat.system.transform': async (_input, output) => {
      const bootstrap = getSuperpowersBootstrap(configDir);
      if (bootstrap) {
        (output.system ||= []).push(bootstrap);
      }
    },
  };
}
