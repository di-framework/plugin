import { DocsError, record, requestDocs, requireInteger, requireString, type DocsTransport } from './docs-client';
import { resolveDocsVersion, type DocsVersionOptions, type DocsVersionResolution } from './docs-version';
export { SEARCH_ENDPOINTS } from './docs-client';
export { resolveDocsVersion } from './docs-version';

export interface SearchDocsOptions extends DocsVersionOptions { query: string; maxHits?: number }
export interface SearchDocHit {
  title: string;
  breadcrumbs: string;
  url: string;
  snippet: string;
  objectID: string;
  topic: string;
  cursor: string;
  version: string;
  window: { topic: string; cursor: string; version: string };
}
export interface SearchDocsResult {
  version: string;
  resolution: DocsVersionResolution;
  endpoint: string;
  endpointFallbacks: Awaited<ReturnType<typeof requestDocs>>['endpointFallbacks'];
  versionSupport: 'confirmed_by_hits' | 'unknown';
  notice?: string;
  hits: SearchDocHit[];
}
export function detectInstalledDocsVersion(cwd = process.cwd()): string { return resolveDocsVersion({ projectPath: cwd }).resolvedVersion; }
export function cleanSnippet(rawSnippet: string): string { return rawSnippet.replace(/<[^>]+>/g, ''); }

export function formatHit(hit: unknown, version: string): SearchDocHit {
  if (!record(hit) || !['url', 'pageTitle', 'breadcrumbs', 'objectID'].every(key => typeof hit[key] === 'string') || !hit.objectID || !record(hit._snippetResult) || !record(hit._snippetResult.content) || typeof hit._snippetResult.content.value !== 'string') {
    throw new DocsError('invalid_response', 'Search hit is missing required URL, title, breadcrumbs, objectID or snippet fields');
  }
  let url: URL;
  try { url = new URL(hit.url); } catch { throw new DocsError('invalid_response', 'Search hit has an invalid URL'); }
  const topic = /\/([^/]+)\.html$/.exec(url.pathname)?.[1];
  if (!topic || !['https:', 'http:'].includes(url.protocol)) throw new DocsError('invalid_response', 'Search hit URL does not identify an expandable documentation topic');
  const urlVersion = /\/(v\d+\.\d+)\//.exec(url.pathname)?.[1] ?? 'latest';
  if (urlVersion !== version) throw new DocsError('invalid_response', `Search hit version ${urlVersion} differs from requested ${version}`);
  const window = { topic: decodeURIComponent(topic), cursor: hit.objectID, version };
  return { title: hit.pageTitle, breadcrumbs: hit.breadcrumbs.replace(/\|/g, ' > '), url: hit.url, snippet: cleanSnippet(hit._snippetResult.content.value), objectID: hit.objectID, ...window, window };
}

export async function searchDocs(options: SearchDocsOptions, transport?: DocsTransport): Promise<SearchDocsResult> {
  requireString(options.query, 'query');
  const maxHits = options.maxHits ?? 5;
  requireInteger(maxHits, 'maxHits', 1, 50);
  const resolution = resolveDocsVersion(options);
  const version = resolution.resolvedVersion;
  const params = new URLSearchParams({ query: options.query.trim(), maxHits: String(maxHits) });
  const { data, endpoint, endpointFallbacks } = await requestDocs(`/preview-search/docs/d/${encodeURIComponent(version)}?${params}`, transport);
  if (!record(data) || !Array.isArray(data.hits) || !Number.isInteger(data.nbHits) || data.nbHits !== data.hits.length) throw new DocsError('invalid_response', 'Search response must contain hits and a matching nbHits count', { endpoint });
  const hits = data.hits.map(hit => formatHit(hit, version));
  return { version, resolution, endpoint, endpointFallbacks, hits, versionSupport: hits.length ? 'confirmed_by_hits' : 'unknown', ...(hits.length ? {} : { notice: 'The service returned no matches. It does not report supported snapshots, so an unindexed/unsupported version cannot be distinguished from an empty query result. No version fallback was attempted.' }) };
}
