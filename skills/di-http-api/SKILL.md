---
name: di-http-api
description: Build or test di-framework HTTP APIs, route middleware, authentication guards, and resource authorization.
---

# HTTP API workflows

Inspect the app's resolved `@di-framework/core`, `http`, `auth`, and optional `authz`
versions, lockfile, router entrypoint, and TypeScript configuration before changing routes.
The bundled example is tested with **5.3.0**. For other versions, verify published types
and tagged source; report unverified combinations instead of assuming compatibility.

Use `TypedRouter`, `json`, and `RequestSpec`/`ResponseSpec` from `@di-framework/http`.
Middleware goes in router `before` or per-route `{ use: [...] }`. A returned response
short-circuits the route. Put authentication before authorization and body parsing;
use `withAuthErrors()` to translate auth failures to generic HTTP errors.

Read [the executable example](examples/http-api.ts) for a public health route, protected
route, injected credential strategy and authorization manager, and 401/403/200 tests.
Its literal credentials are test doubles. In an application, reuse the configured
`registerAuth` runtime's session/bearer strategy or its existing trusted identity provider.
Read the versioned [auth guide](https://github.com/di-framework/di-framework/blob/v5.3.0/packages/di-framework-auth/README.md)
for stores, secret configuration, cookies/CSRF and protocol route mounting when needed.

`withAuthRoutes(router)` supplies a typed principal and route-level `authorization`
options. Policies may be application-owned `AuthorizationManager` implementations.
For resource policies, consult the [authz guide](https://github.com/di-framework/di-framework/blob/v5.3.0/packages/di-framework-authz/README.md):
import policy declarations before constructing the manager, load trusted resource data,
and put `@ResourceAuthorization` above `@Controller`. Deny rules take precedence.
Do not combine resource decorators with conflicting route-level authorization options.

For OpenAPI controllers, `@Controller` registers DI classes; static handlers can resolve
instances through `useContainer()`. `@Component` needs legacy decorators enabled.
Metadata and TypeScript body types do not replace runtime domain validation. Test invalid
content types/bodies and missing/invalid/insufficient credentials as well as success.

Use the installed CLI's `di-framework http openapi generate --help` before generating
from explicit controller modules. Search further APIs using `di_search_docs` with the
resolved version and expand via `di_window` with the same version. Check provenance and
fall back to matching tagged source when versioned docs are unavailable.

From the plugin checkout, run `bun run check:examples`; when copying the example into an
app, preserve its legacy-decorator tsconfig and installed package versions.
