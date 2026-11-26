import { GenericOption } from '../../../models/schedule-calendar-options.models';

const NORMAL_TIER_TITLE = 'normal';

type NumericGenericOption = GenericOption & { id: number };

const hasNumericId = (option: GenericOption): option is NumericGenericOption => typeof option.id === 'number';

/**
 * Resolves the default tier id to pre-open in the schedule calendar form.
 *
 * Resolution order:
 *   1. The tier whose title matches "Normal" (case-insensitive) and has a numeric id.
 *   2. The first tier option with a numeric id.
 *   3. `null` when no tier with a numeric id exists.
 *
 * Known limitation: this relies on the tier title until the API exposes a stable
 * default tier identifier. Once available, prefer the API-provided identifier.
 */
export const resolveDefaultOpenTierId = (tierOptions: GenericOption[]): number | null => {
  const normalTier = tierOptions.find(
    (option: GenericOption): option is NumericGenericOption => hasNumericId(option) && option.title.toLowerCase() === NORMAL_TIER_TITLE,
  );
  if (normalTier) {
    return normalTier.id;
  }

  const firstNumericTier = tierOptions.find(hasNumericId);
  return firstNumericTier ? firstNumericTier.id : null;
};
