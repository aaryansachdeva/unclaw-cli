// Cross-platform path + tooling helpers. macOS / Windows / Linux.
//
// Most agents key their config off the home dir (~/.codex, ~/.gemini,
// ~/.claude, ~/.cursor, ~/.codeium/windsurf) , os.homedir() already gives the
// right base on every OS, so those adapters need no branching. The two things
// that genuinely differ per OS live here: the VS Code "globalStorage" root
// (Cline/Roo), and how to find `node` on PATH.

import { existsSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

export const IS_WIN = platform() === 'win32';
export const IS_MAC = platform() === 'darwin';

/** Base dir a VS Code-family editor stores User/ under, per OS. */
function vscodeUserBase(appDir) {
  if (IS_MAC) return join(homedir(), 'Library', 'Application Support', appDir);
  if (IS_WIN) return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), appDir);
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), appDir); // linux
}

/** globalStorage roots to probe for VS Code / Cursor / Insiders / VSCodium
 *  (Cline + Roo live in one of these). */
export function vscodeGlobalStorageRoots() {
  return ['Code', 'Code - Insiders', 'Cursor', 'VSCodium']
    .map((app) => join(vscodeUserBase(app), 'User', 'globalStorage'));
}

/** VS Code extension dirs to probe for detection. */
export function vscodeExtensionDirs() {
  return ['.vscode', '.vscode-insiders', '.cursor']
    .map((d) => join(homedir(), d, 'extensions'));
}

/** Candidate config locations for opencode (XDG on *nix, %APPDATA% common on
 *  Windows). Returns [readPathThatExists | canonicalWritePath]. */
export function opencodeDir() {
  const cands = [
    join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'opencode'),
  ];
  if (IS_WIN) cands.push(join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'opencode'));
  return cands.find(existsSync) || cands[0];
}

/** `which`/`where`, plus OS-specific fallbacks, to find an absolute node. */
export function resolveNode() {
  const cands = [];
  try {
    const out = execFileSync(IS_WIN ? 'where' : 'which', ['node'], { encoding: 'utf8' });
    cands.push(out.split(/\r?\n/)[0].trim()); // `where` can list several
  } catch { /* none */ }
  if (/[/\\]node(\.exe)?$/.test(process.execPath)) cands.push(process.execPath);
  if (IS_WIN) {
    cands.push(
      join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node.exe'),
      join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs', 'node.exe'),
    );
  } else {
    cands.push('/opt/homebrew/bin/node', '/usr/local/bin/node', '/usr/bin/node');
  }
  return cands.find((c) => c && existsSync(c)) || (IS_WIN ? 'node.exe' : 'node');
}

/** Is a binary resolvable on PATH? */
export function onPath(bin) {
  try { execFileSync(IS_WIN ? 'where' : 'which', [bin], { stdio: 'ignore' }); return true; }
  catch { return false; }
}
