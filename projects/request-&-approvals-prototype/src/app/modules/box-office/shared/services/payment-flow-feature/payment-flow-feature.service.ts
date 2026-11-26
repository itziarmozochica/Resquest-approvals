import { computed, inject, Injectable, type Signal } from '@angular/core';

import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';

import { NEW_PAYMENT_FLOW_FEATURE } from './new-payment-flow.optimizely-feature';
import { PAYMENT_CONFIGURATION_V2_FEATURE } from './payment-configuration-v2.optimizely-feature';

/**
 * Single chokepoint for the `new_payment_flow` rollout flag. `isNewPaymentFlowActive` exposes it as a
 * signal for the box-office templates and the point-of-sale strategy; it is served at every viewport
 * since the checkout modal became responsive (B2BO-9165).
 */
@Injectable({ providedIn: 'root' })
export class PaymentFlowFeatureService {
  readonly #optimizelyService = inject(OptimizelyService);

  readonly isNewPaymentFlowActive: Signal<boolean> = computed<boolean>(() => this.isNewPaymentFlowEnabled());

  isNewPaymentFlowEnabled(): boolean {
    return this.#optimizelyService.isFeatureEnabled(NEW_PAYMENT_FLOW_FEATURE) === true || this.isPaymentConfigurationV2Enabled();
  }

  isPaymentConfigurationV2Enabled(): boolean {
    return this.#optimizelyService.isFeatureEnabled(PAYMENT_CONFIGURATION_V2_FEATURE) === true;
  }
}
