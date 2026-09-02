import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import createClient, { type Client } from 'openapi-fetch';
import type { paths } from '../contracts/search-api';

export const SEARCH_ENDPOINTS = [
  'https://search.di-framework.dev',
  'https://di-framework-docs-search.seemueller.workers.dev/api/docs/search',
  'https://di-framework.dev/api/docs/search',
];

export interface SearchDocsOptions {
  query: string;
  version?: string;
  maxHits?: number;
}

export interface SearchDocHit {
  title: string;
  breadcrumbs: string;
  url: string;
  snippet: string;
}

export interface SearchDocsResult {
  version: string;
  hits: SearchDocHit[];
}

type SearchClient = Client<paths>;

/**
 * Creates a configured OpenAPI fetch client for the target base URL.
 */
export function createSearchClient(baseUrl: string): SearchClient {
  return createClient<paths>({
    baseUrl,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'di-framework-plugin-mcp/1.0',
    },
  });
}

/**
 * Detects the installed di-framework version from package.json in the current working directory.
 * Returns formatted version like 'v4.2' or 'latest'.
 */
export function detectInstalledDocsVersion(cwd = process.cwd()): string {
  try {
    const pkgPath = join(cwd, 'package.json');
    if (!existsSync(pkgPath)) return 'latest';

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    };

    const rawVersion =
      allDeps['@di-framework/core'] ||
      allDeps['@di-framework/ai'] ||
      allDeps['@di-framework/http'] ||
      allDeps['@di-framework/repo'];

    if (!rawVersion) return 'latest';

    const match = rawVersion.match(/(\d+)\.(\d+)/);
    if (match) {
      return `v${match[1]}.${match[2]}`;
    }
  } catch {
    // Fall back to latest on parse failure
  }
  return 'latest';
}

/**
 * Executes a single versioned search query against the search API.
 */
export async function fetchDocsQuery(
  client: SearchClient,
  version: string,
  query: string,
  maxHits: number
): Promise<any[] | null> {
  const { data, response } = await client.GET(
    '/preview-search/{project}/{instance}/{version}',
    {
      params: {
        path: {
          project: 'docs',
          instance: 'd',
          version,
        },
        query: {
          query: query.trim(),
          maxHits: String(maxHits),
        } as any,
      },
    }
  );

  if (response.ok && data) {
    return (data as any).hits || [];
  }
  return null;
}

/**
 * Queries an endpoint for the requested version, falling back to 'latest' if necessary.
 */
export async function queryEndpointWithFallback(
  client: SearchClient,
  requestedVersion: string,
  query: string,
  maxHits: number
): Promise<SearchDocsResult | null> {
  const primaryHits = await fetchDocsQuery(client, requestedVersion, query, maxHits);
  if (primaryHits !== null) {
    return {
      version: requestedVersion,
      hits: formatHits(primaryHits),
    };
  }

  if (requestedVersion !== 'latest') {
    const fallbackHits = await fetchDocsQuery(client, 'latest', query, maxHits);
    if (fallbackHits !== null) {
      return {
        version: 'latest (fallback)',
        hits: formatHits(fallbackHits),
      };
    }
  }

  return null;
}

/**
 * Removes HTML tags from search highlights and snippets.
 */
export function cleanSnippet(rawSnippet: string): string {
  return rawSnippet.replace(/<[^>]+>/g, '');
}

/**
 * Formats an individual raw search hit into a clean SearchDocHit.
 */
export function formatHit(hit: any): SearchDocHit {
  const rawSnippet = hit._snippetResult?.content?.value || hit.content || '';
  return {
    title: hit.pageTitle || hit.mainTitle || 'Documentation',
    breadcrumbs: (hit.breadcrumbs || '').replace(/\|/g, ' > '),
    url: hit.url,
    snippet: cleanSnippet(rawSnippet),
  };
}

/**
 * Formats a list of raw search hits.
 */
export function formatHits(rawHits: any[]): SearchDocHit[] {
  return rawHits.map(formatHit);
}

/**
 * Main entry point: iterates through candidate search endpoints and retrieves documentation hits.
 */
export async function searchDocs(options: SearchDocsOptions): Promise<SearchDocsResult> {
  const version = options.version || detectInstalledDocsVersion();
  const maxHits = options.maxHits || 5;

  for (const baseUrl of SEARCH_ENDPOINTS) {
    try {
      const client = createSearchClient(baseUrl);
      const result = await queryEndpointWithFallback(client, version, options.query, maxHits);
      if (result) {
        return result;
      }
    } catch {
      // Continue to next endpoint in case of network issue
    }
  }

  return {
    version,
    hits: [],
  };
}
