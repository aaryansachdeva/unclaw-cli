// opencode (sst / opencode.ai). Docs: opencode.ai/docs/mcp-servers, /config,
// /commands, /skills, /rules.
//   * MCP: ~/.config/opencode/opencode.json → "mcp" key. stdio = type "local";
//     `command` is a SINGLE ARRAY [cmd, ...args].
//   * Skill (native, since 2026 , the AgentSkills SKILL.md standard): a
//     ~/.config/opencode/skills/<name>/SKILL.md is model-discoverable via the
//     built-in `skill` tool. Dir name must equal the `name` frontmatter.
//   * Command: ~/.config/opencode/commands/<name>.md → /unclaw (user-typed
//     on-switch). PLURAL `commands/` is canonical; singular `command/` is a
//     back-compat alias , we write both so it works across versions.
//   * Guidance: AGENTS.md (global ~/.config/opencode/AGENTS.md).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { registerAdapter, onPath, upsertMcpJson, removeMcpJson, upsertInstructions, writeText, rmFile, rmDir, INSTRUCTIONS_BODY, COMMAND_BODY, skillMarkdown } from '../installer.mjs';
import { opencodeDir } from '../platform.mjs';

const DIR = opencodeDir();
const CFG = join(DIR, 'opencode.json');
const SKILL_DIR = join(DIR, 'skills', 'unclaw');
const SKILL = join(SKILL_DIR, 'SKILL.md'); // native `skill` tool
// Custom command → /unclaw. Canonical `commands/` (plural); `command/`
// (singular) is the back-compat alias. Write both to cover all versions.
const CMD_DIRS = [join(DIR, 'commands'), join(DIR, 'command')];
const CMD_MD = `---\ndescription: Launch UnClaw in passthrough mode and voice replies aloud.\n---\n\n${COMMAND_BODY}\n`;

registerAdapter({
  id: 'opencode',
  name: 'opencode',
  detect: () => onPath('opencode') || existsSync(DIR),
  register({ node, runtime }) {
    const mcp = upsertMcpJson(CFG, {
      rootKey: 'mcp',
      server: { type: 'local', command: [node, runtime, '--mcp'], enabled: true },
    });
    writeText(SKILL, skillMarkdown(node, runtime)); // native skill
    upsertInstructions(join(DIR, 'AGENTS.md'), INSTRUCTIONS_BODY);
    for (const d of CMD_DIRS) writeText(join(d, 'unclaw.md'), CMD_MD); // /unclaw
    return { ok: mcp.ok, detail: [mcp.detail, 'unclaw skill', 'AGENTS.md', '/unclaw'].filter(Boolean).join('; '), error: mcp.error };
  },
  unregister() {
    for (const d of CMD_DIRS) rmFile(join(d, 'unclaw.md'));
    rmDir(SKILL_DIR);
    return removeMcpJson(CFG, { rootKey: 'mcp' });
  },
});
