import assert from 'node:assert/strict';
import { TypedRouter, json } from '@di-framework/http';
import { requireAuth, requireAuthz, withAuthErrors } from '@di-framework/auth/http';
import {
  authenticated, authFailed, createPrincipal, noCredential,
  type AuthStrategy, type AuthorizationManager,
} from '@di-framework/auth';

// Inject the application's credential verifier and policy manager; neither is a router concern.
export function createApi(strategy: AuthStrategy, manager: AuthorizationManager) {
  const router = TypedRouter({ catch: withAuthErrors() });
  router.get('/health', () => json({ ok: true }));
  router.get('/reports', () => json({ report: 'quarterly' }), {
    use: [requireAuth({ strategy }), requireAuthz({ manager, metadata: { action: 'reports:read' } })],
  });
  return router;
}

// Deterministic test doubles only. Production should use registerAuth's session/bearer
// strategies (or a trusted verifier) and persistent stores, never these literal tokens.
const strategy: AuthStrategy = {
  name: 'test-bearer',
  async authenticate({ request }) {
    const header = request.headers.get('authorization');
    if (!header) return noCredential();
    if (header !== 'Bearer test-reader' && header !== 'Bearer test-guest') {
      return authFailed('invalid_credentials', 'Invalid test credential');
    }
    return authenticated(createPrincipal({ sub: header.endsWith('reader') ? 'reader' : 'guest', method: 'api-key' }));
  },
};
const manager: AuthorizationManager = {
  async authorize(principal) { return { allowed: principal?.sub === 'reader' }; },
};
const api = createApi(strategy, manager);
assert.equal((await api.fetch(new Request('http://localhost/health'))).status, 200);
for (const [token, status] of [[undefined, 401], ['invalid', 401], ['test-guest', 403], ['test-reader', 200]] as const) {
  const response = await api.fetch(new Request('http://localhost/reports', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  }));
  assert.equal(response.status, status);
  if (status === 200) assert.deepEqual(await response.json(), { report: 'quarterly' });
}
