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

- **Documentation tools:** `di_search_docs` resolves the target project's installed framework version (with provenance), and `di_window` expands a matching section using the same version. Missing or ambiguous version information is reported; remote endpoint fallback does not silently change the requested version.
- **DI rules and scaffolding:** Class registration, explicit injection, singleton/transient behavior, and independent container forks verified against **@di-framework/core 5.3.0**. `di_scaffold_provider` generates a service class and registration helper; pass the target's resolved `frameworkVersion`. Other scaffold versions are rejected.
- **Diagnostics:** `di_inspect_graph` inspects supported source patterns and reports incomplete analysis for unsupported constructs. `di_validate_tokens` checks caller-supplied registration assertions only. Runtime resolution tests remain necessary.
- **Installer:** Merges supported agent MCP settings and distributes the bundled rules and skills.

| Skill | Tasks |
| --- | --- |
| `di-framework-api` | Register and inject services, choose lifecycles, diagnose container behavior |
| `di-http-api` | Build HTTP routes with middleware, authentication and authorization |
| `di-data-rpc` | Add repository-backed services, test adapters, define and consume RPC contracts |
| `di-app-lifecycle` | Run, test, build and diagnose apps; prepare and verify wasmCloud deployments |

All skills inspect the target's resolved versions and configuration before prescribing APIs. Bundled examples target **5.3.0**; other releases require verification against their published declarations and versioned source. Detailed task guidance links to the framework docs rather than maintaining another API manual. Planned workflows are tracked through [docs issue 12](https://github.com/di-framework/docs/issues/12) and are added only after implementation and documentation ship.

`bun run check:examples` typechecks and executes the bundled DI, HTTP authentication/authorization, repository, and RPC examples against pinned published packages. Generated scaffolds are separately compiled and tested for singleton/transient identity. These native tests do not run wasmCloud component builds or infrastructure deployments; the lifecycle skill describes verification in the target environment.

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
