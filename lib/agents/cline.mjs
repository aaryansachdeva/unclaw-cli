// Cline (VS Code extension saoudrizwan.claude-dev). Docs:
// docs.cline.bot/mcp/configuring-mcp-servers.
//   * Config: <VSCode globalStorage>/saoudrizwan.claude-dev/settings/
//     cline_mcp_settings.json → "mcpServers" with `disabled` + `autoApprove`.
//   * No add-CLI. Guidance skipped (project .clinerules; MCP tool desc covers).
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { registerAdapter, upsertMcpJson, removeMcpJson } from '../installer.mjs';
import { vscodeGlobalStorageRoots, vscodeExtensionDirs } from '../platform.mjs';

const EXT = 'saoudrizwan.claude-dev';
const CODE_ROOTS = vscodeGlobalStorageRoots();

function settingsPath() {
  for (const root of CODE_ROOTS) {
    if (existsSync(join(root, EXT))) return join(root, EXT, 'settings', 'cline_mcp_settings.json');
  }
  return join(CODE_ROOTS[0], EXT, 'settings', 'cline_mcp_settings.json');
}

function hasExtension() {
  return vscodeExtensionDirs().some((d) => { try { return readdirSync(d).some((n) => n.startsWith(`${EXT}-`)); } catch { return false; } })
    || CODE_ROOTS.some((r) => existsSync(join(r, EXT)));
}

registerAdapter({
  id: 'cline',
  name: 'Cline',
  detect: hasExtension,
  register: ({ node, runtime }) =>
    upsertMcpJson(settingsPath(), { server: { command: node, args: [runtime, '--mcp'], disabled: false, autoApprove: [] } }),
  unregister: () => removeMcpJson(settingsPath()),
});
