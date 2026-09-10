import { describe, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, chmodSync, existsSync, symlinkSync, readlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergedMcpConfig, writeConfig } from '../bin/install';

const server = { command: 'node', args: ['/persistent/cli.js', 'serve'] };
function fixture(run: (dir: string, file: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'di-installer-'));
  try { run(dir, join(dir, 'mcp.json')); } finally { rmSync(dir, { recursive: true, force: true }); }
}
describe('MCP configuration preservation', () => {
  test('preserves unrelated settings and registrations, and updates idempotently', () => fixture((_dir, file) => {
    writeFileSync(file, JSON.stringify({ theme: 'dark', mcpServers: { other: { command: 'other' } } }));
    const content = mergedMcpConfig(file, server);
    writeConfig(file, content);
    expect(JSON.parse(content)).toEqual({ theme: 'dark', mcpServers: { other: { command: 'other' }, 'di-framework': server } });
    expect(mergedMcpConfig(file, server)).toBe(content);
  }));
  for (const invalid of ['{broken', 'null', '[]', '{"mcpServers":[]}']) {
    test(`rejects invalid configuration ${invalid} without changing it`, () => fixture((_dir, file) => {
      writeFileSync(file, invalid);
      expect(() => mergedMcpConfig(file, server)).toThrow('the file was not changed');
      expect(readFileSync(file, 'utf8')).toBe(invalid);
    }));
  }
  test('rejects unreadable config without replacing it', () => fixture((_dir, file) => {
    mkdirSync(file);
    expect(() => mergedMcpConfig(file, server)).toThrow('Cannot read MCP configuration');
    expect(existsSync(file)).toBe(true);
  }));
  test.skipIf(process.getuid?.() === 0)('rejects permission-denied config unchanged', () => fixture((_dir, file) => {
    writeFileSync(file, '{}');
    chmodSync(file, 0o000);
    try { expect(() => mergedMcpConfig(file, server)).toThrow('Cannot read MCP configuration'); }
    finally { chmodSync(file, 0o600); }
    expect(readFileSync(file, 'utf8')).toBe('{}');
  }));
  test('does not replace a dangling configuration symlink', () => fixture((dir, file) => {
    const target = join(dir, 'missing');
    symlinkSync(target, file);
    expect(() => mergedMcpConfig(file, server)).toThrow('Cannot read MCP configuration');
    expect(readlinkSync(file)).toBe(target);
  }));
  test('preview reads existing config and creates no new files', () => fixture((dir, file) => {
    const nested = join(dir, 'nested/mcp.json');
    expect(JSON.parse(mergedMcpConfig(nested, server)).mcpServers['di-framework']).toEqual(server);
    expect(existsSync(join(dir, 'nested'))).toBe(false);
    expect(existsSync(file)).toBe(false);
  }));
});
