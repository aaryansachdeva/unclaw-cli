// OpenAI Codex CLI. Docs (2026): learn.chatgpt.com/docs/build-skills,
// /docs/config-file/config-reference, /docs/extend/mcp, /docs/agent-configuration/agents-md.
//   * Skill (RECOMMENDED, the successor to custom prompts): a SKILL.md under the
//     cross-agent USER skills dir ~/.agents/skills/<name>/ , NOT ~/.codex/skills
//     (that's Codex's system-managed .system dir). Invokable via /skills or a
//     $unclaw mention, and auto-triggered by its description. Codex's analog to
//     Claude Code skills.
//   * MCP: [mcp_servers.unclaw] in ~/.codex/config.toml. We write it directly
//     (not via `codex mcp add`) so we can set startup_timeout_sec , Codex's 10s
//     default trips a spurious "failed to connect" on a Node cold start.
//   * Guidance: AGENTS.md (~/.codex/AGENTS.md, global) , the always-on floor.
//   * Legacy bonus: ~/.codex/prompts/unclaw.md (custom prompts are DEPRECATED in
//     favor of skills, but still load , invokable as /prompts:unclaw).
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { registerAdapter, onPath, runAgentCli, upsertMcpToml, upsertInstructions, writeText, rmFile, rmDir, INSTRUCTIONS_BODY, COMMAND_BODY, skillMarkdown } from '../installer.mjs';

const DIR = join(homedir(), '.codex');
// Cross-agent user skills dir (Codex user scope; also read by opencode).
const SKILL_DIR = join(homedir(), '.agents', 'skills', 'unclaw');
const SKILL = join(SKILL_DIR, 'SKILL.md'); // → /skills, $unclaw
const CMD = join(DIR, 'prompts', 'unclaw.md'); // legacy → /prompts:unclaw
const CMD_MD = `---\ndescription: Launch UnClaw in passthrough mode and voice replies aloud.\n---\n\n${COMMAND_BODY}\n`;

registerAdapter({
  id: 'codex',
  name: 'Codex CLI',
  detect: () => onPath('codex') || existsSync(DIR),
  register({ node, runtime }) {
    const mcp = upsertMcpToml(join(DIR, 'config.toml'), { node, runtime }); // startup_timeout_sec baked in
    writeText(SKILL, skillMarkdown(node, runtime)); // primary: /unclaw skill
    upsertInstructions(join(DIR, 'AGENTS.md'), INSTRUCTIONS_BODY);
    writeText(CMD, CMD_MD); // legacy /prompts:unclaw bonus
    return { ok: mcp.ok, detail: [mcp.detail, 'unclaw skill', 'AGENTS.md'].filter(Boolean).join('; '), error: mcp.error };
  },
  unregister() {
    rmFile(CMD);
    rmDir(SKILL_DIR);
    if (onPath('codex')) { try { runAgentCli('codex', ['mcp', 'remove', 'unclaw']); } catch { /* ignore */ } }
    return { ok: true, detail: 'removed (config.toml table left if codex CLI absent)' };
  },
});
