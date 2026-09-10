export interface ValidationResult {
  scope: 'caller-supplied assertions only';
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTokens(tokens: { name: string; hasProvider: boolean }[]): ValidationResult {
  if (!Array.isArray(tokens) || tokens.some(t => !t || typeof t.name !== 'string' || !t.name.trim() || typeof t.hasProvider !== 'boolean')) {
    throw new Error('tokens must contain non-empty names and boolean hasProvider assertions');
  }
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const t of tokens) {
    if (!t.hasProvider) {
      errors.push(`Token "${t.name}" was supplied with hasProvider=false; application registrations were not inspected.`);
    }
  }

  return {
    scope: 'caller-supplied assertions only',
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
