import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createDiMcpServer } from './server';

async function main() {
  const server = createDiMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error starting di-framework MCP server:', err);
  process.exit(1);
});
