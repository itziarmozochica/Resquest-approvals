import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyFeatureKeyDef } from '@fz-original/app/shared/optimizely/optimizely-feature-key';

export const PAYMENT_CONFIGURATION_V2_FEATURE: OptimizelyFeatureKeyDef = {
  optimizelyFeatureKey: FeatureFlags.PAYMENT_CONFIGURATION_V2,
  team: 'b2b-onsite',
};
