import { RequirementError } from '../models/requirement-error.model';

const DUPLICATE_CODE = '109010009';
const VALIDATION_CODES = new Set(['109010003', '109030003']);
const SCREEN_LEVEL_CODES = new Set(['109010001', '109010006', '109020001', '109020006', '109030001', '109030006']);

export function extractErrorCode(error: unknown): string | null {
  if (error == null || typeof error !== 'object') {
    return null;
  }
  const candidate = error as { code?: unknown; error?: { error?: { code?: unknown } } };
  const raw = candidate.code ?? candidate.error?.error?.code;
  return raw == null ? null : String(raw);
}

export function isScreenLevelError(error: unknown): boolean {
  const code = extractErrorCode(error);
  return code != null && SCREEN_LEVEL_CODES.has(code);
}

export function mapError(error: unknown): RequirementError {
  const code = extractErrorCode(error);
  if (code === DUPLICATE_CODE) {
    return { kind: 'duplicate' };
  }
  if (code != null && VALIDATION_CODES.has(code)) {
    return { fieldErrors: {}, kind: 'validation' };
  }
  return { kind: 'unknown', message: 'errors.generic' };
}
