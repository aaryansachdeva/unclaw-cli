// OpenAI Codex CLI. Docs: developers.openai.com/codex/config-reference,
// /codex/mcp, /codex/guides/agents-md.
//   * Recommended: `codex mcp add <name> -- <cmd> <args>` (writes config.toml).
//   * Config: ~/.codex/config.toml → [mcp_servers.unclaw] command/args (TOML).
//   * Guidance: AGENTS.md (Codex reads ~/.codex/AGENTS.md + per-dir).
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { registerAdapter, onPath, runAgentCli, upsertMcpToml, upsertInstructions, writeText, rmFile, INSTRUCTIONS_BODY, COMMAND_BODY } from '../installer.mjs';

const DIR = join(homedir(), '.codex');
// Codex custom prompts: top-level Markdown in ~/.codex/prompts/, invoked as
// /prompts:unclaw. NOTE: this feature is deprecated (Codex steers to "skills")
// and had a regression in 0.117.0 , the MCP tools + AGENTS.md are the reliable
// path; this is a bonus for versions that still show it.
const CMD = join(DIR, 'prompts', 'unclaw.md');
const CMD_MD = `---\ndescription: Launch UnClaw in passthrough mode and voice replies aloud.\n---\n\n${COMMAND_BODY}\n`;

registerAdapter({
  id: 'codex',
  name: 'Codex CLI',
  detect: () => onPath('codex') || existsSync(DIR),
  register({ node, runtime }) {
    const mcp = onPath('codex')
      ? runAgentCli('codex', ['mcp', 'add', 'unclaw', '--', node, runtime, '--mcp'])
      : upsertMcpToml(join(DIR, 'config.toml'), { node, runtime });
    upsertInstructions(join(DIR, 'AGENTS.md'), INSTRUCTIONS_BODY);
    writeText(CMD, CMD_MD); // /prompts:unclaw
    return { ok: mcp.ok, detail: [mcp.detail, 'AGENTS.md', '/prompts:unclaw'].filter(Boolean).join('; '), error: mcp.error };
  },
  unregister() {
    rmFile(CMD);
    if (onPath('codex')) { try { runAgentCli('codex', ['mcp', 'remove', 'unclaw']); } catch { /* ignore */ } }
    return { ok: true, detail: 'removed (config.toml table left if hand-added)' };
  },
});
