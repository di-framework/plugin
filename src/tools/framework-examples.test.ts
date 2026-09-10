import { expect, test } from 'bun:test';
import { resolve } from 'node:path';

for (const file of [
  'di-framework-api/examples/container-patterns.ts',
  'di-http-api/examples/http-api.ts',
  'di-data-rpc/examples/repository.ts',
  'di-data-rpc/examples/rpc.ts',
]) {
  test(`published framework example: ${file}`, async () => {
    // Bun resolves runtime compiler options from cwd; examples need legacy decorators.
    const process = Bun.spawn(['bun', file], {
      cwd: resolve(import.meta.dir, '../../skills'), stdout: 'pipe', stderr: 'pipe',
    });
    const errors = await new Response(process.stderr).text();
    expect(errors).toBe('');
    expect(await process.exited).toBe(0);
  });
}
