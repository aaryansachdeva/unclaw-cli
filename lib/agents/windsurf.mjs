// Windsurf (Codeium / Cognition, Cascade agent). Docs:
// docs.windsurf.com/plugins/cascade/mcp.
//   * Config: ~/.codeium/windsurf/mcp_config.json → "mcpServers" (standard
//     shape). NOT ~/.codeium/mcp_config.json (that's the plugin, not the
//     standalone editor). Enable/approve is done in the Cascade UI.
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { registerAdapter, upsertMcpJson, removeMcpJson } from '../installer.mjs';

const DIR = join(homedir(), '.codeium', 'windsurf');
const CFG = join(DIR, 'mcp_config.json');

registerAdapter({
  id: 'windsurf',
  name: 'Windsurf',
  detect: () => existsSync('/Applications/Windsurf.app') || existsSync(DIR),
  register: ({ server }) => upsertMcpJson(CFG, { server }), // { command, args }
  unregister: () => removeMcpJson(CFG),
});
