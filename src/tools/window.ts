import createClient from 'openapi-fetch';
import type { paths } from '../contracts/search-api';
import { detectInstalledDocsVersion, SEARCH_ENDPOINTS } from './search-docs';

export interface WindowOptions {
  topic: string;
  cursor: string;
  radius?: number;
  version?: string;
}

export interface WindowChunk {
  id: string;
  url: string;
  title: string;
  breadcrumbs: string;
  content: string;
}

export interface WindowResult {
  topic: string;
  version: string;
  cursor: string;
  radius: number;
  currentIndex: number;
  totalSections: number;
  chunks: WindowChunk[];
}

/**
 * Expands context around a matched topic section cursor (slug, chunk id, or index) by neighbor radius.
 */
export async function getDocWindow(options: WindowOptions): Promise<WindowResult | null> {
  const version = options.version || detectInstalledDocsVersion();
  const radius = options.radius ?? 1;

  for (const baseUrl of SEARCH_ENDPOINTS) {
    try {
      const client = createClient<paths>({
        baseUrl,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'di-framework-plugin-mcp/1.0',
        },
      });

      const { data, response } = await client.GET('/window/{topic}/{cursor}', {
        params: {
          path: {
            topic: options.topic,
            cursor: options.cursor,
          },
          query: {
            radius: String(radius),
            version,
          } as any,
        },
      });

      if (response.ok && data && !(data as any).error) {
        return data as WindowResult;
      }
    } catch {
      // Continue to next endpoint in case of network issue
    }
  }

  return null;
}
