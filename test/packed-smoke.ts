// Run after `bun run build`: bun test/packed-smoke.ts
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { checkServer } from '../bin/install';

const root = resolve(import.meta.dir, '..');
const temporary = mkdtempSync(join(tmpdir(), 'di-packed-'));
const run = (command: string, args: string[], cwd: string, env = process.env) => execFileSync(command, args, { cwd, env, timeout: 120_000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
try {
  const packed = JSON.parse(run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temporary], root));
  const tarball = join(temporary, packed[0].filename);
  for (const runtime of ['node', 'bun']) {
    const unpacked = join(temporary, runtime);
    mkdirSync(unpacked);
    run('tar', ['-xzf', tarball, '-C', unpacked], temporary);
    const cli = join(unpacked, 'package/dist/bin/cli.js');
    await checkServer({ command: runtime, args: [cli, 'serve'] }, temporary);
    const workspace = join(temporary, `${runtime}-workspace`);
    mkdirSync(workspace);
    const before = readdirSync(workspace);
    run(runtime, [cli, 'install', '--agent', 'all', '--dry-run'], workspace);
    assert.deepEqual(readdirSync(workspace), before);
    mkdirSync(join(workspace, '.cursor'));
    writeFileSync(join(workspace, '.cursor/mcp.json'), '{"settings":{"keep":true},"mcpServers":{"other":{"command":"other"}}}');
    writeFileSync(join(workspace, '.mcp.json'), '{invalid');
    assert.throws(() => run(runtime, [cli, 'install', '--agent', 'all'], workspace));
    assert.equal(existsSync(join(workspace, '.di-framework')), false);
    assert.equal(readFileSync(join(workspace, '.mcp.json'), 'utf8'), '{invalid');
    writeFileSync(join(workspace, '.mcp.json'), '{"otherSetting":42}');
    run(runtime, [cli, 'install', '--agent', 'all'], workspace);
    const installed = readFileSync(join(workspace, '.cursor/mcp.json'), 'utf8');
    run(runtime, [cli, 'update', '--agent', 'all'], workspace);
    assert.equal(readFileSync(join(workspace, '.cursor/mcp.json'), 'utf8'), installed);
    assert.equal(JSON.parse(installed).settings.keep, true);
    assert.equal(JSON.parse(installed).mcpServers.other.command, 'other');
    const bundledSkills = readdirSync(join(unpacked, 'package/skills'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name);
    for (const skill of bundledSkills) {
      assert.equal(existsSync(join(workspace, '.claude/skills', skill, 'SKILL.md')), true);
    }
    rmSync(unpacked, { recursive: true });
    rmSync(join(workspace, '.claude/skills'), { recursive: true });
    rmSync(join(workspace, '.cursor/rules'), { recursive: true });
    run(runtime, [join(workspace, '.di-framework/plugin/dist/bin/cli.js'), 'update', '--agent', 'all'], workspace);
    for (const skill of bundledSkills) {
      assert.equal(existsSync(join(workspace, '.claude/skills', skill, 'SKILL.md')), true);
    }
    assert.equal(existsSync(join(workspace, '.cursor/rules/di-framework.mdc')), true);
    for (const path of ['.cursor/mcp.json', '.mcp.json']) {
      const config = JSON.parse(readFileSync(join(workspace, path), 'utf8'));
      await checkServer(config.mcpServers['di-framework'], workspace);
    }
    console.log(`${runtime}: packed serve, dry-run, invalid config, repeat install, durable adapters passed`);
  }
  // Exercise npx's documented command shape against the packed artifact, then
  // remove its entire cache to prove generated commands do not depend on it.
  const workspace = join(temporary, 'npx-workspace');
  const cache = join(temporary, 'npm-cache');
  mkdirSync(workspace);
  const runnerArgs = ['--yes', '--cache', cache, '--package', tarball, '--', 'di-framework-plugin'];
  run('npx', [...runnerArgs, 'install', '--agent', 'cursor'], workspace);
  // Package runners may validate/install dependencies before starting the server,
  // even with a populated cache. Give this network-dependent phase a bounded
  // two-minute startup budget; installed runtime health checks retain 10 seconds.
  await checkServer({ command: 'npx', args: [...runnerArgs, 'serve'] }, workspace, 120_000);
  rmSync(cache, { recursive: true, force: true });
  const config = JSON.parse(readFileSync(join(workspace, '.cursor/mcp.json'), 'utf8'));
  await checkServer(config.mcpServers['di-framework'], workspace);
  console.log('npx: documented serve and installation after cache deletion passed');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
