import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyFeatureKeyDef } from '@fz-original/app/shared/optimizely/optimizely-feature-key';

export const PARTNER_TAGS_FEATURE: OptimizelyFeatureKeyDef = {
  optimizelyFeatureKey: FeatureFlags.PARTNER_TAGS,
  team: 'game-centers',
};
