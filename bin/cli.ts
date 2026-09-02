#!/usr/bin/env node
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const command = args[0];

const isGlobal = args.includes('--global') || args.includes('-g');

function getOptionValue(flag: string): string | null {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length && !args[idx + 1].startsWith('-')) {
    return args[idx + 1];
  }
  const prefixMatch = args.find((a) => a.startsWith(`${flag}=`));
  if (prefixMatch) {
    return prefixMatch.slice(flag.length + 1);
  }
  return null;
}

const targetAgent = (getOptionValue('--agent') || getOptionValue('-a') || 'auto').toLowerCase();

function printHelp() {
  console.log(`
@di-framework/plugin CLI

Usage:
  npx @di-framework/plugin <command> [options]
  # or
  bunx @di-framework/plugin <command> [options]

Commands:
  install [@version]    Install the plugin, skills, rules, and MCP servers
  update [@version]     Update existing plugin installations
  help                  Show this help text

Options:
  -g, --global          Target global user configuration instead of local workspace
  -a, --agent <name>    Target specific agent: 'antigravity', 'cursor', 'claude', 'junie', 'codex', 'hermes', or 'all' (default: 'auto')
  --dry-run             Preview actions without writing files

Supported Coding Agents:
  • Antigravity / Gemini CLI  (.agents/plugins/di-framework)
  • Cursor                    (.cursor/mcp.json + .cursor/rules/di-framework.mdc)
  • Claude (Code & Desktop)   (.claude.json + .claude/skills)
  • Junie / JetBrains         (.idea/mcp.json)
  • Codex / Hermes / Vibe     (Neutral .agents/ + AGENTS.md)
`);
}

function mergeMcpConfig(filePath: string, serverConfig: Record<string, unknown>, dryRun = false) {
  let config: { mcpServers?: Record<string, unknown> } = {};
  if (existsSync(filePath)) {
    try {
      config = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
      config = {};
    }
  }

  config.mcpServers = {
    ...config.mcpServers,
    ...serverConfig,
  };

  if (!dryRun) {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
  }
}

async function run() {
  if (!command || command === 'help' || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  const dryRun = args.includes('--dry-run');
  const cwd = process.cwd();
  
  // Find package root (handles both bin/cli.ts and dist/bin/cli.js)
  let sourceDir = resolve(__dirname, '..');
  if (!existsSync(join(sourceDir, 'package.json')) && existsSync(join(sourceDir, '..', 'package.json'))) {
    sourceDir = resolve(sourceDir, '..');
  }
  const serverPath = join(sourceDir, 'dist/index.js');

  const mcpEntry = {
    'di-framework': {
      command: 'node',
      args: [serverPath],
      description: 'Official di-framework MCP Server & Documentation Search',
    },
  };

  if (command === 'install' || command === 'update') {
    const actionLabel = command === 'install' ? 'Installing' : 'Updating';
    console.log(`🚀 ${actionLabel} @di-framework/plugin...`);

    const configuredAgents: string[] = [];

    // 1. Antigravity & Neutral Standard (.agents/plugins/di-framework)
    if (['auto', 'all', 'antigravity', 'hermes', 'codex', 'vibe'].includes(targetAgent)) {
      const targetDir = isGlobal
        ? join(homedir(), '.gemini/config/plugins/di-framework')
        : join(cwd, '.agents/plugins/di-framework');

      console.log(`  📦 [Antigravity / Neutral] -> ${targetDir}`);
      if (!dryRun) {
        mkdirSync(targetDir, { recursive: true });
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
          const src = join(sourceDir, item);
          const dest = join(targetDir, item);
          if (existsSync(src)) {
            cpSync(src, dest, { recursive: true, force: true });
          }
        }
      }
      configuredAgents.push('Antigravity / Neutral Agents');
    }

    // 2. Cursor (.cursor/mcp.json + .cursor/rules/)
    const hasCursor = existsSync(join(cwd, '.cursor')) || existsSync(join(cwd, '.cursorrules')) || isGlobal;
    if (['all', 'cursor'].includes(targetAgent) || (targetAgent === 'auto' && hasCursor)) {
      const cursorMcpPath = isGlobal
        ? join(homedir(), '.cursor/mcp.json')
        : join(cwd, '.cursor/mcp.json');
      console.log(`  Cursor -> ${cursorMcpPath}`);
      mergeMcpConfig(cursorMcpPath, mcpEntry, dryRun);

      // Copy rules
      if (!isGlobal && !dryRun) {
        const cursorRulesDir = join(cwd, '.cursor/rules');
        mkdirSync(cursorRulesDir, { recursive: true });
        const agentsRulePath = join(sourceDir, 'rules/AGENTS.md');
        if (existsSync(agentsRulePath)) {
          const content = readFileSync(agentsRulePath, 'utf-8');
          const mdcContent = `---
description: di-framework architectural rules, static methods, and conventions
globs: *
alwaysApply: true
---

${content}`;
          writeFileSync(join(cursorRulesDir, 'di-framework.mdc'), mdcContent, 'utf-8');
        }
      }
      configuredAgents.push('Cursor');
    }

    // 3. Claude (.claude.json / claude_desktop_config.json + .claude/skills)
    const hasClaude = existsSync(join(cwd, '.claude')) || existsSync(join(cwd, '.claude.json')) || isGlobal;
    if (['all', 'claude'].includes(targetAgent) || (targetAgent === 'auto' && hasClaude)) {
      const claudeMcpPath = isGlobal
        ? join(
            homedir(),
            process.platform === 'darwin'
              ? 'Library/Application Support/Claude/claude_desktop_config.json'
              : '.claude.json'
          )
        : join(cwd, '.claude.json');

      console.log(`  Claude -> ${claudeMcpPath}`);
      mergeMcpConfig(claudeMcpPath, mcpEntry, dryRun);

      // Copy skill to .claude/skills
      if (!isGlobal && !dryRun) {
        const claudeSkillsDir = join(cwd, '.claude/skills/di-framework-api');
        mkdirSync(claudeSkillsDir, { recursive: true });
        const skillSrc = join(sourceDir, 'skills/di-framework-api');
        if (existsSync(skillSrc)) {
          cpSync(skillSrc, claudeSkillsDir, { recursive: true, force: true });
        }
      }
      configuredAgents.push('Claude (Code & Desktop)');
    }

    // 4. Junie / JetBrains (.idea/mcp.json)
    const hasIdea = existsSync(join(cwd, '.idea')) || isGlobal;
    if (['all', 'junie', 'jetbrains'].includes(targetAgent) || (targetAgent === 'auto' && hasIdea)) {
      const ideaMcpPath = isGlobal
        ? join(homedir(), '.junie/mcp.json')
        : join(cwd, '.idea/mcp.json');
      console.log(`  Junie / JetBrains -> ${ideaMcpPath}`);
      mergeMcpConfig(ideaMcpPath, mcpEntry, dryRun);
      configuredAgents.push('Junie (JetBrains)');
    }

    console.log(`\n✅ Successfully configured @di-framework/plugin for:`);
    for (const agent of configuredAgents) {
      console.log(`   ✓ ${agent}`);
    }
    console.log(`\nAll tools (di_search_docs, di_window, di_scaffold_provider) and rules are ready!`);
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
