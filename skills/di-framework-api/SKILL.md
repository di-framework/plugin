---
name: di-framework-api
description: Design, register, inject, or troubleshoot services and container lifecycles in di-framework applications.
---

# Dependency injection

Bundled guidance and executable examples support **@di-framework/core 5.3.0**.
Before editing, inspect the target package's installed package metadata and lockfile;
a manifest range is not a resolved version. Check its TypeScript/decorator configuration.
For another release, report that these examples are unverified and consult that release's
public types and tagged source before adapting them. Do not silently substitute latest.

Import `Container` from `@di-framework/core` and decorators from
`@di-framework/core/decorators`. Register classes with `container.register(Service)`;
singleton is the default, `{ singleton: false }` makes resolutions transient.
Use class constructors or string tokens. Inject explicit `@Component(Dependency)`
constructor parameters with `experimentalDecorators: true`, or use an arrow factory
that explicitly resolves dependencies. TypeScript types alone do not guarantee injection.

Start with [the runnable quick start](examples/container-patterns.ts). It exercises
constructor injection, factories, singleton/transient identity, and fork behavior.
Run it in a project with the pinned core package using Bun and legacy decorators enabled.
See [the API reference](references/api-reference.md) for lifecycle caveats and source links.

`di_scaffold_provider` generates a class and registration helper. Pass the target's
resolved `frameworkVersion`; only 5.3.0 is currently supported by the scaffold.
Use `di_inspect_graph` for static source diagnostics. `di_validate_tokens` checks only
caller-supplied registration assertions. Dynamic registration, module initialization,
and factories outside the analyzed forms require runtime tests.
A clean partial analysis does not prove the application resolves correctly.

For additional APIs, call `di_search_docs` with the resolved version, then `di_window`
with the same version and returned topic/cursor. Check returned provenance; if that
version is unavailable, use tagged source instead of treating latest as compatible.

When adding support for a release, compare its published declarations and implementation,
update this skill, reference, examples, scaffold and distributed rules together, and run
the examples and generated scaffold through typechecking and behavior tests against that
exact dependency version before declaring support.
