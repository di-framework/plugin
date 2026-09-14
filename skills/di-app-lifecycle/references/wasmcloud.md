# wasmCloud application and platform workflows

Application command names and configuration were verified against the
[tagged extension guide](https://github.com/di-framework/di-framework/blob/v5.3.0/packages/di-framework-cli-plugin-wasmcloud/README.md).
Use the target project's resolved extension and `--help` to confirm flags and requirements.
The extension can be installed as a project dependency; project-local extensions take
precedence over the user-global store. Avoid silently upgrading a global installation.

An HTTP component project needs `di-framework.config.json`, for example:

```json
{ "name": "my-api", "entry": "src/app.ts", "output": "dist/my-api.wasm" }
```

Its entry exports the application's Fetch handler. Reuse its tested router. Then:

```sh
di-framework wasmcloud doctor
di-framework wasmcloud build
di-framework wasmcloud dev
```

Doctor checks project/toolchain readiness. Build generates the component and disposable
`.di-framework` state. Dev builds then chooses a supported local runner (wasmtime,
wash, or jco); inspect its actual endpoint and send a representative HTTP request.
Native local tests do not establish WASI compatibility. Check the generated component's
imports and the target host's supported interfaces when host calls fail.

Deployment uses `di-framework.deploy.toml` targets at the workspace root. Reuse the
user's intended target, namespace, registry and credentials. The selected target may
reference a managed platform or an existing cluster; do not provision a platform merely
because an application needs deploying. Configuration values may interpolate environment
variables; do not copy secrets into generated source/configuration.

Once deployment is within the user's authorized task, use the verified target:

```sh
di-framework wasmcloud deploy my-api --target development
```

This builds, publishes the artifact and applies resources. Verify reported readiness and
perform an HTTP smoke test using the returned address/Host header. Report artifact,
target, readiness and observed response. On failure inspect tool exit output, registry
access and cluster resources before retrying; stop repeated unchanged failures.

## Shared Pulumi platform provisioning

The shared-platform implementation shipped separately from the 5.3.0 application
baseline above. Inspect the installed versions before applying this guidance. See
[framework PR 460](https://github.com/di-framework/di-framework/pull/460) and
[kube PR 6](https://github.com/di-framework/kube/pull/6) for the implementation, and the
[wasmCloud](https://docs.di-framework.dev/wasmcloud.html) and
[kube](https://docs.di-framework.dev/kube.html) guides for configuration details.
Older Helm-only kube binaries do not expose the shared-platform flags.

When the authorized task includes provisioning infrastructure, choose the entrypoint
that owns the intended cluster:

- `di-framework wasmcloud platform init` generates a TypeScript project importing
  `@di-framework/platform/local`, with a pinned package dependency. The local profile
  creates Docker/k0s, a Kubernetes registry, and the wasmCloud platform. Inspect the
  generated target and run `di-framework wasmcloud platform deploy local`.
- `di-framework-kube up` manages Kubesolo and uses `@di-framework/platform/existing`
  for platform provisioning. It requires Node.js, npm, and Pulumi; container mode also
  requires Docker. The integration defaults to `@di-framework/platform@5.3.3` from npm.
  Use `--platform-package @di-framework/platform@<exact-version>` to select a published
  release. Local `file:/absolute/path/package.tgz` overrides are for unpublished
  development changes. Registry provisioning belongs to the caller or example helpers.

Both profiles share the operator, Tenant/User CRDs, tenancy controller, admission
policies, and HTTP routing. Do not copy platform implementation files into an app or
add `@di-framework/platform` merely to deploy an application. For a kube-provisioned
cluster, configure an external application target with its kubeconfig and the intended
registry. Do not create a second managed stack for that cluster.

Preserve the existing project, backend, stack, and configuration when upgrading a
previously generated local project to the package import. Migrate customizations from
copied source deliberately and inspect `pulumi preview` before applying.

Kube persists its project and local backend in `<state-dir>/<name>/platform`, uses stack
`dev`, and stores its generated secrets passphrase in a mode-0600 `.passphrase` file.
Back up the whole instance directory and kubeconfig; do not print or commit secrets.
A cluster ownership claim rejects competing installations. Retry failed updates using
the same instance; do not delete state or ownership to bypass a conflict. Do not run
direct Pulumi operations concurrently with kube lifecycle commands or substitute the
extension's local-development passphrase for kube's generated passphrase.

Kube does not automatically adopt legacy Helm releases or another platform's CRDs.
For a requested migration, back up application data and credentials, arrange downtime,
and remove the legacy platform with `down` before reprovisioning. `--purge-cluster`
deletes cluster data and is not a migration step. Application destroy and platform
destroy have different scope; teardown belongs only to explicitly requested cleanup
or resources created for an authorized temporary test.

## Tenant and user declarations

For kube, `--platform-config /absolute/path/platform.json` accepts declarations such as:

```json
{
  "tenants": [{ "name": "alpha" }],
  "users": [
    { "name": "alice", "memberships": [{ "tenant": "alpha", "role": "developer" }] }
  ]
}
```

Omitting the flag on an update preserves declarations. Supplying a file replaces the
declared configuration; explicit empty arrays clear declarations. Inspect existing
configuration before writing a replacement file.

The controller provisions tenant namespaces, runtimes, Redis/NATS backends, service
accounts, and membership RBAC. User declarations do not configure an identity provider
or issue kubeconfigs; credential issuance remains an administrator operation. Preserve
`allowSharedHosts: false`, watched tenant namespaces, and admission protections.
Managed Kubesolo installs a policy-only kube-router controller; an external cluster
must supply NetworkPolicy enforcement. Do not weaken these controls to make an
application smoke test pass. Tenant storage currently uses single-node host paths.

Verify Tenant/User readiness and the intended user's allowed and denied operations,
then verify the application against its real backend. Operator readiness alone does
not establish tenant isolation or working bindings. Independently requestable backing
service CRDs and `di-framework wasmcloud service create` are not delivered by this
shared-platform integration; do not prescribe proposal commands as supported APIs.

The plugin's example suite verifies native authoring behavior. It does **not** run a
wasmCloud build, create infrastructure, or prove a host/toolchain combination works;
perform the checks above in the actual application environment when that is the task.
