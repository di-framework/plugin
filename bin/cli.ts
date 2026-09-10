#!/usr/bin/env node
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createDiMcpServer } from '../src/server';
import { checkServer, mergedMcpConfig, writeConfig } from './install';

const args = process.argv.slice(2);
const command = args[0];
const isGlobal = args.includes('--global') || args.includes('-g');
const dryRun = args.includes('--dry-run');
function option(flag: string): string | undefined {
  const value = args.find((arg) => arg.startsWith(`${flag}=`));
  if (value) return value.slice(flag.length + 1);
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  if (!args[index + 1] || args[index + 1].startsWith('-')) throw new Error(`Missing value for ${flag}`);
  return args[index + 1];
}
function help() {
  console.log(`@di-framework/plugin
Usage: npx -y @di-framework/plugin <command> [options]
  serve                 Start the stdio MCP server
  install | update      Copy a durable runtime and configure supported agents
  check                 Initialize the installed MCP server and list tools
  help                  Show help
Options for install, update, check:
  --agent, -a <name>     cursor, claude (Claude Code), all, auto (default)
  --global, -g          User configuration instead of project configuration
  --dry-run             Validate and preview installation without writing
Select versions with npx -y @di-framework/plugin@<version> install.
`);
}
async function run() {
  if (!command || command === 'help' || args.includes('--help') || args.includes('-h')) return help();
  if (command === 'serve') {
    await createDiMcpServer().connect(new StdioServerTransport());
    return;
  }
  if (!['install', 'update', 'check'].includes(command)) throw new Error(`Unknown command: ${command}`);
  const agent = (option('--agent') ?? option('-a') ?? 'auto').toLowerCase();
  if (!['cursor', 'claude', 'all', 'auto'].includes(agent)) throw new Error(`Unsupported agent: ${agent}. Supported installers: cursor, claude (Claude Code).`);
  const cwd = process.cwd();
  const base = isGlobal ? homedir() : cwd;
  const runtime = join(base, '.di-framework/plugin');
  const server = { command: process.execPath, args: [join(runtime, 'dist/bin/cli.js'), 'serve'] };
  if (command === 'check') {
    const names = await checkServer(server);
    console.log(`MCP initialized; discovered ${names.join(', ')}`);
    return;
  }
  const cursorPath = join(base, '.cursor/mcp.json');
  const claudePath = join(base, isGlobal ? '.claude.json' : '.mcp.json');
  const selected = [
    { name: 'cursor', path: cursorPath, detected: existsSync(join(base, '.cursor')) || existsSync(join(base, '.cursorrules')) },
    { name: 'claude', path: claudePath, detected: existsSync(join(base, '.claude')) || existsSync(claudePath) },
  ].filter((entry) => agent === 'all' || agent === entry.name || (agent === 'auto' && entry.detected));
  if (!selected.length) throw new Error('No supported agent detected. Choose --agent cursor or --agent claude.');
  // Validate every target before copying files or changing any configuration.
  const configs = selected.map((entry) => ({ ...entry, content: mergedMcpConfig(entry.path, server) }));
  let source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  if (!existsSync(join(source, 'package.json'))) source = resolve(source, '..');
  if (!existsSync(join(source, 'dist/bin/cli.js'))) throw new Error('Built CLI is missing. Build the package before installing.');
  console.log(`${dryRun ? 'Would install' : 'Installing'} runtime: ${runtime}`);
  for (const config of configs) console.log(`${dryRun ? 'Would merge' : 'Merging'} ${config.name}: ${config.path}`);
  if (dryRun) return;
  if (resolve(source) !== resolve(runtime)) {
    mkdirSync(runtime, { recursive: true });
    for (const item of ['dist', 'package.json', 'rules', 'skills']) {
      if (existsSync(join(source, item))) cpSync(join(source, item), join(runtime, item), { recursive: true });
    }
  }
  const names = await checkServer(server);
  for (const config of configs) writeConfig(config.path, config.content);
  for (const entry of selected) {
    if (entry.name === 'cursor' && !isGlobal && existsSync(join(source, 'rules/AGENTS.md'))) {
      const rules = join(base, '.cursor/rules');
      mkdirSync(rules, { recursive: true });
      writeFileSync(join(rules, 'di-framework.mdc'), `---\ndescription: di-framework conventions\nglobs: *\nalwaysApply: true\n---\n\n${readFileSync(join(source, 'rules/AGENTS.md'), 'utf8')}`);
    }
    if (entry.name === 'claude' && existsSync(join(source, 'skills'))) {
      const skills = join(base, '.claude/skills');
      mkdirSync(skills, { recursive: true });
      cpSync(join(source, 'skills'), skills, { recursive: true });
    }
  }
  console.log(`MCP initialized; discovered ${names.length} tools. Configuration saved.`);
}
run().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
