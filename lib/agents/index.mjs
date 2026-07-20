// Registers every verified agent adapter with the installer core. Each
// adapter self-registers via registerAdapter() on import. Schemas were
// verified against each tool's official docs (see each adapter's header).
//
// "openclaw" intentionally has no adapter: it is not a standalone coding
// agent , it's an assistant/orchestrator that wraps Claude Code / Codex /
// opencode, so it inherits whatever we register for those.

import './claude.mjs';
import './codex.mjs';
import './opencode.mjs';
import './gemini.mjs';
import './cursor.mjs';
import './cline.mjs';
import './roo.mjs';
import './windsurf.mjs';
export {};
