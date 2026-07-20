// Cursor (IDE). Docs: cursor.com/docs/mcp, /rules.
//   * Config: ~/.cursor/mcp.json → "mcpServers". Docs list `type: "stdio"`
//     as required, so include it. Absolute node (Dock-launched minimal PATH).
//   * Guidance: skipped , Cursor rules are project-scoped/.mdc; the MCP tool
//     description carries usage. (Cursor also reads AGENTS.md per-project.)
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { registerAdapter, upsertMcpJson, removeMcpJson } from '../installer.mjs';

const CFG = join(homedir(), '.cursor', 'mcp.json');

registerAdapter({
  id: 'cursor',
  name: 'Cursor',
  detect: () => existsSync('/Applications/Cursor.app') || existsSync(join(homedir(), '.cursor')),
  register: ({ node, runtime }) =>
    upsertMcpJson(CFG, { server: { type: 'stdio', command: node, args: [runtime, '--mcp'] } }),
  unregister: () => removeMcpJson(CFG),
});
