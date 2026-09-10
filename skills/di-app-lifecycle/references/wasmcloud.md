# wasmCloud application workflow (5.3.0)

Verified command names and configuration against the
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

If the requested task includes creating a local managed platform, the extension provides
`di-framework wasmcloud platform init` and `di-framework wasmcloud platform deploy local`.
Inspect their help and generated target configuration first. Application destroy and
platform destroy have different scope; teardown belongs only to explicitly requested
cleanup or resources created for an authorized temporary test.

The plugin's example suite verifies native authoring behavior. It does **not** run a
wasmCloud build, create infrastructure, or prove a host/toolchain combination works;
perform the checks above in the actual application environment when that is the task.
