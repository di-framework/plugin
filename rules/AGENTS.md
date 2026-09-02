# di-framework Architectural Rules & Conventions

When authoring or modifying code within projects using `di-framework`, adhere to the following conventions:

## 1. Token & Provider Declarations
- Use typed `InjectionToken<T>` or Symbols for service identifiers. Avoid raw string tokens for internal bindings.
- Export token instances from dedicated token definitions or co-locate them with interface declarations.
- Every registered provider must specify explicit lifecycle scope (`singleton`, `transient`, or `scoped`).

## 2. Static Methods & Pure Factories
- Static factory methods (e.g. `Service.create(...)`) must be pure and should not access global or ambient container instances.
- Always pass dependencies explicitly through constructor injection or factory arguments.

## 3. Container Immutability & Module Boundaries
- Do not mutate container registrations after the container has been built or started.
- Register all module providers during the configuration phase before calling `.build()` or `.start()`.
- Use child containers or scoped contexts for request/session lifetimes rather than overriding root container bindings.

## 4. Error Handling & Circular Dependencies
- Circular dependencies between services must be resolved via lazy proxies or event-based decoupling.
- Always handle unresolved token errors with descriptive fallbacks or explicit optional token decorators.
