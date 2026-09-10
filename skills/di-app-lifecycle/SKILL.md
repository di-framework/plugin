---
name: di-app-lifecycle
description: Run, test, build, diagnose, or deploy di-framework applications locally or with the wasmCloud CLI extension.
---

# Application lifecycle

Inspect the app's package scripts, resolved framework/CLI versions and lockfile, tsconfig,
entrypoint, `di-framework.config.json`, and (for deployment) `di-framework.deploy.toml`.
Use installed binaries and their `--help`; avoid a one-shot latest CLI changing the
project's toolchain. These workflows are verified against **5.3.0** tagged command
implementations. Runtime requirements and configuration are version-specific.

For an existing application, use its development/test scripts. `di-framework check`
and `di-framework build` are the application CLI commands. They use `ttsc` when available
and fall back to TypeScript; inspect the configured compiler and emitted entry before
running output. `bun run dev` executes source and skips emit-time checks. `mx` commands
are framework-monorepo maintenance commands, not application commands.

For a new app, inspect `di-framework init --help`, scaffold into the requested directory,
install dependencies, then run its generated check/build/dev scripts. Keep package
versions reproducible and verify a real request to the running app. For existing HTTP,
repository or RPC changes, use their project's tests and the relevant bundled example;
`bun run check:examples` in this plugin checks all example types and runs behavior tests.

Diagnose by layer: package resolution and peer dependencies, compiler/decorators,
container registrations, request/transport behavior, then deployment/toolchain. Preserve
the failing command, exit status and relevant error; verify the smallest failing behavior
again after fixing it. `di_inspect_graph` may report incomplete static source analysis; `di_validate_tokens`
checks only caller-supplied assertions. Neither establishes dynamic module initialization
or transport readiness.

For wasmCloud, read [the deployment workflow](references/wasmcloud.md) before choosing
commands or modifying target configuration. Building a component and deploying it require
additional tools; do not infer a working deployment from TypeScript compilation.

For APIs and changing commands, query `di_search_docs` and `di_window` with the target's
resolved version, checking provenance. The
[CLI guide](https://github.com/di-framework/di-framework/blob/v5.3.0/packages/di-framework-cli/README.md)
and matching published package source are the fallback when the docs service cannot
serve that version. When a new release changes these commands, update the examples and
run the affected lifecycle checks before advertising support.

Track future workflow additions via [docs issue 12](https://github.com/di-framework/docs/issues/12)
and its linked implementation issues. Bindings, scheduling, queues, migrations, actors,
and static-assets workflows should be added only for delivered implementations with
versioned documentation and executable validation. Do not turn proposal syntax into
supported commands; existing lower-level APIs do not establish a planned workflow.
