export const SEARCH_ENDPOINTS = [
  'https://search.di-framework.dev',
  'https://di-framework-docs-search.seemueller.workers.dev/api/docs/search',
  'https://di-framework.dev/api/docs/search',
];
export type DocsErrorCode = 'invalid_input' | 'unsupported_version' | 'not_found' | 'access_denied' | 'service_error' | 'network_error' | 'timeout' | 'invalid_response' | 'http_error';
export class DocsError extends Error {
  constructor(public code: DocsErrorCode, message: string, public details: Record<string, unknown> = {}) { super(message); this.name = 'DocsError'; }
}
export interface DocsTransport { endpoints?: readonly string[]; timeoutMs?: number; fetch?: typeof fetch }
export interface DocsAttempt { endpoint: string; code: DocsErrorCode; status?: number }
export interface DocsResponse { data: unknown; endpoint: string; endpointFallbacks: DocsAttempt[] }

/** One fixed deadline covers headers, bodies and all endpoint retries. Never changes documentation versions. */
export async function requestDocs(path: string, transport: DocsTransport = {}): Promise<DocsResponse> {
  const timeoutMs = transport.timeoutMs ?? 8000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new DocsError('invalid_input', 'timeoutMs must be positive');
  const endpoints = (transport.endpoints ?? SEARCH_ENDPOINTS).slice(0, 3);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new DocsError('timeout', `Documentation request exceeded ${timeoutMs}ms. Retry when the service is reachable.`)); }, timeoutMs);
  });
  const attempts: DocsAttempt[] = [];
  const run = async (): Promise<DocsResponse> => {
    for (const endpoint of endpoints) {
      if (controller.signal.aborted) throw new DocsError('timeout', 'Documentation request deadline exceeded');
      try {
        const response = await (transport.fetch ?? fetch)(endpoint + path, { signal: controller.signal, headers: { Accept: 'application/json', 'User-Agent': 'di-framework-plugin-mcp/1.0' } });
        if (!response.ok) {
          const code: DocsErrorCode = response.status === 401 || response.status === 403 ? 'access_denied' : response.status === 404 ? 'not_found' : response.status === 410 ? 'unsupported_version' : response.status >= 500 || response.status === 429 ? 'service_error' : 'http_error';
          await response.body?.cancel();
          throw new DocsError(code, `Documentation endpoint returned HTTP ${response.status}. ${code === 'access_denied' ? 'Check service access or authentication.' : code === 'not_found' ? 'Check the topic, cursor and documentation version; this service does not distinguish them in 404 responses.' : 'Check the requested version and service availability.'}`, { endpoint, status: response.status });
        }
        let data: unknown;
        try { data = await response.json(); } catch { throw new DocsError('invalid_response', 'Documentation endpoint did not return valid JSON', { endpoint }); }
        return { data, endpoint, endpointFallbacks: attempts };
      } catch (error) {
        const failure = error instanceof DocsError ? error : new DocsError('network_error', 'Cannot reach documentation service. Check network connectivity and retry.', { endpoint });
        attempts.push({ endpoint, code: failure.code, ...(typeof failure.details.status === 'number' ? { status: failure.details.status } : {}) });
        if (!['service_error', 'network_error'].includes(failure.code)) { failure.details.attempts = attempts; throw failure; }
        if (endpoint === endpoints[endpoints.length - 1]) { failure.details.attempts = attempts; throw failure; }
      }
    }
    throw new DocsError('invalid_input', 'No documentation endpoints configured');
  };
  try { return await Promise.race([run(), timeout]); } finally { clearTimeout(timer!); }
}

export function requireString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new DocsError('invalid_input', `${name} must be a non-empty string`);
}
export function requireInteger(value: number, name: string, min: number, max: number): void {
  if (!Number.isInteger(value) || value < min || value > max) throw new DocsError('invalid_input', `${name} must be an integer from ${min} to ${max}`);
}
export function record(value: unknown): value is Record<string, any> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
