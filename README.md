# @di-framework/plugin

Official Agent Plugin and Model Context Protocol (MCP) Server for **`di-framework`**.

Equips AI coding assistants with deep knowledge of `di-framework`, version-scoped semantic documentation search, section context expansion, architectural conventions, and diagnostic tools.

---

## Supported Coding Agents

Works seamlessly across all modern AI coding assistants and agentic IDEs:

* **Claude** (Claude Code, Claude Desktop)
* **Cursor** (.cursor/mcp.json, .cursor/rules/)
* **JetBrains Junie** (.idea/mcp.json)
* **Hermes Agent & Nous** (.agents/, MCP)
* **Codex & OpenAI Agents** (AGENTS.md, MCP)
* **Google Antigravity & Gemini CLI** (.agents/plugins/)
* **Vibe & Grok** (MCP)

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
5. **Universal CLI Installer (`bin/cli.ts`)**:
   - Automatically provisions config files across all detected coding agents in your workspace.

---

## Installation

### In a Project Workspace (Recommended)
Automatically detects existing `.cursor`, `.claude`, `.idea`, or `.agents` directories in your workspace and configures them:

```bash
npx @di-framework/plugin install
# or
bunx @di-framework/plugin install
```

### Target a Specific Agent
```bash
npx @di-framework/plugin install --agent cursor
npx @di-framework/plugin install --agent claude
npx @di-framework/plugin install --agent junie
npx @di-framework/plugin install --agent antigravity
npx @di-framework/plugin install --agent all
```

### Globally (Machine-Wide)
```bash
npx @di-framework/plugin install --global
```

---

## MCP Server Manual Configuration

If your environment uses a manual MCP client configuration:

```json
{
  "mcpServers": {
    "di-framework": {
      "command": "npx",
      "args": ["-y", "@di-framework/plugin@latest"]
    }
  }
}
```

---

## License

Dual-licensed under either Apache-2.0 or MIT at your option.
