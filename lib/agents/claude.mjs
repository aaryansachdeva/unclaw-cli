// Claude Code (Anthropic). Docs: code.claude.com/docs/en/mcp, /memory, /skills.
//   * MCP: `claude mcp add --scope user <name> -- <cmd> <args>` (user scope =
//     every project). `--` separates flags from the server argv so `--mcp`
//     passes through cleanly. Gives the `speak`/`launch_unclaw` tools.
//   * Skill: ~/.claude/skills/unclaw/SKILL.md , Claude Code's native
//     user-facing extension (shows in /skills, invokable as /unclaw). This is
//     what makes UnClaw a first-class `/unclaw` here, matching the command the
//     other agents get; the MCP tools alone don't surface in /skills.
//   * Guidance: CLAUDE.md (~/.claude/CLAUDE.md, user memory).
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { registerAdapter, onPath, runAgentCli, upsertInstructions, writeText, rmDir, INSTRUCTIONS_BODY, skillMarkdown } from '../installer.mjs';

const DIR = join(homedir(), '.claude');
const SKILL = join(DIR, 'skills', 'unclaw', 'SKILL.md'); // → /unclaw

registerAdapter({
  id: 'claude',
  name: 'Claude Code',
  detect: () => onPath('claude') || existsSync(DIR) || existsSync(join(homedir(), '.claude.json')),
  register({ node, runtime }) {
    let mcp;
    if (onPath('claude')) {
      // `claude mcp add` errors if the server already exists , clear any prior
      // entry first so re-running install is idempotent (not a scary failure).
      runAgentCli('claude', ['mcp', 'remove', '--scope', 'user', 'unclaw']);
      mcp = runAgentCli('claude', ['mcp', 'add', '--scope', 'user', 'unclaw', '--', node, runtime, '--mcp']);
    } else {
      mcp = { ok: false, detail: 'claude CLI not on PATH , run `claude mcp add` manually' };
    }
    const guide = upsertInstructions(join(DIR, 'CLAUDE.md'), INSTRUCTIONS_BODY);
    writeText(SKILL, skillMarkdown(node, runtime)); // /unclaw skill
    return { ok: mcp.ok, detail: [mcp.detail, guide.detail, '/unclaw skill'].filter(Boolean).join('; '), error: mcp.error };
  },
  unregister() {
    if (onPath('claude')) { try { runAgentCli('claude', ['mcp', 'remove', '--scope', 'user', 'unclaw']); } catch { /* ignore */ } }
    rmDir(join(DIR, 'skills', 'unclaw'));
    return { ok: true, detail: 'removed (mcp + skill)' };
  },
});
