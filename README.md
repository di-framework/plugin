# @di-framework/plugin

Official Antigravity Agent Plugin and Model Context Protocol (MCP) Server for **`di-framework`**.

This package provides AI agents with deep knowledge of `di-framework`, progressive API skill runbooks, architectural conventions, and live MCP diagnostic tools.

---

## What's Included

1. **`di-framework-api` Skill** (`skills/di-framework-api/`):
   - Progressive disclosure runbooks for configuring containers, binding tokens, and managing lifecycles.
   - Reference documentation and verified TypeScript examples.
2. **Coding Rules & Conventions** (`rules/AGENTS.md`):
   - Automatic rules to enforce pure static factory methods, typed injection tokens, and lifecycle boundaries.
3. **MCP Diagnostic Server** (`src/`):
   - `di_inspect_graph`: Inspects DI container registrations and checks for circular dependencies.
   - `di_validate_tokens`: Validates token bindings against registered providers.
   - `di_scaffold_provider`: Generates boilerplate service interfaces, tokens, and providers.
4. **CLI Installer & Updater** (`bin/cli.ts`):
   - Fast installation into local workspace (`.agents/plugins/`) or user home (`~/.gemini/config/plugins/`).

---

## Installation

### In a Project Workspace (Recommended)
```bash
bunx @di-framework/plugin install
# or
npx @di-framework/plugin install
```

### Globally (Machine-Wide)
```bash
bunx @di-framework/plugin install --global
```

---

## Usage

Once installed, Antigravity automatically discovers the plugin on startup:
* The **`di-framework-api`** skill activates whenever you ask about dependency injection or container configuration.
* The **MCP Tools** are available for the agent to inspect graphs and scaffold new providers.

---

## Development

```bash
# Install dependencies
bun install

# Run MCP server locally
bun run start

# Build for distribution
bun run build
```
