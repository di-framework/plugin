# Dependency diagnostics

`di_inspect_graph` reads the supplied TypeScript files without importing or executing them.
Its supported API baseline is `@di-framework/core` 5.3.x. It inspects direct, file-local
`Container` instances, `register`, `registerValue`, inline `registerFactory` calls,
explicit `@Component` injection on local classes, and direct `resolve` calls.

Results include registration locations, dependency paths, missing registrations and
cycles. `status: complete` means the inspected syntax fits this limited static model;
execution order is not modeled, and it does not certify the application's runtime behavior. Findings can exist in a complete
report. File-local containers are not merged across files.

Aliases, helper calls receiving a container, conditional registrations, imported classes,
inferred injection metadata, inheritance, forks and other unsupported patterns produce
`status: incomplete` with locations and reasons. Missing/unreadable files and empty input
are errors. No recognized registrations is incomplete, never a clean graph. Include the
composition root and inspect reported limitations before drawing conclusions.

`di_validate_tokens` only checks supplied `{ name, hasProvider }` assertions. Its `valid`
field describes those assertions; it does not establish that an application registered
anything. Use source inspection and application tests to verify actual behavior.
