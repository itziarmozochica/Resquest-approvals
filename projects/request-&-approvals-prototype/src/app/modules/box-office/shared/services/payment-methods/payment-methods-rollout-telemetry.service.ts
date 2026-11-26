import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';

import { OnsiteSetup } from '../../models/onsite-setup';

@Injectable({ providedIn: 'root' })
export class PaymentMethodsRolloutTelemetry {
  readonly #datadogLogService = inject(DatadogLogService);

  readonly #unsupportedGatewayReportedSetupIds = new Set<string>();

  /**
   * Emits a warning when the checkout modal is about to offer integrated methods of a gateway the
   * modal settle path cannot drive yet (split legs settle through the adyen route only, see
   * `CheckoutModalSplitLegsService`), so such configurations would confirm options the settle
   * path cannot drive. Makes the gap observable until the other gateways are wired in.
   */
  reportUnsupportedModalGatewayIfApplicable(setup: OnsiteSetup | null | undefined): void {
    const gateway = setup?.payment_configuration?.integrated_gateway;
    if (setup == null || gateway == null || gateway.provider === 'adyen' || gateway.selected_methods.length === 0) {
      return;
    }

    const setupId = setup.id ?? 'unknown';
    if (this.#unsupportedGatewayReportedSetupIds.has(setupId)) {
      return;
    }
    this.#unsupportedGatewayReportedSetupIds.add(setupId);
    this.#datadogLogService.logWarn(
      '[BoxOffice][PaymentMethods] Checkout modal offers integrated methods of a gateway its settle path cannot drive yet',
      {
        gateway_provider: gateway.provider,
        onsite_setup_id: setupId,
        onsite_setup_name: setup.name,
        partner_id: setup.partner_id,
        payment_configuration_id: setup.payment_configuration?.id,
        payment_configuration_name: setup.payment_configuration?.name,
      },
    );
  }
}
