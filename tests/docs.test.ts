import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { resolveDocsVersion } from '../src/tools/docs-version';
import { requestDocs, type DocsTransport } from '../src/tools/docs-client';
import { searchDocs } from '../src/tools/search-docs';
import { getDocWindow } from '../src/tools/window';

const roots: string[] = [];
function fixture() { const root = mkdtempSync(join(tmpdir(), 'di-docs-')); roots.push(root); return root; }
function manifest(path: string, pkg: unknown) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(pkg)); }
afterEach(() => { roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })); });
const endpoints = ['https://first.test', 'https://second.test', 'https://third.test'];
function transport(fn: (url: string, init?: RequestInit) => Response | Promise<Response>): DocsTransport {
  return { endpoints, fetch: ((url, init) => fn(String(url), init)) as typeof fetch };
}
const rawHit = { objectID: 'docs_events__subscribers__v5.3', pageTitle: 'Subscribers', breadcrumbs: 'Docs|Events', url: 'https://docs.di-framework.dev/v5.3/events.html#subscribers', _snippetResult: { content: { value: '<b>Subscribe</b> to events' } } };

describe('documentation retrieval', () => {
  test('a hit expands using its exact version and object ID even after installation changes', async () => {
    const root = fixture();
    manifest(join(root, 'node_modules/@di-framework/core/package.json'), { name: '@di-framework/core', version: '5.3.0' });
    const urls: string[] = [];
    const mock = transport(url => {
      urls.push(url);
      return Response.json(url.includes('/preview-search/') ? { hits: [rawHit], nbHits: 1 } : { topic: 'events', version: 'v5.3', cursor: rawHit.objectID, radius: 0, currentIndex: 1, totalSections: 3, chunks: [{ id: rawHit.objectID, url: rawHit.url, title: 'Subscribers', breadcrumbs: 'Docs|Events', content: 'Full section' }] });
    });
    const result = await searchDocs({ projectPath: root, query: 'events' }, mock);
    manifest(join(root, 'node_modules/@di-framework/core/package.json'), { name: '@di-framework/core', version: '6.0.0' });
    const window = await getDocWindow({ ...result.hits[0].window, projectPath: root, radius: 0 }, mock);
    expect(result.hits[0].snippet).toBe('Subscribe to events');
    expect(window.version).toBe('v5.3'); expect(window.radius).toBe(0);
    expect(urls[1]).toContain('version=v5.3'); expect(urls[1]).toContain(rawHit.objectID);
  });
  test('successful empty searches report unknown snapshot support without silently falling back', async () => {
    let calls = 0;
    const result = await searchDocs({ query: 'nothing', version: 'v99.0' }, transport(() => { calls++; return Response.json({ hits: [], nbHits: 0 }); }));
    expect(result.hits).toEqual([]); expect(result.versionSupport).toBe('unknown'); expect(result.version).toBe('v99.0'); expect(calls).toBe(1);
  });
  test.each([[401, 'access_denied'], [403, 'access_denied'], [404, 'not_found'], [410, 'http_error'], [400, 'http_error']])('HTTP %d surfaces %s without endpoint or version fallback', async (status, code) => {
    let calls = 0;
    await expect(searchDocs({ query: 'events', version: 'v5.3' }, transport(() => { calls++; return new Response(null, { status: Number(status) }); }))).rejects.toMatchObject({ code });
    expect(calls).toBe(1);
  });
  test('network outages exhaust at most three endpoints and remain errors', async () => {
    let calls = 0;
    await expect(searchDocs({ query: 'events' }, transport(() => { calls++; throw new Error('offline'); }))).rejects.toMatchObject({ code: 'network_error', details: { attempts: expect.any(Array) } });
    expect(calls).toBe(3);
  });
  test('server errors remain distinct from empty matches', async () => {
    await expect(searchDocs({ query: 'events' }, transport(() => new Response(null, { status: 503 })))).rejects.toMatchObject({ code: 'service_error' });
  });
  test('successful endpoint fallback is visible and preserves version', async () => {
    const result = await searchDocs({ query: 'events', version: 'v5.3' }, transport(url => url.startsWith(endpoints[0]) ? new Response(null, { status: 503 }) : Response.json({ hits: [rawHit], nbHits: 1 })));
    expect(result.endpoint).toBe(endpoints[1]); expect(result.endpointFallbacks).toEqual([{ endpoint: endpoints[0], code: 'service_error', status: 503 }]);
  });
  test('deadline bounds hung requests even if fetch ignores abort', async () => {
    const start = performance.now();
    await expect(requestDocs('/test', { ...transport(() => new Promise(() => {})), timeoutMs: 25 })).rejects.toMatchObject({ code: 'timeout' });
    expect(performance.now() - start).toBeLessThan(500);
  });
  test('deadline also bounds a stalled response body', async () => {
    await expect(requestDocs('/test', { ...transport(() => new Response(new ReadableStream({ start() {} }))), timeoutMs: 25 })).rejects.toMatchObject({ code: 'timeout' });
  });
  test.each([{ hits: [] }, { hits: [{}], nbHits: 1 }, { hits: [{ ...rawHit, url: 'https://docs.di-framework.dev/v5.3/%ZZ.html' }], nbHits: 1 }, { hits: [{ ...rawHit, url: 'https://docs.di-framework.dev/v4.2/events.html' }], nbHits: 1 }])('rejects malformed and mismatched search responses', async body => {
    await expect(searchDocs({ query: 'events', version: 'v5.3' }, transport(() => Response.json(body)))).rejects.toMatchObject({ code: 'invalid_response' });
  });
  test('window failure and malformed JSON cannot become missing topics or empty results', async () => {
    await expect(getDocWindow({ topic: 'events', cursor: '0' }, transport(() => new Response(null, { status: 503 })))).rejects.toMatchObject({ code: 'service_error' });
    await expect(getDocWindow({ topic: 'events', cursor: '0' }, transport(() => new Response('not JSON')))).rejects.toMatchObject({ code: 'invalid_response' });
    await expect(getDocWindow({ topic: 'events', cursor: '0' }, transport(() => Response.json({ version: 'v4.2', chunks: [] })))).rejects.toMatchObject({ code: 'invalid_response' });
  });
  test('invalid inputs fail before any network request', async () => {
    const mock = transport(() => { throw new Error('must not fetch'); });
    await expect(searchDocs({ query: ' ', maxHits: 0 }, mock)).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(getDocWindow({ topic: 'events', cursor: '0', radius: -1 }, mock)).rejects.toMatchObject({ code: 'invalid_input' });
  });
});
