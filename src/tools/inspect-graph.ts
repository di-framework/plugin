import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

export interface Location { file: string; line: number; column: number }
export interface DependencyNode {
  token: string;
  container: string;
  dependencies: string[];
  location: Location;
}
export interface GraphReport {
  status: 'complete' | 'incomplete';
  scope: string;
  nodes: DependencyNode[];
  cycles: string[][];
  unresolved: string[];
  findings: { kind: string; message: string; path: string[]; location: Location }[];
  limitations: { message: string; location: Location }[];
}

/** Static inspection only: never imports or executes application code. */
export function analyzeDependencyGraph(sourceFiles: string[]): GraphReport {
  if (!Array.isArray(sourceFiles) || !sourceFiles.length || sourceFiles.some(f => typeof f !== 'string' || !f.trim())) {
    throw new Error('files must be a non-empty array of source file paths');
  }
  const report: GraphReport = {
    status: 'complete',
    scope: 'Static, file-local Container registrations for @di-framework/core 5.3.x. Execution order is not modeled. No application code is executed; runtime metadata, imported classes and container composition require further inspection.',
    nodes: [], cycles: [], unresolved: [], findings: [], limitations: [],
  };
  for (const file of new Set(sourceFiles.map(f => resolve(f)))) {
    let text: string;
    try { text = readFileSync(file, 'utf8'); }
    catch (error) { throw new Error(`Cannot read source file ${file}: ${(error as Error).message}`); }
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const loc = (node: ts.Node): Location => {
      const p = source.getLineAndCharacterOfPosition(node.getStart(source));
      return { file, line: p.line + 1, column: p.character + 1 };
    };
    const limit = (node: ts.Node, message: string) => report.limitations.push({ message, location: loc(node) });
    const classes = new Map<string, ts.ClassDeclaration>();
    const containers = new Set<string>();
    const constructors = new Set<string>();
    const components = new Set<string>();
    const token = (node: ts.Node | undefined): string | undefined => node && (ts.isStringLiteral(node) || ts.isIdentifier(node)) ? node.text : undefined;
    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && ['@di-framework/core', '@di-framework/core/container', '@di-framework/core/decorators'].includes(statement.moduleSpecifier.text)) {
        const bindings = statement.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) for (const spec of bindings.elements) {
          const original = (spec.propertyName ?? spec.name).text;
          if (original === 'Container' && statement.moduleSpecifier.text !== '@di-framework/core/decorators') constructors.add(spec.name.text);
          if (original === 'Component' && statement.moduleSpecifier.text === '@di-framework/core/decorators') components.add(spec.name.text);
          if (original === 'container' && statement.moduleSpecifier.text !== '@di-framework/core/decorators') containers.add(spec.name.text);
        }
      }
      if (ts.isClassDeclaration(statement) && statement.name) classes.set(statement.name.text, statement);
    }
    const walk = (node: ts.Node, visit: (node: ts.Node) => void) => { visit(node); ts.forEachChild(node, child => walk(child, visit)); };
    walk(source, node => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isNewExpression(node.initializer) && constructors.has(node.initializer.expression.getText(source))) {
        containers.add(node.name.text);
        if (!ts.isVariableDeclarationList(node.parent) || node.parent.parent.parent !== source) limit(node, 'Container is not declared at file top level; runtime instances are not distinguished.');
      }
    });
    const syntax = (source as ts.SourceFile & { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics ?? [];
    for (const diagnostic of syntax) limit(source, `Source syntax error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
    walk(source, node => {
      if (!ts.isIdentifier(node) || !containers.has(node.text)) return;
      const parent = node.parent;
      if ((ts.isVariableDeclaration(parent) && parent.name === node) || ts.isImportSpecifier(parent)) return;
      if (ts.isPropertyAccessExpression(parent) && parent.expression === node && ts.isCallExpression(parent.parent) && parent.parent.expression === parent) {
        if (!['register', 'registerFactory', 'registerValue', 'resolve', 'has', 'getServiceNames'].includes(parent.name.text)) limit(parent, 'Container operation is not modeled.');
        return;
      }
      limit(node, 'Container binding escapes direct inspection (alias, helper argument or reassignment).');
    });
    const key = (container: string, name: string) => `${file}#${container}:${name}`;
    const localNodes = new Map<string, DependencyNode>();
    const resolutions: { container: string; token: string; location: Location }[] = [];
    walk(source, node => {
      if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
      const method = node.expression.name.text;
      const receiver = node.expression.expression.getText(source);
      if (!['register', 'registerFactory', 'registerValue', 'resolve', 'fork', 'clear', 'construct'].includes(method)) return;
      if (!containers.has(receiver)) { limit(node, `Call ${receiver}.${method} is outside supported direct container bindings.`); return; }
      if (['fork', 'clear', 'construct'].includes(method)) { limit(node, `${method} changes runtime graph semantics and is not statically modeled.`); return; }
      const name = token(node.arguments[0]);
      if (!name || (node.arguments[0] && ts.isIdentifier(node.arguments[0]) && !classes.has(name))) {
        limit(node, 'Computed tokens and imported/aliased class tokens require runtime or cross-file inspection.'); return;
      }
      if (ts.isStringLiteral(node.arguments[0]!) && classes.has(name)) limit(node, 'String token collides with a local class name; constructor and string identity are not interchangeable for every registration.');
      if (method === 'resolve') { resolutions.push({ container: receiver, token: name, location: loc(node) }); return; }
      let parent: ts.Node | undefined = node.parent;
      while (parent && parent !== source) {
        if (ts.isIfStatement(parent) || ts.isSwitchStatement(parent) || ts.isTryStatement(parent) || ts.isIterationStatement(parent, false) || ts.isFunctionLike(parent) || ts.isConditionalExpression(parent) || ts.isBinaryExpression(parent)) {
          limit(node, 'Conditional or function-scoped registration may not run.'); break;
        }
        parent = parent.parent;
      }
      const dependencies: string[] = [];
      if (method === 'register') {
        const cls = classes.get(name);
        if (!cls) { limit(node, 'Class definition is not available in this file.'); return; }
        if (cls.heritageClauses?.length) limit(cls, 'Inherited injection is not inspected.');
        walk(cls, member => {
          if (ts.isDecorator(member)) {
            const expr = member.expression;
            if (ts.isCallExpression(expr) && components.has(expr.expression.getText(source))) {
              const dep = token(expr.arguments[0]);
              if (dep && (!ts.isIdentifier(expr.arguments[0]!) || classes.has(dep))) dependencies.push(dep);
              else limit(member, 'Injection token is inferred, imported or computed.');
            } else limit(member, 'Decorator behavior is not inspected.');
          }
          if (ts.isParameter(member) && ts.isConstructorDeclaration(member.parent) && !ts.getDecorators(member)?.length) {
            limit(member, 'Constructor injection without an explicit @Component token depends on emitted metadata.');
          }
        });
      } else if (method === 'registerFactory') {
        const factory = node.arguments[1];
        if (!factory || !(ts.isArrowFunction(factory) || ts.isFunctionExpression(factory))) limit(node, 'Only inline factory bodies are inspected.');
        else walk(factory.body, child => {
          if (ts.isFunctionLike(child)) { limit(child, 'Nested factory callbacks are deferred; their dependencies are not modeled as eager edges.'); return; }
          for (let parent: ts.Node | undefined = child.parent; parent && parent !== factory; parent = parent.parent) {
            if (ts.isFunctionLike(parent)) return;
          }
          if (ts.isCallExpression(child)) {
            if (ts.isPropertyAccessExpression(child.expression) && child.expression.expression.getText(source) === receiver && child.expression.name.text === 'resolve') {
              const dep = token(child.arguments[0]);
              if (dep && (!ts.isIdentifier(child.arguments[0]!) || classes.has(dep))) dependencies.push(dep); else limit(child, 'Factory resolves a computed or imported token.');
            } else limit(child, 'Factory calls a helper whose dependencies are not inspected.');
          }
          if (ts.isNewExpression(child)) limit(child, 'Factory constructs an instance whose runtime behavior is not inspected.');
        });
      }
      const id = key(receiver, name);
      if (localNodes.has(id)) limit(node, `Repeated registration of ${name}; runtime order may affect dependencies.`);
      const entry = { token: name, container: `${file}#${receiver}`, dependencies: [...new Set(dependencies)], location: loc(node) };
      localNodes.set(id, entry);
    });
    if (!localNodes.size) limit(source, 'No supported direct registrations found; this is not a clean application graph.');
    report.nodes.push(...localNodes.values());
    const missing = (container: string, dep: string, path: string[], location: Location) => {
      if (!localNodes.has(key(container, dep))) {
        report.unresolved.push(key(container, dep));
        report.findings.push({ kind: 'missing-registration', message: `No registration for ${dep} in inspected container ${container}.`, path, location });
      }
    };
    for (const entry of localNodes.values()) for (const dep of entry.dependencies) missing(entry.container.split('#').at(-1)!, dep, [entry.token, dep], entry.location);
    for (const entry of resolutions) missing(entry.container, entry.token, [entry.token], entry.location);
    const done = new Set<string>();
    const visit = (id: string, path: string[]) => {
      const index = path.indexOf(id);
      if (index >= 0) {
        const cycle = [...path.slice(index), id];
        report.cycles.push(cycle);
        report.findings.push({ kind: 'cycle', message: 'Static dependency cycle detected.', path: cycle, location: localNodes.get(id)!.location });
        return;
      }
      if (done.has(id)) return;
      const entry = localNodes.get(id);
      if (!entry) return;
      for (const dep of entry.dependencies) visit(`${entry.container}:${dep}`, [...path, id]);
      done.add(id);
    };
    for (const id of localNodes.keys()) visit(id, []);
  }
  report.unresolved = [...new Set(report.unresolved)];
  if (report.limitations.length) report.status = 'incomplete';
  return report;
}
