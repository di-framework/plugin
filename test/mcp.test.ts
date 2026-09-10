import { afterEach, expect, test } from 'bun:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createDiMcpServer } from '../src/server';
const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => { for (const close of cleanup.splice(0)) await close(); });
async function connect() {
  const server = createDiMcpServer();
  const client = new Client({ name: 'plugin-test', version: '1.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  await client.connect(b);
  cleanup.push(async () => { await client.close(); await server.close(); });
  return client;
}
test('MCP initializes, lists the public tools and calls the supplied-data checker', async () => {
  const client = await connect();
  expect(client.getServerVersion()?.name).toBe('di-framework-mcp');
  const { tools } = await client.listTools();
  expect(tools.map(t => t.name).sort()).toEqual(['di_inspect_graph', 'di_scaffold_provider', 'di_search_docs', 'di_validate_tokens', 'di_window']);
  const result = await client.callTool({ name: 'di_validate_tokens', arguments: { tokens: [{ name: 'Store', hasProvider: false }] } });
  expect(result.isError).not.toBe(true);
  const content = result.content as { text: string }[];
  expect(JSON.parse(content[0]!.text).valid).toBe(false);
});
test('MCP invalid inputs and missing files fail instead of clean reports', async () => {
  const client = await connect();
  for (const input of [
    { name: 'di_inspect_graph', arguments: { files: ['/nonexistent-di-source.ts'] } },
    { name: 'di_inspect_graph', arguments: { files: [] } },
    { name: 'di_validate_tokens', arguments: { tokens: [{ name: 'Store', hasProvider: 'true' }] } },
    { name: 'does_not_exist', arguments: {} },
  ]) {
    let failed = false;
    try { failed = (await client.callTool(input)).isError === true; }
    catch { failed = true; }
    expect(failed).toBe(true);
  }
});
