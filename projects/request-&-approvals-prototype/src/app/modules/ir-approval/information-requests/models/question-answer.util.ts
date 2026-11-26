import { productTierPriceViolation } from './event-schedule-composer-v1.helpers';
import { ProductRow } from './event-schedule-composer-v1.model';
import { InformationRequestQuestionType } from './information-request-question.model';

const MULTI_VALUE_TYPES = new Set<InformationRequestQuestionType>([
  InformationRequestQuestionType.MULTIPICKLIST,
  InformationRequestQuestionType.MULTIFILE,
  InformationRequestQuestionType.TICKET_TYPES,
  InformationRequestQuestionType.CATALOG_GRID,
  InformationRequestQuestionType.FAQ,
]);

/** Mirrors Angular's `Validators.required` emptiness check so the predicate stays equivalent to the field validator. */
function isEmptyInputValue(value: unknown): boolean {
  return value == null || ((typeof value === 'string' || Array.isArray(value)) && value.length === 0);
}

export function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function ticketTypesAnswerPresent(value: unknown): boolean {
  const parsed = parseMaybeJson(value);
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object'
      ? ((parsed as Record<string, unknown>)['products'] ?? (parsed as Record<string, unknown>)['rows'])
      : null;
  if (!Array.isArray(rows)) return false;
  const named = rows.filter((row): row is Record<string, unknown> => {
    if (!row || typeof row !== 'object') return false;
    const record = row as Record<string, unknown>;
    return String(record['name'] ?? record['ticketType'] ?? '').trim() !== '';
  });
  if (named.length === 0) return false;
  return !named.some(row => {
    const violation = productTierPriceViolation(row as unknown as ProductRow);
    return violation.peak || violation.valley;
  });
}

function catalogGridRowHasContent(row: unknown): boolean {
  if (row && typeof row === 'object') {
    return Object.values(row as Record<string, unknown>).some(cell => String(cell ?? '').trim() !== '');
  }
  return String(row ?? '').trim() !== '';
}

function catalogGridAnswerPresent(value: unknown): boolean {
  const parsed = parseMaybeJson(value);
  const rows = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>)['rows'] : null;
  return Array.isArray(rows) && rows.some(catalogGridRowHasContent);
}

/**
 * True when `value` satisfies the "required" rule for `type`.
 * Single source of truth shared by the question field validator and the form-layout tab completion.
 */
export function isAnswerPresent(type: InformationRequestQuestionType, value: unknown): boolean {
  if (type === InformationRequestQuestionType.TICKET_TYPES) {
    return ticketTypesAnswerPresent(value);
  }
  if (type === InformationRequestQuestionType.CATALOG_GRID) {
    return catalogGridAnswerPresent(value);
  }
  if (MULTI_VALUE_TYPES.has(type)) {
    const parsed = parseMaybeJson(value);
    return Array.isArray(parsed) && parsed.length > 0;
  }
  if (type === InformationRequestQuestionType.VENUE) {
    const name = value && typeof value === 'object' ? (value as { name?: unknown }).name : null;
    return !!name && String(name).trim() !== '';
  }
  return !isEmptyInputValue(value);
}
