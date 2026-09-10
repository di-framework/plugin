# di-framework conventions

These bundled rules support @di-framework/core 5.3.0. Inspect the target project's
resolved package versions, lockfile, and decorator/compiler configuration first. For
other releases, verify public types and versioned documentation before prescribing APIs.

- Register classes with `register(Service, { singleton: true | false })`, factories with
  `registerFactory(token, () => value, options)`, or existing values with `registerValue`.
  Singleton defaults to true. Class constructors and string tokens are supported.
- Import decorators from `@di-framework/core/decorators`. Use explicit `@Component`
  injection or factory arguments; types alone do not establish runtime injection.
- Follow the application's explicit or global container convention. Static handlers and
  `useContainer()` are supported framework patterns. Keep one installed core instance.
- Resolve class registrations consistently by constructor: class-name aliases may cache
  separate instances in 5.3.0. Avoid accidental registration overrides.
- `fork()` copies registrations and resets singleton caches unless `carrySingletons` is
  true. It is not a parent-linked scope, and factory closures retain captured containers.
  Configure request-specific values and factories explicitly in isolated forks.
- Test required dependency resolution and lifecycle behavior. Static diagnostic tools
  cannot prove dynamic registrations work; inspect incomplete-analysis diagnostics.
- Search documentation with the resolved version and retain that version when expanding
  windows. Refresh rules, skills, examples and scaffold tests together for new releases.
