#!/usr/bin/env node
// unclaw , wire the UnClaw avatar's `speak` capability into whatever coding
// agent(s) you use, and check that the whole chain is healthy.
//
//   npx unclaw                 detect agents + connect them all
//   npx unclaw install [ids]   connect (all detected, or just the named ones)
//   npx unclaw detect          list supported agents + whether installed
//   npx unclaw status          agents connected + is UnClaw live + talkativeness
//   npx unclaw test            send a test line to the avatar (verify the chain)
//   npx unclaw doctor          diagnose why speaking isn't working
//   npx unclaw uninstall [ids] remove
//
// After connecting, start your agent , it gains a `speak` tool. Launch UnClaw
// in passthrough mode (`/unclaw`, or `open "unclaw://passthrough"`) to hear it.

import '../lib/agents/index.mjs'; // registers all verified adapters
import { existsSync } from 'node:fs';
import { detectAgents, install, uninstall, ADAPTERS, RUNTIME_PATH } from '../lib/installer.mjs';
import { resolveNode } from '../lib/platform.mjs';
import { passthroughStatus, postSpeak, soulHttpBase, unclawInstalled } from './unclaw-speak.mjs';

const [cmd = 'install', ...rest] = process.argv.slice(2);

function printResults(results) {
  for (const r of results) {
    console.log(`  ${r.ok ? '✓' : '·'} ${r.name}${r.detail ? ` , ${r.detail}` : ''}${r.error ? ` (${r.error})` : ''}`);
  }
}

if (ADAPTERS.length === 0) {
  console.error('unclaw: no agent adapters bundled yet in this build.');
  process.exit(1);
}

const run = {
  detect() {
    console.log('Supported agents on this machine:');
    for (const a of detectAgents()) console.log(`  ${a.installed ? '●' : '○'} ${a.name}${a.installed ? '' : '  (not detected)'}`);
  },

  install() {
    const ids = rest.length ? rest : null;
    if (!ids && !detectAgents().some((a) => a.installed)) {
      console.log('No supported coding agents detected. Install one (Codex, opencode, Gemini CLI, ...) then re-run.');
      return;
    }
    console.log('Connecting UnClaw speak capability...');
    printResults(install(ids));
    console.log('\nDone. Start your agent and use its `speak` tool; launch UnClaw in passthrough mode to hear it.');
    console.log('Verify anytime with:  unclaw test');
  },

  uninstall() {
    console.log('Removing UnClaw speak capability...');
    printResults(uninstall(rest.length ? rest : null));
  },

  async status() {
    const s = await passthroughStatus();
    console.log('Agents connected:');
    for (const a of detectAgents()) if (a.installed) console.log(`  ✓ ${a.name}`);
    console.log('\nUnClaw:');
    console.log(`  app installed    ${s.installed ? 'yes' : 'no (get it at unclaw.io)'}`);
    console.log(`  running          ${s.running ? 'yes' : 'no'}`);
    console.log(`  passthrough live ${s.connected ? 'yes' : 'no (launch UnClaw in passthrough mode)'}`);
    console.log(`  signed in + set up ${s.ready ? 'yes (ready)' : s.connected ? 'no (finish setup in UnClaw)' : '–'}`);
    if (s.running) console.log(`  talkativeness    ${s.verbosity}${s.muted ? '  (MUTED)' : ''}`);
  },

  async test() {
    console.log('Sending a test line to the avatar (launching UnClaw if needed)...');
    const r = await postSpeak({ text: 'UnClaw is connected and ready.', mood: 'joyful' });
    if (r.muted) console.log('· Reached UnClaw, but the avatar is MUTED , unmute it in the app to hear it.');
    else if (r.notReady) console.log('· UnClaw is open but not signed in / set up. Finish setup in the app, then re-run `unclaw test`.');
    else if (r.ok && r.delivered > 0) console.log(`✓ Spoken through ${r.delivered} UnClaw window(s)${r.autolaunched ? ' (launched it first)' : ''}. You should hear it now.`);
    else if (r.autolaunch) console.log(`· Launched UnClaw , ${r.autolaunch}. Re-run \`unclaw test\` in a moment.`);
    else console.log(`· Not delivered: ${r.error || 'no passthrough session'}.`);
  },

  async doctor() {
    const base = soulHttpBase();
    const s = await passthroughStatus();
    const checks = [
      ['node runtime', existsSync(resolveNode()) || resolveNode() !== 'node', `using ${resolveNode()}`],
      ['speak runtime installed', existsSync(RUNTIME_PATH), RUNTIME_PATH],
      ['coding agent detected', detectAgents().some((a) => a.installed), detectAgents().filter((a) => a.installed).map((a) => a.name).join(', ') || 'none , install one, then `unclaw install`'],
      ['UnClaw app installed', s.installed, s.installed ? 'found' : 'get it at unclaw.io'],
      ['UnClaw running', !!base && s.running, s.running ? base : (s.installed ? 'installed but not running , launch it' : 'install UnClaw first')],
      ['passthrough session live', s.connected, s.connected ? 'connected' : 'launch UnClaw in passthrough mode (`/unclaw`)'],
      ['signed in + set up', s.ready, s.ready ? 'ready to render' : (s.connected ? 'open but not signed in / onboarded , finish setup in UnClaw' : 'n/a until a session is live')],
    ];
    console.log('UnClaw doctor:\n');
    for (const [label, ok, detail] of checks) console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  ,  ${detail}` : ''}`);
    const bad = checks.filter(([, ok]) => !ok);
    console.log(bad.length ? `\n${bad.length} thing(s) to fix above.` : '\nAll good , try `unclaw test`.');
  },
};

const fn = run[cmd];
if (!fn) {
  console.error(`unknown command: ${cmd}\nusage: unclaw [install|detect|status|test|doctor|uninstall] [agent...]`);
  process.exit(2);
}
await fn();
