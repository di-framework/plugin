import { mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, statSync, lstatSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface ServerCommand { command: string; args: string[] }
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Read before making any installation changes. Only ENOENT means a new config.
export function mergedMcpConfig(filePath: string, server: ServerCommand): string {
  let config: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!isObject(parsed) || (parsed.mcpServers !== undefined && !isObject(parsed.mcpServers))) {
      throw new Error('expected a JSON object with an object-valued mcpServers property');
    }
    config = parsed;
  } catch (error) {
    let missing = (error as NodeJS.ErrnoException).code === 'ENOENT';
    if (missing) {
      try { lstatSync(filePath); missing = false; } catch (statError) {
        if ((statError as NodeJS.ErrnoException).code !== 'ENOENT') missing = false;
      }
    }
    if (!missing) {
      throw new Error(`Cannot read MCP configuration ${filePath}. Fix its permissions or JSON before retrying; the file was not changed. ${String(error)}`);
    }
  }
  config.mcpServers = { ...(config.mcpServers as Record<string, unknown> | undefined), 'di-framework': server };
  return `${JSON.stringify(config, null, 2)}\n`;
}

export function writeConfig(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${randomUUID()}.tmp`;
  let mode = 0o600;
  try { mode = statSync(filePath).mode & 0o777; } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  try {
    writeFileSync(temporary, content, { mode, flag: 'wx' });
    renameSync(temporary, filePath);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export async function checkServer(server: ServerCommand, cwd = process.cwd()): Promise<string[]> {
  const client = new Client({ name: 'di-framework-health-check', version: '1.0.0' });
  const transport = new StdioClientTransport({ ...server, cwd, stderr: 'inherit' });
  try {
    await client.connect(transport, { timeout: 10_000 });
    const result = await client.listTools({}, { timeout: 10_000 });
    const names = result.tools.map((tool) => tool.name);
    const expected = ['di_search_docs', 'di_window', 'di_scaffold_provider', 'di_validate_tokens', 'di_inspect_graph'];
    if (expected.some((name) => !names.includes(name))) {
      throw new Error(`MCP tool discovery incomplete: ${names.join(', ')}`);
    }
    return names;
  } finally {
    await client.close();
    await transport.close();
  }
}
