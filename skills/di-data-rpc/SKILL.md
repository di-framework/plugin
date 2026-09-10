---
name: di-data-rpc
description: Add repository-backed di-framework services, test storage adapters, or define and consume typed RPC contracts.
---

# Data services and RPC boundaries

Inspect resolved core/repo/rpc versions, lockfile, compiler decorators, data models,
and existing storage/transport configuration first. Bundled examples support **5.3.0**.
Use exact-version docs/public declarations for another release and report gaps before
adapting examples. Request version-scoped `di_search_docs`/`di_window` results; check
provenance rather than silently accepting latest.

## Repository-backed services

Read [repository.ts](examples/repository.ts) for a DI factory injecting an
`InMemoryRepository` into a domain service. It tests save, lookup, update, missing
records, delete, and isolation. Create a fresh repository/container per test.
`@Repository` is optional registration convenience, not required for storage access.

For durable storage, use the installed adapter's `StorageAdapter` contract. The
[5.3.0 repository guide](https://github.com/di-framework/di-framework/blob/v5.3.0/packages/di-framework-repo/README.md)
covers `BunSqliteAdapter` and `D1Adapter` options and model identity metadata. Create the
schema explicitly; these adapters do not run migrations. Test actual adapter behavior
with an isolated database in addition to in-memory service tests; persistence,
transactions, serialization and concurrency are not established by an in-memory test.

## RPC contracts and consumers

Read [rpc.ts](examples/rpc.ts) for decorated request/reply messages, a typed service,
a memory server/client round trip and batch. Enable `experimentalDecorators`; field
numbers/types and method input/output factories supply the runtime schema. Preserve
existing field numbers when evolving a contract. A type-only client requires an explicit
service path because TypeScript generics disappear at runtime.

The published 5.3.0 RPC root imports its protobuf/Connect peers even for the memory
example. The tested set includes `@bufbuild/protobuf@2.13.0`,
`@connectrpc/connect@2.1.2`, and `@connectrpc/connect-node@2.1.2`. A missing peer is a
package loading problem, not a failed dependency registration.

Consult the [RPC guide](https://github.com/di-framework/di-framework/blob/v5.3.0/packages/di-framework-rpc/README.md)
when replacing memory with `/http`, `/grpc`, or `/socket` transports. Verify the installed
transport's peers/configuration. Test network routing, serialization failures,
timeouts/cancellation, auth interceptors and application errors for the chosen transport.
Stop servers/transports after tests. A memory round trip establishes contract wiring,
not deployment connectivity or authentication.

Run all bundled examples with `bun run check:examples` from the plugin checkout. Keep
application tests runnable with the project's existing test command after adaptation.
