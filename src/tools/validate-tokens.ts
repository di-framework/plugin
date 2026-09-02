export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTokens(tokens: { name: string; hasProvider: boolean }[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const t of tokens) {
    if (!t.hasProvider) {
      errors.push(`Token "${t.name}" is declared/imported but has no registered provider in container.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
