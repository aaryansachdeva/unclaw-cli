// opencode (sst / opencode.ai). Docs: opencode.ai/docs/mcp-servers, /config,
// /rules.
//   * No `mcp add` CLI , edit config JSON.
//   * Config: ~/.config/opencode/opencode.json → "mcp" key. stdio = type
//     "local"; `command` is a SINGLE ARRAY [cmd, ...args].
//   * Guidance: AGENTS.md (global ~/.config/opencode/AGENTS.md).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { registerAdapter, onPath, upsertMcpJson, removeMcpJson, upsertInstructions, writeText, rmFile, INSTRUCTIONS_BODY, COMMAND_BODY } from '../installer.mjs';
import { opencodeDir } from '../platform.mjs';

const DIR = opencodeDir();
const CFG = join(DIR, 'opencode.json');
// opencode custom command → /unclaw. Docs use `commands/` (plural); the repo
// ships `command/` (singular, still accepted). Write both so it works across
// versions.
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
    upsertInstructions(join(DIR, 'AGENTS.md'), INSTRUCTIONS_BODY);
    for (const d of CMD_DIRS) writeText(join(d, 'unclaw.md'), CMD_MD); // /unclaw
    return { ok: mcp.ok, detail: [mcp.detail, 'AGENTS.md', '/unclaw'].filter(Boolean).join('; '), error: mcp.error };
  },
  unregister() {
    for (const d of CMD_DIRS) rmFile(join(d, 'unclaw.md'));
    return removeMcpJson(CFG, { rootKey: 'mcp' });
  },
});
