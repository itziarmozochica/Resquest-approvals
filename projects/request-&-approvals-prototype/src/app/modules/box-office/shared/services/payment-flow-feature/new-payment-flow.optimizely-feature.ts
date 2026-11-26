import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyFeatureKeyDef } from '@fz-original/app/shared/optimizely/optimizely-feature-key';

export const NEW_PAYMENT_FLOW_FEATURE: OptimizelyFeatureKeyDef = {
  optimizelyFeatureKey: FeatureFlags.NEW_PAYMENT_FLOW,
  team: 'b2b-onsite',
};
