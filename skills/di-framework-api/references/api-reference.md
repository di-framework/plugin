# Core 5.3.0 reference

Verified against the [tagged implementation](https://github.com/di-framework/di-framework/blob/v5.3.0/packages/di-framework-core/container.ts)
and published `@di-framework/core@5.3.0` declarations and runtime.

| API | Behavior |
| --- | --- |
| `new Container()` | Independent container |
| `register(Service, { singleton?: boolean })` | Registers a class; singleton defaults to true |
| `registerFactory(token, () => value, options?)` | String or constructor token; factory receives no container argument |
| `registerValue(token, value)` | Registers an existing value, including undefined |
| `resolve(Service)` / `resolve<T>('token')` | Resolves or throws for an unregistered token |
| `construct(Service, { 0: value })` | Fresh construction with indexed constructor overrides |
| `has(token)` | Registration presence |
| `fork({ carrySingletons?: boolean })` | Copies registrations, optionally carrying already-created singleton instances |
| `clear()` | Clears registrations/listeners and stops container cron jobs |

`@Container({ container?, singleton? })` from the decorators subpath registers a class
in the chosen container (global by default). `@Component(ClassOrString)` supports
constructor parameters and properties. Global `useContainer()` is supported; follow the
application's container convention and avoid mixing distinct installed core copies.

Class and class-name registration keys in 5.3.0 can cache separate instances. Resolve
consistently using the same key, preferably the constructor for class registrations.
A fork has no parent lookup and does not inherit later registrations. Factory closures
still refer to their original container after a fork; register fork-specific factories
on the fork if isolation is required. `carrySingletons` shares only already-cached values.
There is no built-in scoped lifecycle, disposal protocol, `createToken`, `Lifecycle`,
provider-object registration, `resolveOptional`, or `createChildScope` in this release.

Constructor injection fails on missing explicit dependencies. Property injection catches
resolution failures and warns; use constructor injection or an explicit factory when a
missing dependency must fail construction. Circular resolutions throw; remove the cycle
or provide an explicit deferred boundary appropriate to the application.
