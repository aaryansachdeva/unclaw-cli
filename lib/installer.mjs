// Shared installer core , used by BOTH the `unclaw` CLI and the
// UnClaw app's "Connect your coding agent" screen (via IPC). It:
//   1. installs the runtime (`unclaw-speak.mjs`) to a STABLE path so agent
//      MCP configs keep working after the npx cache is evicted,
//   2. detects which coding agents are installed,
//   3. registers the `unclaw` stdio MCP server with each (adapter.register),
//   4. can undo it all (adapter.unregister).
//
// Every agent-specific detail lives in an adapter under lib/agents/. Adding a
// new agent = one adapter file; this core never changes. Config schemas were
// verified against each tool's official docs (see agents/*.mjs headers).

import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(HERE, '..');

export const UNCLAW_HOME = join(homedir(), '.unclaw');
export const RUNTIME_PATH = join(UNCLAW_HOME, 'bin', 'unclaw-speak.mjs');

// Markers so instructions blocks can be added/removed idempotently.
const MARK_BEGIN = '<!-- unclaw:begin -->';
const MARK_END = '<!-- unclaw:end -->';

// ---- fs helpers ----------------------------------------------------------

export function ensureDir(dir) { mkdirSync(dir, { recursive: true }); }
export { existsSync };

/** Parse a JSON(C-ish) config. Returns {value, parsed}. parsed=false means the
 *  file exists but we could NOT parse it , callers must NOT overwrite it. */
export function readConfig(path) {
  if (!existsSync(path)) return { value: {}, parsed: true, existed: false };
  try { return { value: JSON.parse(stripJsonc(readFileSync(path, 'utf8'))), parsed: true, existed: true }; }
  catch { return { value: {}, parsed: false, existed: true }; }
}

function stripJsonc(s) {
  // Tolerate // line comments + trailing commas (opencode.jsonc etc.). Good
  // enough to read; we always write plain JSON back.
  return s.replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1');
}

export function writeJson(path, obj) {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
}

/** Write a text file (creates parent dirs). Used for native /unclaw command
 *  files (TOML / Markdown). */
export function writeText(path, content) {
  ensureDir(dirname(path));
  writeFileSync(path, content);
  return { ok: true, detail: `command → ${path.replace(homedir(), '~')}` };
}

/** Delete a file if present (for unregister). */
export function rmFile(path) {
  try { if (existsSync(path)) rmSync(path); } catch { /* ignore */ }
}

/** Merge the unclaw server into a `{ [rootKey]: { unclaw: server } }` JSON
 *  config without clobbering the user's other servers/keys. Refuses to write
 *  if the existing file is unparseable. Returns a result object. */
export function upsertMcpJson(path, { rootKey = 'mcpServers', server }) {
  const { value, parsed, existed } = readConfig(path);
  if (existed && !parsed) {
    return { ok: false, detail: `left ${path} untouched (couldn't parse it , edit by hand)` };
  }
  value[rootKey] = value[rootKey] || {};
  value[rootKey].unclaw = server;
  writeJson(path, value);
  return { ok: true, detail: `wrote ${short(path)}` };
}

export function removeMcpJson(path, { rootKey = 'mcpServers' } = {}) {
  const { value, parsed, existed } = readConfig(path);
  if (!existed || !parsed || !value[rootKey]?.unclaw) return { ok: true, detail: 'nothing to remove' };
  delete value[rootKey].unclaw;
  writeJson(path, value);
  return { ok: true, detail: `removed from ${short(path)}` };
}

/** Append a TOML `[mcp_servers.unclaw]` table if not already present (Codex).
 *  Zero-dep: we only append, never rewrite, so we can't corrupt existing TOML. */
export function upsertMcpToml(path, { node, runtime }) {
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (existing.includes('[mcp_servers.unclaw]')) return { ok: true, detail: 'already present' };
  const block =
    `\n[mcp_servers.unclaw]\ncommand = ${JSON.stringify(node)}\n` +
    `args = [${JSON.stringify(runtime)}, "--mcp"]\n`;
  ensureDir(dirname(path));
  writeFileSync(path, existing + block);
  return { ok: true, detail: `wrote ${short(path)}` };
}

/** Idempotently add/replace a marked instructions block in a markdown file
 *  (AGENTS.md / GEMINI.md / CLAUDE.md). Preserves everything else. */
export function upsertInstructions(path, body) {
  const block = `${MARK_BEGIN}\n${body.trim()}\n${MARK_END}\n`;
  let text = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const re = new RegExp(`${MARK_BEGIN}[\\s\\S]*?${MARK_END}\\n?`);
  text = re.test(text) ? text.replace(re, block) : (text ? `${text.trimEnd()}\n\n${block}` : block);
  ensureDir(dirname(path));
  writeFileSync(path, text);
  return { ok: true, detail: `guidance → ${short(path)}` };
}

function short(p) { return p.replace(homedir(), '~'); }

// ---- node + agent-cli resolution ----------------------------------------
//
// resolveNode() / onPath() are cross-platform (see lib/platform.mjs). MUST use
// an ABSOLUTE node: Dock/Start-menu-launched GUI editors inherit a minimal
// PATH, and in the UnClaw app process.execPath is Electron, not node.
export { resolveNode, onPath } from './platform.mjs';
import { resolveNode as _resolveNode } from './platform.mjs';

/** Run an agent's own `mcp add` CLI (safest , the tool owns its format). */
export function runAgentCli(bin, args) {
  try { execFileSync(bin, args, { stdio: 'ignore' }); return { ok: true, detail: `${bin} mcp add` }; }
  catch (e) { return { ok: false, detail: `${bin} cli failed`, error: String(e?.message || e) }; }
}

// ---- runtime install -----------------------------------------------------

export function installRuntime() {
  ensureDir(dirname(RUNTIME_PATH));
  copyFileSync(join(PKG_ROOT, 'bin', 'unclaw-speak.mjs'), RUNTIME_PATH);
  return RUNTIME_PATH;
}

// ---- shared guidance -----------------------------------------------------

// The `/unclaw` command prompt (dropped as a native slash-command for agents
// that support one , Gemini CLI, Codex, opencode , so they match Claude
// Code's `/unclaw` skill). Injected when the user types /unclaw.
export const COMMAND_BODY = [
  "Turn on the UnClaw avatar so you can voice replies aloud through the user's",
  '3D character.',
  '',
  '1. Launch UnClaw in passthrough mode: call the `launch_unclaw` tool (from the',
  '   `unclaw` MCP server). If that tool is unavailable, run the shell command',
  '   `unclaw-speak --launch`.',
  '2. From now on, use the `speak` tool for anything meant to be heard ,',
  '   greetings, the headline result, reactions, questions. Keep spoken lines',
  '   short and conversational; never speak code, logs, or paths. Honor the',
  '   `verbosity`/`muted` each speak returns. Your normal written output is',
  '   unchanged , speak is *in addition* to it.',
  '',
  "Tell the user UnClaw is starting and you'll speak your replies aloud from now on.",
].join('\n');

export const INSTRUCTIONS_BODY = [
  '## UnClaw voice',
  '',
  'You have an `unclaw` MCP server with a `speak` tool. When UnClaw is running',
  'in passthrough mode, use `speak(text, mood?, action?)` to voice things aloud',
  "through the user's 3D avatar , greetings, results, reactions, questions.",
  'Keep spoken lines short and conversational; never speak code, logs, or paths.',
  'Honor the `verbosity`/`muted` echoed on each speak response. Your normal',
  'written output is unchanged , speak is *in addition* to it.',
].join('\n');

// ---- adapter registry ----------------------------------------------------

export const ADAPTERS = [];
export function registerAdapter(a) { ADAPTERS.push(a); }

function safe(fn, fallback) {
  try { return fn(); }
  catch (e) { return typeof fallback === 'object' ? { ...fallback, error: String(e?.message || e) } : fallback; }
}

// ---- orchestration -------------------------------------------------------

function ctx() {
  const runtime = installRuntime();
  const node = _resolveNode();
  return {
    node,
    runtime,
    server: { command: node, args: [runtime, '--mcp'] }, // JSON `mcpServers` shape
    UNCLAW_HOME,
  };
}

export function detectAgents() {
  return ADAPTERS.map((a) => ({ id: a.id, name: a.name, installed: safe(() => a.detect(), false) }));
}

export function install(ids) {
  const c = ctx();
  const targets = ADAPTERS.filter((a) => (ids?.length ? ids.includes(a.id) : safe(() => a.detect(), false)));
  return targets.map((a) => ({ id: a.id, name: a.name, ...safe(() => a.register(c), { ok: false, detail: 'register threw' }) }));
}

export function uninstall(ids) {
  const targets = ADAPTERS.filter((a) => (ids?.length ? ids.includes(a.id) : true));
  return targets.map((a) => ({ id: a.id, name: a.name, ...safe(() => a.unregister?.() ?? { ok: true, detail: 'no-op' }, { ok: false, detail: 'unregister threw' }) }));
}
