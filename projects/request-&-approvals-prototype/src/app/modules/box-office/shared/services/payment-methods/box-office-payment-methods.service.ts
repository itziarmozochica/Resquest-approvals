import { inject, Injectable } from '@angular/core';

import { PaymentCheckout, PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';

import { PaymentType } from '../../../checkout/models/payment-type.enum';
import { OnsiteSetup } from '../../models/onsite-setup';
import { PaymentConfiguration } from '../payment-configuration.model';
import { DeclarativePaymentMethodsSource } from './declarative-payment-methods-source';
import { AvailablePaymentMethods } from './payment-methods-source';

export type { AvailablePaymentMethods } from './payment-methods-source';

const TERMINAL_CARD_PAYMENT_TYPES: readonly PaymentType[] = [
  PaymentType.CARD,
  PaymentType.CARD_SPLIT,
  PaymentType.CREDIT_CARD,
  PaymentType.DEBIT_CARD,
];

const TERMINAL_BASED_GATEWAYS: readonly string[] = [
  PaymentCheckout[PaymentCheckout.adyen],
  PaymentCheckout[PaymentCheckout.adyen_local],
  PaymentCheckout[PaymentCheckout.payhere],
  PaymentCheckout[PaymentCheckout.razorpay],
];

@Injectable({ providedIn: 'root' })
export class BoxOfficePaymentMethodsService {
  readonly #declarativePaymentMethodsSource = inject(DeclarativePaymentMethodsSource);

  allowsDelegatedCardPayment(setup: OnsiteSetup | null | undefined): boolean {
    return this.#declarativePaymentMethodsSource.allowsDelegatedCardPayment(setup);
  }

  buildPaymentConfiguration(setup: OnsiteSetup | null | undefined, deviceId?: string): PaymentConfiguration {
    return this.#declarativePaymentMethodsSource.buildPaymentConfiguration(setup, deviceId);
  }

  getAvailableMethods(setup: OnsiteSetup | undefined): AvailablePaymentMethods {
    return this.#declarativePaymentMethodsSource.getAvailableMethods(setup);
  }

  getGatewayProvider(setup: OnsiteSetup | null | undefined): PaymentCheckoutET | 'undefined' {
    return this.#declarativePaymentMethodsSource.getGatewayProvider(setup);
  }

  getGatewayTerminalIds(setup: OnsiteSetup | null | undefined): string[] {
    return this.#declarativePaymentMethodsSource.getGatewayTerminalIds(setup);
  }

  isDelegatedMethod(setup: OnsiteSetup | null | undefined, paymentType: PaymentType): boolean {
    return this.#declarativePaymentMethodsSource.isDelegatedMethod(setup, paymentType);
  }

  requiresDeviceSelection(
    setup: OnsiteSetup | null | undefined,
    paymentType: PaymentType | undefined,
    storedPaymentConfig: PaymentConfiguration | null | undefined,
  ): boolean {
    if (!paymentType || !TERMINAL_CARD_PAYMENT_TYPES.includes(paymentType)) {
      return false;
    }
    if (!setup) {
      return false;
    }
    const gateway = this.getGatewayProvider(setup);
    if (!TERMINAL_BASED_GATEWAYS.includes(gateway)) {
      return false;
    }
    const hasDeviceSelected = storedPaymentConfig?.deviceId != null && storedPaymentConfig.deviceId.length > 0;
    return !hasDeviceSelected;
  }

  /**
   * Whether the shift flow must ask the operator for a cash amount.
   *
   * A setup that declares no payment method at all — no configuration, or one configured with
   * nothing on either side — counts as a cash setup. We cannot tell what it takes, and asking for
   * an amount that turns out to be 0 is recoverable where a missing cash reconciliation is not.
   */
  shouldShowCashManagement(setup: OnsiteSetup | null | undefined): boolean {
    const { methods } = this.getAvailableMethods(setup ?? undefined);
    return methods.length === 0 || methods.includes(PaymentType.CASH);
  }
}
