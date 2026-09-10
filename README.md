# @di-framework/plugin

Official Agent Plugin and Model Context Protocol (MCP) Server for **`di-framework`**.

Equips AI coding assistants with deep knowledge of `di-framework`, version-scoped semantic documentation search, section context expansion, architectural conventions, and diagnostic tools.

---

## Supported Coding Agents

The installer supports **Cursor** and **Claude Code**. It writes the configuration locations documented by [Cursor](https://prod.cursor.com/help/customization/mcp) and [Claude Code](https://code.claude.com/docs/en/mcp). Other stdio MCP clients can use the manual command below; automatic installation for Claude Desktop, Junie, Codex, Hermes, Gemini CLI, and Antigravity is not implemented.

| Agent | Project configuration | User configuration (`--global`) |
| --- | --- | --- |
| Cursor | `.cursor/mcp.json` | `~/.cursor/mcp.json` |
| Claude Code | `.mcp.json` | `~/.claude.json` |

Project installs also copy Cursor rules or all bundled Claude Code skills. Global Claude Code installs copy all bundled skills to `~/.claude/skills`. Global Cursor rules are not installed. Claude Code may ask you to approve project MCP servers before use.

---

## What's Included

1. **Version-Scoped Semantic Documentation Search (`di_search_docs`)**:
   - Queries the live Cloudflare Workers AI + Vectorize search engine at `https://search.di-framework.dev`.
   - Automatically detects your project's installed `@di-framework/*` package version (e.g. `v4.2`, `v5.0`) or falls back to `latest`.
2. **Context Window Expansion (`di_window`)**:
   - Fetches targeted adjacent sections and complete code blocks around a matched heading or cursor without dumping the whole document.
3. **Coding Rules & Conventions (`rules/AGENTS.md`, `.cursor/rules/di-framework.mdc`)**:
   - Enforces pure static factory methods, typed injection tokens, child scopes, and container immutability.
4. **Scaffolding & Diagnostics**:
   - `di_scaffold_provider`: Scaffolds boilerplate service interfaces, tokens, and providers.
   - `di_validate_tokens` & `di_inspect_graph`: Validates registrations and detects circular dependencies.
5. **CLI Installer (`bin/cli.ts`)**:
   - Merges MCP configuration for detected Cursor and Claude Code installations.

---

## Installation

### In a Project Workspace (Recommended)
Detects Cursor (`.cursor` or `.cursorrules`) and Claude Code (`.claude` or `.mcp.json`) in your workspace. If neither is present, select an agent explicitly:

```bash
npx @di-framework/plugin install
# or
bunx @di-framework/plugin install
```

### Target a Specific Agent
```bash
npx @di-framework/plugin install --agent cursor
npx @di-framework/plugin install --agent claude
npx @di-framework/plugin install --agent all
```

### Globally (Machine-Wide)
```bash
npx @di-framework/plugin install --global --agent cursor
```

The installer copies a bundled runtime, rules, and skills into `.di-framework/plugin` (or `~/.di-framework/plugin` for user installs). Registrations launch that durable CLI with `serve` using the installing Node/Bun executable, so deleting an `npx` cache does not break them. Keep that runtime executable installed; rerun installation after moving the workspace or replacing its runtime. Generated absolute paths are machine-specific.

Existing unrelated settings and servers are preserved. Invalid or unreadable JSON aborts before changing installation files. Use `--dry-run` to validate and preview without writes. `update` repeats the merge without duplicate registrations; choose a package version on the runner, for example `npx -y @di-framework/plugin@1.0.0 update --agent cursor`.

Installation initializes the copied MCP server and verifies discovery of all five tools before saving configurations. To repeat this check:

```bash
npx -y @di-framework/plugin check
# For a user install:
npx -y @di-framework/plugin check --global
```

The check verifies protocol startup and tool discovery, not remote documentation-service availability or tool results.

---

## MCP Server Manual Configuration

If your environment uses a manual MCP client configuration:

```json
{
  "mcpServers": {
    "di-framework": {
      "command": "npx",
      "args": ["-y", "@di-framework/plugin@latest", "serve"]
    }
  }
}
```

`serve` is required: invoking the CLI without a command displays help. For Bun, the equivalent is `bunx @di-framework/plugin serve`.

### Tested scope

`bun test` covers safe configuration merging, including permission failures. After `bun run build`, `bun test/packed-smoke.ts` packs the publishable artifact and checks MCP initialization and tool discovery under Node and Bun, both generated adapter configurations, dry-run, invalid JSON, repeat installation, and startup and updates from the durable runtime after deleting the source package. It also exercises `npx` with the packed artifact and deletes its cache before checking the installed server. These are protocol/configuration tests; interactive Cursor and Claude Code UI discovery has not been automated.

---

## License

Dual-licensed under either Apache-2.0 or MIT at your option.
