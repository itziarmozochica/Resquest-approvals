/**
 * Lowercase on purpose: the API takes and renders the domain enum's own values. Spec 4.5 writes
 * them uppercase and the implementation overruled it, so the wire format is what this mirrors.
 */
export const PackNodeKind = {
  SINGLE: 'single',
  ANY_ORDER: 'any_order',
} as const;

export type PackNodeKindET = (typeof PackNodeKind)[keyof typeof PackNodeKind];

export function isPackNodeKind(value: string | null | undefined): value is PackNodeKindET {
  return value != null && (Object.values(PackNodeKind) as readonly string[]).includes(value);
}
