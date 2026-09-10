import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

const packages = ['@di-framework/core', '@di-framework/ai', '@di-framework/http', '@di-framework/repo'];
export interface DocsVersionOptions { projectPath?: string; version?: string }
export interface DocsVersionResolution {
  requestedVersion: string | null;
  resolvedVersion: string;
  projectPath: string;
  source: 'override' | 'installed' | 'declaration' | 'latest';
  packageName?: string;
  packageVersion?: string;
  fallbackReason?: string;
}

export function normalizeDocsVersion(value: string): string {
  if (value === 'latest') return value;
  const match = /^v?(\d+)\.(\d+)(?:\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?)?$/.exec(value);
  if (!match) throw new Error('version must be latest, vMAJOR.MINOR, or a complete package version');
  return `v${match[1]}.${match[2]}`;
}

function readPackage(path: string): Record<string, any> {
  try {
    const pkg: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new Error('Expected manifest object');
    return pkg as Record<string, any>;
  }
  catch { throw new Error(`Cannot read a valid package manifest at ${path}`); }
}

/** Resolve relative to the caller's project, including hoisted and symlinked workspace installs. */
export function resolveDocsVersion(options: DocsVersionOptions = {}): DocsVersionResolution {
  if (options.projectPath !== undefined && (!options.projectPath || !isAbsolute(options.projectPath))) {
    throw new Error('projectPath must be an absolute path to the target project or a directory inside it');
  }
  const projectPath = resolve(options.projectPath ?? process.cwd());
  if (!existsSync(projectPath) || !statSync(projectPath).isDirectory()) throw new Error(`Project directory does not exist: ${projectPath}`);
  const base = { requestedVersion: options.version ?? null, projectPath };
  if (options.version !== undefined) return { ...base, resolvedVersion: normalizeDocsVersion(options.version), source: 'override' };

  const ancestors: string[] = [];
  for (let dir = projectPath; ; dir = dirname(dir)) {
    ancestors.push(dir);
    if (dirname(dir) === dir) break;
  }
  const manifestDir = ancestors.find(dir => existsSync(join(dir, 'package.json')));
  const pkg = manifestDir ? readPackage(join(manifestDir, 'package.json')) : {};
  const deps = { ...pkg.peerDependencies, ...pkg.devDependencies, ...pkg.optionalDependencies, ...pkg.dependencies };
  const declared = packages.filter(name => typeof deps[name] === 'string');
  // Resolve declared packages first; otherwise recognize a hoisted installation.
  for (const name of [...declared, ...packages.filter(name => !declared.includes(name))]) {
    for (const dir of ancestors) {
      const manifest = join(dir, 'node_modules', name, 'package.json');
      if (!existsSync(manifest)) continue;
      const installed = readPackage(manifest);
      if (installed.name !== name || typeof installed.version !== 'string') throw new Error(`Invalid installed package metadata: ${manifest}`);
      return { ...base, resolvedVersion: normalizeDocsVersion(installed.version), source: 'installed', packageName: name, packageVersion: installed.version };
    }
  }
  for (const name of declared) {
    // Only an unambiguous leading semver declaration can supply a fallback. Never extract numbers from URLs or workspace names.
    const match = /^(?:workspace:)?[~^]?(\d+\.\d+\.\d+)(?:-[\w.-]+)?$/.exec(deps[name]);
    if (match) return { ...base, resolvedVersion: normalizeDocsVersion(match[1]), source: 'declaration', packageName: name, packageVersion: deps[name], fallbackReason: 'No installed framework package found; using the dependency declaration, which may differ from the installed version.' };
  }
  return { ...base, resolvedVersion: 'latest', source: 'latest', fallbackReason: declared.length ? 'No installed framework package or concrete semver declaration found (workspace/link/range declarations require an installation).' : 'No framework installation or dependency declaration found in the target project.' };
}
