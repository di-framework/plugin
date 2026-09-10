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

describe('target project version resolution', () => {
  test('uses installed patch version instead of the declared range floor', () => {
    const root = fixture();
    manifest(join(root, 'package.json'), { dependencies: { '@di-framework/core': '^5.0.0' } });
    manifest(join(root, 'node_modules/@di-framework/core/package.json'), { name: '@di-framework/core', version: '5.3.7' });
    expect(resolveDocsVersion({ projectPath: root })).toMatchObject({ resolvedVersion: 'v5.3', source: 'installed', packageVersion: '5.3.7' });
  });
  test('resolves hoisted workspace symlinks from nested source directories', () => {
    const root = fixture();
    const target = join(root, 'packages/app/src/nested'); mkdirSync(target, { recursive: true });
    manifest(join(root, 'packages/app/package.json'), { dependencies: { '@di-framework/core': 'workspace:*' } });
    manifest(join(root, 'packages/core/package.json'), { name: '@di-framework/core', version: '5.4.1' });
    mkdirSync(join(root, 'node_modules/@di-framework'), { recursive: true });
    symlinkSync(join(root, 'packages/core'), join(root, 'node_modules/@di-framework/core'));
    expect(resolveDocsVersion({ projectPath: target })).toMatchObject({ resolvedVersion: 'v5.4', source: 'installed' });
  });
  test('nearest workspace installation wins over a root installation', () => {
    const root = fixture(); const target = join(root, 'packages/app');
    manifest(join(target, 'package.json'), { dependencies: { '@di-framework/core': '^5.0.0' } });
    for (const [dir, version] of [[root, '4.2.0'], [target, '5.3.0']]) manifest(join(dir, 'node_modules/@di-framework/core/package.json'), { name: '@di-framework/core', version });
    expect(resolveDocsVersion({ projectPath: target }).resolvedVersion).toBe('v5.3');
  });
  test('explicit version overrides installation and is normalized', () => {
    const root = fixture();
    expect(resolveDocsVersion({ projectPath: root, version: '4.2.9' })).toMatchObject({ requestedVersion: '4.2.9', resolvedVersion: 'v4.2', source: 'override' });
  });
  test('missing installations disclose declaration and latest fallbacks', () => {
    const root = fixture();
    manifest(join(root, 'package.json'), { dependencies: { '@di-framework/core': '^5.0.0' } });
    expect(resolveDocsVersion({ projectPath: root })).toMatchObject({ resolvedVersion: 'v5.0', source: 'declaration', fallbackReason: expect.any(String) });
    manifest(join(root, 'package.json'), { dependencies: { '@di-framework/core': 'workspace:*' } });
    expect(resolveDocsVersion({ projectPath: root })).toMatchObject({ resolvedVersion: 'latest', source: 'latest', fallbackReason: expect.any(String) });
    manifest(join(root, 'package.json'), {});
    expect(resolveDocsVersion({ projectPath: root }).source).toBe('latest');
  });
  test('rejects malformed manifest, project path and version', () => {
    const root = fixture(); writeFileSync(join(root, 'package.json'), '{');
    expect(() => resolveDocsVersion({ projectPath: root })).toThrow('valid package manifest');
    expect(() => resolveDocsVersion({ projectPath: './relative' })).toThrow('absolute');
    expect(() => resolveDocsVersion({ version: '../latest' })).toThrow('version must');
  });
});

