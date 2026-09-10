import { DocsError, record, requestDocs, requireInteger, requireString, type DocsTransport } from './docs-client';
import { resolveDocsVersion, type DocsVersionOptions, type DocsVersionResolution } from './docs-version';
export interface WindowOptions extends DocsVersionOptions { topic: string; cursor: string; radius?: number }
export interface WindowChunk { id: string; url: string; title: string; breadcrumbs: string; content: string }
export interface WindowResult {
  topic: string;
  version: string;
  cursor: string;
  radius: number;
  currentIndex: number;
  totalSections: number;
  chunks: WindowChunk[];
  resolution: DocsVersionResolution;
  endpoint: string;
  endpointFallbacks: Awaited<ReturnType<typeof requestDocs>>['endpointFallbacks'];
}

/** Pass a search hit's window object to preserve the exact topic, cursor and resolved version. */
export async function getDocWindow(options: WindowOptions, transport?: DocsTransport): Promise<WindowResult> {
  requireString(options.topic, 'topic');
  requireString(options.cursor, 'cursor');
  const radius = options.radius ?? 1;
  requireInteger(radius, 'radius', 0, 5);
  const resolution = resolveDocsVersion(options);
  const version = resolution.resolvedVersion;
  const params = new URLSearchParams({ radius: String(radius), version });
  const { data, endpoint, endpointFallbacks } = await requestDocs(`/window/${encodeURIComponent(options.topic)}/${encodeURIComponent(options.cursor)}?${params}`, transport);
  if (!record(data) || data.version !== version || data.topic !== options.topic || data.cursor !== options.cursor || data.radius !== radius || !Number.isInteger(data.currentIndex) || !Number.isInteger(data.totalSections) || data.currentIndex < 0 || data.totalSections <= data.currentIndex || !Array.isArray(data.chunks) || !data.chunks.length || data.chunks.length > 2 * radius + 1 || !data.chunks.every((chunk: unknown) => record(chunk) && ['id', 'url', 'title', 'breadcrumbs', 'content'].every(key => typeof chunk[key] === 'string'))) {
    throw new DocsError('invalid_response', 'Window response has invalid sections or does not match the requested topic, cursor, radius and version', { endpoint, version });
  }
  return { topic: data.topic, version, cursor: data.cursor, radius, currentIndex: data.currentIndex, totalSections: data.totalSections, chunks: data.chunks, resolution, endpoint, endpointFallbacks };
}
