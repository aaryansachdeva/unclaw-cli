// OpenClaw (openclaw/openclaw, docs.openclaw.ai). Native outbound MCP-client
// support is shipped + stable (issues #8188/#43509/#29053 closed completed,
// release 2026.3.31; stdio hardened by PR #95102).
//   * MCP: ~/.openclaw/openclaw.json → NESTED "mcp.servers" (NOT "mcpServers").
//     A `command`-bearing server is stdio implicitly (no `transport` needed).
//     Written directly rather than via `openclaw mcp add` to avoid the CLI
//     mis-parsing a trailing `--mcp` arg (same reason as gemini). One entry is
//     exposed to the embedded agent AND projected into delegated coding CLIs.
//   * Skill: ~/.openclaw/skills/<name>/SKILL.md (AgentSkills spec, same file we
//     ship everywhere). Auto-enabled , no skills.entries needed , and a skill
//     named `unclaw` AUTOMATICALLY becomes the /unclaw slash command
//     (user-invocable defaults true). This is OpenClaw's invoke-by-name path.
//   * Guidance: AGENTS.md in the workspace (~/.openclaw/workspace/AGENTS.md).
//     Best-effort , the workspace is relocatable; the skill body already tells
//     the agent about `speak`, so this is belt-and-suspenders.
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { registerAdapter, onPath, upsertNestedMcpJson, removeNestedMcpJson, upsertInstructions, writeText, rmDir, INSTRUCTIONS_BODY, skillMarkdown } from '../installer.mjs';

const DIR = join(homedir(), '.openclaw');
const CFG = join(DIR, 'openclaw.json');
const SKILL_DIR = join(DIR, 'skills', 'unclaw');
const SKILL = join(SKILL_DIR, 'SKILL.md'); // → /unclaw (name = slash command)
const AGENTS = join(DIR, 'workspace', 'AGENTS.md');

registerAdapter({
  id: 'openclaw',
  name: 'OpenClaw',
  detect: () => onPath('openclaw') || existsSync(DIR),
  register({ node, runtime, server }) {
    const mcp = upsertNestedMcpJson(CFG, { server }); // mcp.servers.unclaw
    writeText(SKILL, skillMarkdown(node, runtime)); // auto-enabled → /unclaw
    if (existsSync(join(DIR, 'workspace'))) upsertInstructions(AGENTS, INSTRUCTIONS_BODY);
    return { ok: mcp.ok, detail: [mcp.detail, 'unclaw skill', '/unclaw'].filter(Boolean).join('; '), error: mcp.error };
  },
  unregister() {
    rmDir(SKILL_DIR);
    return removeNestedMcpJson(CFG);
  },
});
