import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyFeatureKeyDef } from '@fz-original/app/shared/optimizely/optimizely-feature-key';

export const PROFORMA_INVOICE_FEATURE: OptimizelyFeatureKeyDef = {
  optimizelyFeatureKey: FeatureFlags.PROFORMA_INVOICE,
  team: 'game-centers',
};
