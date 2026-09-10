import { test, expect } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { scaffoldProvider } from './scaffold-provider';

test('generated classes compile and honor singleton and transient lifecycles', async () => {
  const dir = await mkdtemp(join(process.cwd(), '.scaffold-test-'));
  try {
    for (const lifecycle of ['Singleton', 'Transient']) {
      const file = join(dir, `${lifecycle}.ts`);
      await Bun.write(file, scaffoldProvider('PaymentService', lifecycle) + `
import assert from 'node:assert/strict';
const container = registerPaymentService(new Container());
assert.${lifecycle === 'Singleton' ? 'equal' : 'notEqual'}(container.resolve(PaymentService), container.resolve(PaymentService));
`);
      const check = Bun.spawn(['bun', 'x', '--no-install', 'tsc', '--noEmit', '--skipLibCheck', '--target', 'ESNext', '--moduleResolution', 'bundler', '--module', 'ESNext', file], { stdout: 'pipe', stderr: 'pipe' });
      expect(await new Response(check.stdout).text()).toBe('');
      expect(await check.exited).toBe(0);
      const run = Bun.spawn(['bun', file], { stdout: 'pipe', stderr: 'pipe' });
      expect(await new Response(run.stderr).text()).toBe('');
      expect(await run.exited).toBe(0);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 30000);

test('rejects unsupported versions, lifecycles, and invalid identifiers', () => {
  for (const name of ['foo', 'Container', 'Bad;throw', 'A\nB']) expect(() => scaffoldProvider(name)).toThrow();
  expect(() => scaffoldProvider('Service', 'Scoped')).toThrow('Supported lifecycles');
  expect(() => scaffoldProvider('Service', 'Singleton', '6.0.0')).toThrow('Unsupported framework version');
});
