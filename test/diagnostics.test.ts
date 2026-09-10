import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeDependencyGraph } from '../src/tools/inspect-graph';
import { validateTokens } from '../src/tools/validate-tokens';
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function fixture(code: string) {
  const dir = mkdtempSync(join(tmpdir(), 'di-graph-')); dirs.push(dir);
  const file = join(dir, 'app.ts');
  writeFileSync(file, `import { Container, Component } from '@di-framework/core';\nconst app = new Container();\n${code}`);
  return file;
}
test('inspects class property injection with source locations', () => {
  const graph = analyzeDependencyGraph([fixture(`class Store {}\nclass Service { @Component(Store) store!: Store; }\napp.register(Store);\napp.register(Service);`)]);
  expect(graph.status).toBe('complete');
  expect(graph.nodes.map(n => [n.token, n.dependencies])).toEqual([['Store', []], ['Service', ['Store']]]);
  expect(graph.findings).toEqual([]);
  expect(graph.nodes[1]!.location.line).toBe(6);
});
test('reports missing factory dependencies and cycles with paths', () => {
  const graph = analyzeDependencyGraph([fixture(`app.registerFactory('A', () => app.resolve('B'));\napp.registerFactory('B', () => app.resolve('A'));\napp.registerFactory('C', () => app.resolve('absent'));`)]);
  expect(graph.status).toBe('complete');
  expect(graph.cycles).toHaveLength(1);
  expect(graph.cycles[0]!.map(k => k.split(':').at(-1))).toEqual(['A', 'B', 'A']);
  expect(graph.findings.some(f => f.kind === 'missing-registration' && f.path.join('/') === 'C/absent')).toBe(true);
});
test('containers and files do not satisfy each other registrations', () => {
  const graph = analyzeDependencyGraph([fixture(`const other = new Container();\nother.registerValue('X', 1);\napp.resolve('X');`), fixture(`app.registerValue('X', 2);`)]);
  expect(graph.unresolved).toHaveLength(1);
});
test('missing files and invalid input fail explicitly', () => {
  expect(() => analyzeDependencyGraph(['/no-such-di-file.ts'])).toThrow('Cannot read source file');
  expect(() => analyzeDependencyGraph([])).toThrow('non-empty');
});
test('dynamic, imported, conditional, helper and empty patterns are incomplete', () => {
  for (const code of [
    `app.registerFactory(getToken(), () => 1);`,
    `app.register(ImportedService);`,
    `if (enabled) app.registerValue('X', 1);`,
    `app.registerFactory('X', makeService);`,
    `app.registerFactory('X', () => helper());`,
    `const child = app.fork();`,
    `class Service { constructor(store: Store) {} } app.register(Service);`,
    `app.registerValue('X', 1); configure(app);`,
    `app.registerValue('X', 1); const alias = app;`,
    `app.registerValue('X', 1); class {`,
    `// no registrations`,
  ]) {
    const graph = analyzeDependencyGraph([fixture(code)]);
    expect(graph.status).toBe('incomplete');
    expect(graph.limitations.length).toBeGreaterThan(0);
  }
});
test('supplied token assertions never claim source validation', () => {
  expect(validateTokens([{ name: 'Store', hasProvider: true }]).scope).toBe('caller-supplied assertions only');
  expect(validateTokens([{ name: 'Store', hasProvider: false }]).valid).toBe(false);
  expect(() => validateTokens([{ name: 'Store', hasProvider: 'yes' } as any])).toThrow('boolean');
});
