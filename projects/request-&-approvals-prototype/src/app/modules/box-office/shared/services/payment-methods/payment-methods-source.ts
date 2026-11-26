import { PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { PaymentMethodDisplay } from '@fz-original/app/shared/utils/payment-method-display/payment-method-display.util';

import { PaymentType } from '../../../checkout/models/payment-type.enum';
import { OnsiteSetup } from '../../models/onsite-setup';
import { PaymentConfiguration } from '../payment-configuration.model';

export const SQUARE_WALLET_TYPES: ReadonlySet<PaymentType> = new Set<PaymentType>([
  PaymentType.SQUARE_QR,
  PaymentType.IC_CARD,
  PaymentType.ID_PAYMENT,
  PaymentType.QUICPAY,
]);

export interface AvailablePaymentMethods {
  display: ReadonlyMap<PaymentType, PaymentMethodDisplay>;
  methods: PaymentType[];
}

export interface GatewayTerminal {
  externalId: string;
  ipAddress: string | null;
  label: string | null;
}

export interface ConfiguredPaymentMethod {
  iconUrl: string | null;
  name: string;
  type: PaymentType;
}

/**
 * The declarative payment configuration's methods, one map per payment path: the same method code
 * (e.g. `card`) may legitimately appear both under the integrated gateway (`selected_methods`)
 * and under `delegated_methods` — they are different payment paths and must co-exist as separate
 * options, so they are never merged into a single type-keyed collection (B2BO-7664). Each map is
 * keyed by resolved type and iterates in display order.
 */
export interface ConfiguredPaymentMethods {
  /** Externally managed methods (`delegated_methods`). */
  delegated: ReadonlyMap<PaymentType, ConfiguredPaymentMethod>;
  /** Methods managed through the integrated gateway (`selected_methods`). */
  integrated: ReadonlyMap<PaymentType, ConfiguredPaymentMethod>;
  /** Integrated gateway provider (`adyen`, `square`, …); null when no gateway is configured. */
  integratedProvider: string | null;
}

export interface PaymentMethodsSource {
  allowsDelegatedCardPayment(setup: OnsiteSetup | null | undefined): boolean;
  buildPaymentConfiguration(setup: OnsiteSetup | null | undefined, deviceId?: string): PaymentConfiguration;
  getAvailableMethods(setup: OnsiteSetup | undefined): AvailablePaymentMethods;
  getGatewayProvider(setup: OnsiteSetup | null | undefined): PaymentCheckoutET | 'undefined';
  getGatewayTerminalIds(setup: OnsiteSetup | null | undefined): string[];
  isDelegatedMethod(setup: OnsiteSetup | null | undefined, paymentType: PaymentType): boolean;
}
