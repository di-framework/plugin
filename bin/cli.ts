#!/usr/bin/env node
import { existsSync, mkdirSync, cpSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const command = args[0];

const isGlobal = args.includes('--global') || args.includes('-g');

function printHelp() {
  console.log(`
@di-framework/plugin CLI

Usage:
  bunx @di-framework/plugin <command> [options]
  # or
  npx @di-framework/plugin <command> [options]

Commands:
  install [@version]    Install the di-framework plugin into .agents/plugins/di-framework
  update [@version]     Update the existing di-framework plugin bundle
  help                  Show this help text

Options:
  -g, --global          Target ~/.gemini/config/plugins/di-framework instead of workspace
`);
}

async function run() {
  if (!command || command === 'help' || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  const targetDir = isGlobal
    ? join(homedir(), '.gemini/config/plugins/di-framework')
    : join(process.cwd(), '.agents/plugins/di-framework');

  if (command === 'install' || command === 'update') {
    console.log(`📦 ${command === 'install' ? 'Installing' : 'Updating'} di-framework plugin...`);
    console.log(`📍 Target destination: ${targetDir}`);

    mkdirSync(targetDir, { recursive: true });

    // Source plugin root (resolved from package location)
    const sourceDir = resolve(__dirname, '..');

    // Copy plugin assets
    const copyItems = [
      'plugin.json',
      'mcp_config.json',
      'rules',
      'skills',
      'dist',
      'contracts',
      'package.json',
      'README.md',
      'LICENSE',
    ];

    for (const item of copyItems) {
      const srcPath = join(sourceDir, item);
      const destPath = join(targetDir, item);
      if (existsSync(srcPath)) {
        cpSync(srcPath, destPath, { recursive: true, force: true });
      }
    }

    console.log(`✅ di-framework plugin successfully ${command === 'install' ? 'installed' : 'updated'}!`);
    console.log(`🤖 Antigravity will now auto-discover the di-framework-api skill and MCP search tools.`);
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

run().catch((err) => {
  console.error('Error executing CLI command:', err);
  process.exit(1);
});
