// Roo Code (VS Code extension rooveterinaryinc.roo-cline; a Cline fork that
// DIFFERS). Docs: docs.roocode.com/features/mcp/using-mcp-in-roo.
//   * Config file is `mcp_settings.json` (NOT cline_mcp_settings.json), and
//     the approval key is `alwaysAllow` (NOT autoApprove).
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { registerAdapter, upsertMcpJson, removeMcpJson } from '../installer.mjs';
import { vscodeGlobalStorageRoots, vscodeExtensionDirs } from '../platform.mjs';

const EXT = 'rooveterinaryinc.roo-cline';
const CODE_ROOTS = vscodeGlobalStorageRoots();

function settingsPath() {
  for (const root of CODE_ROOTS) {
    if (existsSync(join(root, EXT))) return join(root, EXT, 'settings', 'mcp_settings.json');
  }
  return join(CODE_ROOTS[0], EXT, 'settings', 'mcp_settings.json');
}

function hasExtension() {
  return vscodeExtensionDirs().some((d) => { try { return readdirSync(d).some((n) => n.startsWith(`${EXT}-`)); } catch { return false; } })
    || CODE_ROOTS.some((r) => existsSync(join(r, EXT)));
}

registerAdapter({
  id: 'roo',
  name: 'Roo Code',
  detect: hasExtension,
  register: ({ node, runtime }) =>
    upsertMcpJson(settingsPath(), { server: { type: 'stdio', command: node, args: [runtime, '--mcp'], disabled: false, alwaysAllow: [] } }),
  unregister: () => removeMcpJson(settingsPath()),
});
