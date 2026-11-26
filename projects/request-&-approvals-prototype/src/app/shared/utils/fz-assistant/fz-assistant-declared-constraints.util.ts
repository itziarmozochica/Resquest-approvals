import { readFzAssistantNativeControlKind } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-native-control-kind.util';
import {
  readFzAssistantNumericConstraints,
  satisfiesFzAssistantNumericConstraints,
  toFzAssistantNumericSchema,
} from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-numeric-grid.util';
import { isFzAssistantSecretField } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-secret-redaction.util';
import {
  readFzAssistantTemporalConstraints,
  satisfiesFzAssistantTemporalConstraints,
  toFzAssistantTemporalSchema,
} from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-temporal-constraints.util';
import {
  readFzAssistantTextConstraints,
  satisfiesFzAssistantTextConstraints,
  toFzAssistantTextSchema,
} from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-text-constraints.util';

/**
 * The kinds whose empty state the write path accepts, and whose schema therefore has to admit it.
 *
 * `range` and `colour` are absent because neither can hold one: a slider puts the thumb back and a colour
 * input turns `''` into `#000000`, so the write path refuses the clear and the note would be a lie.
 */
const CLEARABLE_KINDS = new Set(['date', 'numeric', 'text', 'time']);

/** Every keyword a schema may carry, by the schema type it belongs to. */
const CONSTRAINT_KEYWORDS_BY_SCHEMA_TYPE = new Map<string, ReadonlySet<string>>([
  ['number', new Set(['description', 'maximum', 'minimum', 'multipleOf'])],
  ['string', new Set(['description', 'format', 'maxLength', 'minLength', 'pattern'])],
]);

/** What each keyword's value has to be, so a sanctioned name cannot carry unsanctioned content. */
const CONSTRAINT_VALUE_TYPES = new Map<string, 'number' | 'string'>([
  ['description', 'string'],
  ['format', 'string'],
  ['maxLength', 'number'],
  ['maximum', 'number'],
  ['minLength', 'number'],
  ['minimum', 'number'],
  ['multipleOf', 'number'],
  ['pattern', 'string'],
]);

/**
 * `description` is free prose aimed at an LLM, so it is the one field where content matters as much as
 * type. Long enough for the prose the builders produce, short enough that a snapshot cannot use the wire
 * as an instruction channel.
 */
const MAX_DESCRIPTION_LENGTH = 400;

/**
 * The two halves of one rule: **Act refuses only what Discover disclosed.**
 *
 * `value_schema` carries the constraints the write path refuses on, and only those. A constraint Act
 * enforces has to appear, or the agent is refused on something it was never told; a constraint Act does
 * not enforce must not appear, or the agent self-limits — or declines a fill outright — against a rule
 * nothing would have stopped. Both sides of that bargain come through this file, so neither can move
 * without the other: `toFzAssistantValueSchema` is capture's only schema source and
 * `satisfiesFzAssistantDeclaredConstraints` is the native write path's only constraint check.
 *
 * Deliberately outside the set: `required` (its own wire field), `type="tel"` (the browser validates no
 * format, so there is nothing to enforce), `badInput`, and `setCustomValidity` / app-level policy, which
 * is neither ours nor something the agent was ever told about.
 */
export function toFzAssistantValueSchema(element: Element): Record<string, unknown> | undefined {
  // Act never writes a secret field at all (`FzAssistantNativeControlAdapterService.applyValue`), so
  // there is no constraint on one to disclose - and its `pattern` can itself describe the secret.
  if (isFzAssistantSecretField(element)) {
    return undefined;
  }

  const numeric = readFzAssistantNumericConstraints(element);
  if (numeric !== undefined) {
    return withClearableNote(toFzAssistantNumericSchema(numeric), element);
  }

  const temporal = readFzAssistantTemporalConstraints(element);
  if (temporal !== undefined) {
    return withClearableNote(toFzAssistantTemporalSchema(temporal), element);
  }

  return withClearableNote(toFzAssistantTextSchema(readFzAssistantTextConstraints(element)), element);
}

/**
 * Whether a schema is one {@link toFzAssistantValueSchema} could have produced: a leaf's declared
 * constraints, and nothing besides.
 *
 * The wire boundary gates leaf schemas on this instead of on the element's kind. Gating on kind was
 * wrong in both directions: it dropped every textual schema, because a leaf with a `maxlength` is wire
 * type `text`, while waving through arbitrary JSON on a numeric one, because kind says nothing about
 * content. Keeping the sanctioned keywords beside the code that produces and enforces them means
 * adding a constraint is one edit rather than three that can drift.
 *
 * A capable widget's own snapshot can satisfy this too, and then travels. That is a constraint the
 * widget has disclosed, so the same rule binds it: `applyAssistantValue` owes a refusal on a value
 * that violates something `getAssistantSnapshot` published.
 */
export function isFzAssistantDeclaredConstraintSchema(schema: Record<string, unknown> | undefined): boolean {
  if (schema === undefined) {
    return false;
  }

  const declaredType = schema['type'];
  if (typeof declaredType !== 'string') {
    return false;
  }

  const keywords = CONSTRAINT_KEYWORDS_BY_SCHEMA_TYPE.get(declaredType);
  if (keywords === undefined) {
    return false;
  }

  const constraints = Object.entries(schema).filter(([keyword]) => keyword !== 'type');

  // A bare `{ type }` constrains nothing, so it is payload without disclosure.
  return constraints.length > 0 && constraints.every(([keyword, value]) => isSanctionedConstraint(keywords, keyword, value));
}

/**
 * A sanctioned keyword carrying the wrong kind of value is still smuggling: `{ pattern: 42 }` and
 * `{ minimum: { $ref: '…' } }` both pass a check that only reads key names, and travel to the agent
 * verbatim. The name and the value are checked together for that reason.
 */
function isSanctionedConstraint(keywords: ReadonlySet<string>, keyword: string, value: unknown): boolean {
  if (!keywords.has(keyword) || typeof value !== CONSTRAINT_VALUE_TYPES.get(keyword)) {
    return false;
  }

  return keyword !== 'description' || (typeof value === 'string' && value.length <= MAX_DESCRIPTION_LENGTH);
}

/**
 * Say that clearing the control is allowed, because every published keyword implies otherwise.
 *
 * The browser sets none of `rangeUnderflow`, `rangeOverflow`, `stepMismatch`, `patternMismatch` or
 * `typeMismatch` for an empty value, `minLength` is exempted for one explicitly, and the numeric writer
 * accepts `''` on purpose so a fill can be undone. So an empty value satisfies everything Act enforces
 * while satisfying almost nothing the schema states - and capture publishes `null` as the value of that
 * same empty field, contradicting the schema beside it.
 *
 * Rather than qualify each keyword, the schema says the one thing that is true of all of them. `colour` is
 * absent from the clearable kinds because it has no empty state: the browser turns `''` into `#000000`.
 */
function withClearableNote(schema: Record<string, unknown> | undefined, element: Element): Record<string, unknown> | undefined {
  if (schema === undefined || !CLEARABLE_KINDS.has(readFzAssistantNativeControlKind(element) ?? '') || !forbidsEmptyValue(schema)) {
    return schema;
  }

  // An empty string on every kind, including numeric: that is what the write path accepts. Capture
  // publishes `null` as the *value* of an empty numeric field, so naming `null` as the thing to send looks
  // symmetrical - but this adapter refuses `null` outright, so the note would have named the one value the
  // write path is tested to reject.
  //
  // "Accepted" is about the value, not about permission: whether any write lands at all is what the
  // `disabled` and `readonly` wire fields say, exactly as they do for every other keyword here.
  const note = 'An empty value is accepted: send an empty string to clear the field.';
  const existing = schema['description'];

  return { ...schema, description: typeof existing === 'string' ? `${existing} ${note}` : note };
}

/**
 * Whether an empty value would fail the schema as published - the only case the note is needed for.
 *
 * `maxLength` on its own admits an empty string already, so saying so again would be noise. Everything
 * else here excludes it: no empty value is a number, `minLength` above zero rules it out, `format` has
 * nothing to validate, prose describes a range it does not sit in, and a `pattern` is asked directly.
 */
function forbidsEmptyValue(schema: Record<string, unknown>): boolean {
  const minLength = schema['minLength'];
  if (schema['type'] === 'number' || schema['format'] !== undefined || typeof schema['description'] === 'string') {
    return true;
  }

  if (typeof minLength === 'number' && minLength > 0) {
    return true;
  }

  const pattern = schema['pattern'];

  return typeof pattern === 'string' && !acceptsEmptyValue(pattern);
}

function acceptsEmptyValue(pattern: string): boolean {
  try {
    return new RegExp(pattern, 'u').test('');
  } catch {
    return false;
  }
}

/** Whether the control's current value satisfies every constraint {@link toFzAssistantValueSchema} publishes. */
export function satisfiesFzAssistantDeclaredConstraints(element: HTMLInputElement | HTMLTextAreaElement): boolean {
  // The same gate the disclosure half opens with, so the two cannot disagree: nothing is published about a
  // secret field, so nothing may be refused on one either. Unreachable while the adapter refuses secrets
  // before any writer runs, and here because this file's whole claim is that its two halves match.
  if (isFzAssistantSecretField(element)) {
    return true;
  }

  if (element instanceof HTMLInputElement && readFzAssistantNumericConstraints(element) !== undefined) {
    return satisfiesFzAssistantNumericConstraints(element);
  }

  if (element instanceof HTMLInputElement && readFzAssistantTemporalConstraints(element) !== undefined) {
    return satisfiesFzAssistantTemporalConstraints(element);
  }

  return satisfiesFzAssistantTextConstraints(element);
}
