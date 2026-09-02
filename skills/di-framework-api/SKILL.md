---
name: di-framework-api
description: >-
  Use this skill when designing, configuring, binding, refactoring, or troubleshooting
  dependency injection containers, service tokens, provider lifecycles, and modules in di-framework.
---

# di-framework API Skill

A comprehensive operational guide for authoring, binding, and resolving dependencies using `di-framework`.

## Quick Start: Creating a Container

```ts
import { Container, createToken, Lifecycle } from '@di-framework/core';

export interface Logger {
  info(message: string): void;
}

export const LOGGER_TOKEN = createToken<Logger>('Logger');

export class ConsoleLogger implements Logger {
  info(message: string) {
    console.log(`[INFO] ${message}`);
  }
}

const container = new Container();

container.register(LOGGER_TOKEN, {
  useClass: ConsoleLogger,
  lifecycle: Lifecycle.Singleton,
});

const logger = container.resolve(LOGGER_TOKEN);
logger.info('Container initialized!');
```

## Common Workflows

### 1. Registering Providers
- **Class Provider:** `{ useClass: MyService, lifecycle: Lifecycle.Singleton }`
- **Value Provider:** `{ useValue: configObject }`
- **Factory Provider:** `{ useFactory: (c) => new Service(c.resolve(DEP_TOKEN)), lifecycle: Lifecycle.Scoped }`

### 2. Scoped Containers (Request Lifecycles)
Create child containers for HTTP requests or transient contexts:
```ts
const requestScope = container.createChildScope();
requestScope.register(REQUEST_CONTEXT_TOKEN, { useValue: currentReq });
const handler = requestScope.resolve(REQUEST_HANDLER_TOKEN);
```

### 3. Documentation Search & Window Expansion
Whenever you need specific API signatures, middleware setups, RPC bindings, or decorators for the framework version used in this project:
- **Search:** Call **`di_search_docs(query: "...")`** to find relevant topics and section slugs.
- **Window Expansion:** If a search snippet cuts off context or you need surrounding sections and code blocks, call **`di_window(topic: "...", cursor: "...", radius: 1)`**. This returns targeted adjacent sections without loading the entire document.

### 4. Diagnostic & Scaffolding Tools
- Call `di_scaffold_provider` to generate new services conforming to framework conventions.
- Call `di_inspect_graph` and `di_validate_tokens` to detect missing registrations or circular references.

## References & Examples
- [API Reference](./references/api-reference.md)
- [Example Patterns](./examples/container-patterns.ts)
