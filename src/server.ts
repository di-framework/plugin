import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { scaffoldProvider } from './tools/scaffold-provider';
import { validateTokens } from './tools/validate-tokens';
import { analyzeDependencyGraph } from './tools/inspect-graph';
import { searchDocs } from './tools/search-docs';
import { getDocWindow } from './tools/window';

export function createDiMcpServer(): Server {
  const server = new Server(
    {
      name: 'di-framework-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'di_search_docs',
          description:
            'Performs vector/semantic search over the official di-framework documentation, automatically scoped to the installed framework version in the workspace (or latest).',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query or concept (e.g. "scoped child container", "http middleware", "event subscribers")',
              },
              version: {
                type: 'string',
                description: 'Optional version override (e.g. "v4.2", "latest"). Defaults to auto-detected package.json version.',
              },
              maxHits: {
                type: 'number',
                description: 'Maximum number of doc hits to return (defaults to 5)',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'di_scaffold_provider',
          description: 'Scaffolds a new di-framework service interface, token, default implementation, and provider object.',
          inputSchema: {
            type: 'object',
            properties: {
              serviceName: {
                type: 'string',
                description: 'Name of the service (e.g. AuthService, PaymentService)',
              },
              lifecycle: {
                type: 'string',
                enum: ['Singleton', 'Scoped', 'Transient'],
                description: 'Lifecycle scope (defaults to Singleton)',
              },
            },
            required: ['serviceName'],
          },
        },
        {
          name: 'di_validate_tokens',
          description: 'Validates a list of tokens and provider bindings to ensure all required services are registered.',
          inputSchema: {
            type: 'object',
            properties: {
              tokens: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    hasProvider: { type: 'boolean' },
                  },
                  required: ['name', 'hasProvider'],
                },
              },
            },
            required: ['tokens'],
          },
        },
        {
          name: 'di_window',
          description:
            'Expands context around a matched topic section cursor (slug, chunk id, or index) by neighbor radius, returning targeted adjacent sections without dumping the whole doc.',
          inputSchema: {
            type: 'object',
            properties: {
              topic: {
                type: 'string',
                description: 'The documentation topic slug (e.g. "quick-start", "events", "http-router", "ai-utils")',
              },
              cursor: {
                type: 'string',
                description: 'The section slug, chunk ID, or index to expand around (e.g. "property-injection", "docs_events__subscribers", "0")',
              },
              radius: {
                type: 'number',
                description: 'Number of neighbor sections to include before and after (defaults to 1)',
              },
              version: {
                type: 'string',
                description: 'Optional framework version override (e.g. "v4.2", "latest")',
              },
            },
            required: ['topic', 'cursor'],
          },
        },
        {
          name: 'di_inspect_graph',
          description: 'Analyzes DI container dependency graphs for cycles and missing dependencies.',
          inputSchema: {
            type: 'object',
            properties: {
              files: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of file paths to analyze for DI registrations and resolutions',
              },
            },
            required: ['files'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'di_search_docs') {
      const query = String(args?.query ?? '');
      const version = args?.version ? String(args.version) : undefined;
      const maxHits = args?.maxHits ? Number(args.maxHits) : undefined;
      const result = await searchDocs({ query, version, maxHits });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'di_window') {
      const topic = String(args?.topic ?? '');
      const cursor = String(args?.cursor ?? '');
      const radius = args?.radius ? Number(args.radius) : 1;
      const version = args?.version ? String(args.version) : undefined;
      const result = await getDocWindow({ topic, cursor, radius, version });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result ?? { error: 'Topic or cursor not found' }, null, 2),
          },
        ],
      };
    }

    if (name === 'di_scaffold_provider') {
      const serviceName = String(args?.serviceName ?? 'ExampleService');
      const lifecycle = String(args?.lifecycle ?? 'Singleton');
      const code = scaffoldProvider(serviceName, lifecycle);
      return {
        content: [{ type: 'text', text: code }],
      };
    }

    if (name === 'di_validate_tokens') {
      const tokens = (args?.tokens as any[]) ?? [];
      const result = validateTokens(tokens);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === 'di_inspect_graph') {
      const files = (args?.files as string[]) ?? [];
      const result = analyzeDependencyGraph(files);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    throw new Error(`Tool not found: ${name}`);
  });

  return server;
}
