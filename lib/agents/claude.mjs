// Claude Code (Anthropic). Docs: code.claude.com/docs/en/mcp, /memory.
//   * Recommended: `claude mcp add --scope user <name> -- <cmd> <args>`
//     (user scope = available in every project). `--` separates flags from
//     the server argv, so `--mcp` passes through cleanly.
//   * Guidance: CLAUDE.md (~/.claude/CLAUDE.md, user memory).
// (The richer `/unclaw` skill , launch + speak , ships separately; the MCP
//  server's `launch_unclaw` + `speak` tools cover the same ground here.)
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { registerAdapter, onPath, runAgentCli, upsertInstructions, INSTRUCTIONS_BODY } from '../installer.mjs';

const DIR = join(homedir(), '.claude');

registerAdapter({
  id: 'claude',
  name: 'Claude Code',
  detect: () => onPath('claude') || existsSync(DIR) || existsSync(join(homedir(), '.claude.json')),
  register({ node, runtime }) {
    const mcp = onPath('claude')
      ? runAgentCli('claude', ['mcp', 'add', '--scope', 'user', 'unclaw', '--', node, runtime, '--mcp'])
      : { ok: false, detail: 'claude CLI not on PATH , run `claude mcp add` manually' };
    const guide = upsertInstructions(join(DIR, 'CLAUDE.md'), INSTRUCTIONS_BODY);
    return { ok: mcp.ok, detail: [mcp.detail, guide.detail].filter(Boolean).join('; '), error: mcp.error };
  },
  unregister() {
    if (onPath('claude')) { try { runAgentCli('claude', ['mcp', 'remove', '--scope', 'user', 'unclaw']); } catch { /* ignore */ } }
    return { ok: true, detail: 'removed' };
  },
});
