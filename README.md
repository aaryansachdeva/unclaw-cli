# unclaw

Give **any** coding agent a voice: wire the UnClaw 3D avatar's `speak`
capability into Codex, opencode, Gemini CLI, Cursor, Cline, Roo, Windsurf,
Claude Code — with one command.

```bash
npx unclaw-cli               # detect installed agents + connect them all
npx unclaw-cli detect        # list what's supported / installed
npx unclaw-cli install codex opencode   # only these
npx unclaw-cli status        # agents connected + is UnClaw live + talkativeness
npx unclaw-cli test          # send a test line to the avatar (verify the chain)
npx unclaw-cli doctor        # diagnose why speaking isn't working
npx unclaw-cli uninstall     # remove
```

(The installed command is `unclaw` , `npm i -g unclaw-cli` then just `unclaw ...`.)

Then start your agent — it gains a `speak` tool. Launch UnClaw in passthrough
mode (`/unclaw`, or `open "unclaw://passthrough"`) and the avatar voices
whatever the agent decides to say aloud.

## How it works

The whole capability is **one stdio MCP server** (`unclaw-speak.mjs --mcp`,
exposing `speak` + `launch_unclaw`). Because MCP is the common substrate across
every modern coding agent, "support a new agent" just means registering that
server + dropping short guidance — no per-agent reimplementation. The `speak`
tool's own description carries the usage rules, so agents know how to use it
even without an instructions file.

`speak(text)` → the agent's shim → soul `/passthrough/speak` → the UnClaw
renderer → TTS + lipsync + facial expression on the avatar. The user controls
talkativeness + mute inside UnClaw; every `speak` response echoes those back so
the agent self-adjusts.

## What it does per agent (all verified against official docs)

| Agent | MCP registration | Guidance | `/unclaw` command |
|---|---|---|---|
| **Codex CLI** | `codex mcp add` → `~/.codex/config.toml` | `~/.codex/AGENTS.md` | `/prompts:unclaw` (deprecated feature) |
| **opencode** | `~/.config/opencode/opencode.json` (`mcp`, `type:"local"`) | `~/.config/opencode/AGENTS.md` | `/unclaw` |
| **Gemini CLI** | `~/.gemini/settings.json` (`mcpServers`) | `~/.gemini/GEMINI.md` | `/unclaw` |
| **Claude Code** | `claude mcp add --scope user` | `~/.claude/CLAUDE.md` | `/unclaw` skill |
| **Cursor** | `~/.cursor/mcp.json` (`type:"stdio"`) | tool description | — (no user commands) |
| **Cline** | VS Code globalStorage `cline_mcp_settings.json` (`autoApprove`) | tool description | — |
| **Roo Code** | globalStorage `mcp_settings.json` (`alwaysAllow`) | tool description | — |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | tool description | — |

Agents that support user slash-commands get a native **`/unclaw`** that launches
passthrough + switches on the `speak` tool , matching Claude Code's skill. The
rest rely on the `launch_unclaw` MCP tool (and auto-launch on first `speak`).

Notes baked in from the research pass:
- The runtime is copied to a stable `~/.unclaw/bin/unclaw-speak.mjs` so configs
  survive npx-cache eviction.
- Every config uses an **absolute** `node` path — Dock-launched GUI editors
  (Cursor/Cline/Windsurf) get a minimal PATH, and in the UnClaw app
  `process.execPath` is Electron, not node.
- We prefer each tool's **own `mcp add` CLI** where it has one (Codex, Claude);
  JSON writes refuse to run if an existing config can't be parsed.
- `AGENTS.md` is the emerging cross-agent instructions standard (Codex,
  opencode, Cursor, Gemini, Windsurf, ...). `openclaw` isn't a standalone CLI —
  it wraps Claude/Codex/opencode, so it inherits their setup.

## Distribution

Two channels, one shared core (`lib/installer.mjs`):

1. **CLI** — publish this package to npm; users run `npx unclaw`.
2. **In-app** — the UnClaw app's *Connect your coding agent* screen calls the
   same `detectAgents()` / `install()` core over IPC (one click per agent).

Node.js is required only where the MCP server runs. Gemini CLI users already
have it; for the others the installer resolves an absolute node and, if none
exists, should prompt to install one.

## Cross-platform

macOS, Windows, Linux. Most agents key their config off the home dir
(`~/.codex`, `~/.gemini`, `~/.cursor`, ...) which is portable; the OS-specific
bits , the VS Code globalStorage root (Cline/Roo) and finding `node` , are
handled in `lib/platform.mjs` (Library/Application Support · %APPDATA% ·
XDG_CONFIG_HOME; `which` · `where`).

## Requirements

Node 18+. Node is only needed where the MCP server runs; the installer resolves
an absolute node path (Dock/Start-menu-launched GUI editors get a minimal PATH).
