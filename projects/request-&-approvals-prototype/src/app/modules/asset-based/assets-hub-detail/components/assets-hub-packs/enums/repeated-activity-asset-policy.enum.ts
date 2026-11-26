export const RepeatedActivityAssetPolicy = {
  ANY: 'any',
  SAME: 'same',
  DIFFERENT: 'different',
} as const;

export type RepeatedActivityAssetPolicyET = (typeof RepeatedActivityAssetPolicy)[keyof typeof RepeatedActivityAssetPolicy];

/**
 * Packs created before the engine gained this property come back without the key at all, so the raw
 * value is narrowed instead of asserted — `undefined` and `null` alike — and callers fall back to
 * `ANY`.
 */
export function isRepeatedActivityAssetPolicy(value: string | null | undefined): value is RepeatedActivityAssetPolicyET {
  return value != null && (Object.values(RepeatedActivityAssetPolicy) as readonly string[]).includes(value); // widening for the membership lookup only
}
