// Google Gemini CLI. Docs: github.com/google-gemini/gemini-cli docs/tools/
// mcp-server.md, docs/cli/gemini-md.md.
//   * Config: ~/.gemini/settings.json → "mcpServers" (standard shape, no
//     `type` for stdio). We write the file directly (robust; the `gemini mcp
//     add` CLI can mis-parse a trailing `--mcp` arg).
//   * Guidance: GEMINI.md (~/.gemini/GEMINI.md).
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { registerAdapter, onPath, upsertMcpJson, removeMcpJson, upsertInstructions, writeText, rmFile, INSTRUCTIONS_BODY, COMMAND_BODY } from '../installer.mjs';

const DIR = join(homedir(), '.gemini');
const CFG = join(DIR, 'settings.json');
const CMD = join(DIR, 'commands', 'unclaw.toml'); // → /unclaw

// TOML: literal multi-line string ('''...''') so backticks/newlines pass
// through verbatim (COMMAND_BODY contains no ''').
const CMD_TOML =
  'description = "Launch UnClaw in passthrough mode and voice replies via the speak tool."\n'
  + `prompt = '''\n${COMMAND_BODY}\n'''\n`;

registerAdapter({
  id: 'gemini',
  name: 'Gemini CLI',
  detect: () => onPath('gemini') || existsSync(DIR),
  register({ server }) {
    const mcp = upsertMcpJson(CFG, { server }); // { command, args }
    upsertInstructions(join(DIR, 'GEMINI.md'), INSTRUCTIONS_BODY);
    writeText(CMD, CMD_TOML); // /unclaw
    return { ok: mcp.ok, detail: [mcp.detail, 'GEMINI.md', '/unclaw'].filter(Boolean).join('; '), error: mcp.error };
  },
  unregister: () => { rmFile(CMD); return removeMcpJson(CFG); },
});
