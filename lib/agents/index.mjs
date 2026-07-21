// Registers every verified agent adapter with the installer core. Each
// adapter self-registers via registerAdapter() on import. Schemas were
// verified against each tool's official docs (see each adapter's header).
//
// OpenClaw HAS a dedicated adapter: as of release 2026.3.31 it natively
// consumes external stdio MCP servers via `mcp.servers`, and its embedded
// agent calls those tools directly , our per-CLI adapters don't reach it, so
// registering `mcp.servers.unclaw` + a skill is the only way to cover it.

import './claude.mjs';
import './codex.mjs';
import './opencode.mjs';
import './gemini.mjs';
import './openclaw.mjs';
import './cursor.mjs';
import './cline.mjs';
import './roo.mjs';
import './windsurf.mjs';
export {};
