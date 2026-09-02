# di-framework API Reference

## `Container`

| Method | Signature | Description |
| :--- | :--- | :--- |
| `register<T>` | `register<T>(token: Token<T>, provider: Provider<T>): this` | Binds a token to a provider definition. |
| `resolve<T>` | `resolve<T>(token: Token<T>): T` | Resolves an instance for the token. Throws if unregistered. |
| `resolveOptional<T>` | `resolveOptional<T>(token: Token<T>): T \| undefined` | Returns undefined if not registered. |
| `createChildScope` | `createChildScope(): Container` | Creates an isolated child container inheriting parent registrations. |
| `has` | `has(token: Token<any>): boolean` | Checks whether a token is registered. |

## `Lifecycle` Enum

- `Lifecycle.Singleton`: Instantiated once per container hierarchy; shared across all resolutions.
- `Lifecycle.Scoped`: Instantiated once per container scope (e.g., child container).
- `Lifecycle.Transient`: Instantiated afresh upon every `resolve()` call.
