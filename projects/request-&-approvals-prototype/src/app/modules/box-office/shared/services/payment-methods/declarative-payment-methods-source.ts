import { inject, Injectable } from '@angular/core';

import { PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { AdyenConfiguration } from '@fz-original/app/app/models/payment-checkout-adyen.model';
import { PayhereConfiguration } from '@fz-original/app/app/models/payment-checkout-payhere.model';
import { SquareConfiguration } from '@fz-original/app/app/models/payment-checkout-square.model';
import { AdyenLocalConfiguration } from '@fz-original/app/payments/models/local-terminal-payment.model';
import { isTapToPayDeviceId } from '@fz-original/app/payments/models/tap-to-pay.model';
import {
  PaymentMethodDisplay,
  resolvePaymentMethodDisplay,
} from '@fz-original/app/shared/utils/payment-method-display/payment-method-display.util';
import { TranslateService } from '@ngx-translate/core';

import { PaymentType } from '../../../checkout/models/payment-type.enum';
import { OnsiteSetup, OnsiteSetupPaymentConfiguration, OnsiteSetupPaymentConfigurationMethod } from '../../models/onsite-setup';
import { isTapToPayEnabled } from '../../utils/tap-to-pay.util';
import { PaymentConfiguration } from '../payment-configuration.model';
import { PaymentConfigStorageService } from '../payment/payment-config-storage.service';
import { PaymentMethodCodeResolver } from './payment-method-code.resolver';
import {
  AvailablePaymentMethods,
  ConfiguredPaymentMethod,
  ConfiguredPaymentMethods,
  GatewayTerminal,
  PaymentMethodsSource,
  SQUARE_WALLET_TYPES,
} from './payment-methods-source';

const splitPaymentLabelKey = 'boxOffice.cart.paymentMethods.card_split';

@Injectable({ providedIn: 'root' })
export class DeclarativePaymentMethodsSource implements PaymentMethodsSource {
  readonly #paymentConfigStorageService = inject(PaymentConfigStorageService);
  readonly #paymentMethodCodeResolver = inject(PaymentMethodCodeResolver);
  readonly #translate = inject(TranslateService);

  allowsDelegatedCardPayment(setup: OnsiteSetup | null | undefined): boolean {
    const delegatedMethods = setup?.payment_configuration?.delegated_methods ?? [];
    return delegatedMethods.some(entry => this.#paymentMethodCodeResolver.resolve(entry.code) === PaymentType.CARD);
  }

  buildPaymentConfiguration(setup: OnsiteSetup | null | undefined, deviceId?: string): PaymentConfiguration {
    const gateway = setup?.payment_configuration?.integrated_gateway;
    let adyenConfig: AdyenConfiguration | null = null;
    let adyenLocalConfig: AdyenLocalConfiguration | null = null;
    let payhereConfig: PayhereConfiguration | null = null;
    let squareConfig: SquareConfiguration | null = null;
    let selectedDeviceId = deviceId;
    switch (gateway?.provider) {
      case 'adyen':
        adyenConfig = new AdyenConfiguration(this.getGatewayTerminalIds(setup));
        break;
      case 'adyen_local': {
        const terminals = this.getGatewayTerminals(setup);
        adyenLocalConfig = new AdyenLocalConfiguration(
          terminals.map(terminal => terminal.externalId),
          Object.fromEntries(
            terminals.flatMap(terminal => (terminal.ipAddress != null ? [[terminal.externalId, terminal.ipAddress]] : [])),
          ),
          setup?.payment_configuration?.id ?? '',
        );
        selectedDeviceId = this.#isSelectableAdyenLocalDevice(setup ?? null, adyenLocalConfig, deviceId) ? deviceId : undefined;
        break;
      }
      case 'payhere':
        payhereConfig = new PayhereConfiguration(this.getGatewayTerminalIds(setup));
        break;
      case 'square': {
        const providerConfig = gateway.provider_config;
        if (
          providerConfig != null &&
          'application_id' in providerConfig &&
          Boolean(providerConfig.application_id) &&
          Boolean(providerConfig.location_id)
        ) {
          squareConfig = new SquareConfiguration(providerConfig.location_id, providerConfig.application_id);
        }
        break;
      }
      default:
        break;
    }
    return new PaymentConfiguration(adyenConfig, squareConfig, null, payhereConfig, selectedDeviceId, adyenLocalConfig);
  }

  getAvailableMethods(setup: OnsiteSetup | undefined): AvailablePaymentMethods {
    const config = setup?.payment_configuration;
    if (!config) {
      return { display: new Map<PaymentType, PaymentMethodDisplay>(), methods: [] };
    }
    const displayByType = this.#collectConfiguredMethods(config);
    this.#dropSquareWalletMethodsWithoutDevice(displayByType);
    this.#addSplitPaymentIfAllowed(setup, config, displayByType);
    return { display: displayByType, methods: this.#sortDeclarativeMethods(displayByType) };
  }

  /**
   * The configured methods, one map per payment path: the same code on both sides (e.g. an adyen
   * `card` plus a delegated `card`) stays as one method in each map — they are different payment
   * paths and must co-exist in method pickers (B2BO-7664). Within one side, repeated codes keep
   * the first entry. Square wallet methods are dropped when no Square device is configured,
   * mirroring {@link getAvailableMethods}. Each map iterates in display order: cash first, card
   * second, then alphabetically by display key.
   */
  getConfiguredMethods(setup: OnsiteSetup | null | undefined): ConfiguredPaymentMethods {
    const config = setup?.payment_configuration;
    return {
      delegated: this.#collectSideMethods(config?.delegated_methods ?? []),
      integrated: this.#collectSideMethods(config?.integrated_gateway?.selected_methods ?? []),
      integratedProvider: config?.integrated_gateway?.provider ?? null,
    };
  }

  getGatewayProvider(setup: OnsiteSetup | null | undefined): PaymentCheckoutET | 'undefined' {
    return setup?.payment_configuration?.integrated_gateway?.provider ?? 'undefined';
  }

  getGatewayTerminalIds(setup: OnsiteSetup | null | undefined): string[] {
    return this.getGatewayTerminals(setup).map(terminal => terminal.externalId);
  }

  /** Selected integrated-gateway terminals with their human label, for device pickers. */
  getGatewayTerminals(setup: OnsiteSetup | null | undefined): GatewayTerminal[] {
    const gateway = setup?.payment_configuration?.integrated_gateway;
    if (gateway == null) {
      return [];
    }
    const selectedIds = new Set(setup?.selected_terminal_ids ?? []);
    return gateway.terminals
      .filter(terminal => selectedIds.has(terminal.id))
      .map(terminal => ({ externalId: terminal.external_id, ipAddress: terminal.ip_address ?? null, label: terminal.label }));
  }

  isDelegatedMethod(setup: OnsiteSetup | null | undefined, paymentType: PaymentType): boolean {
    // A split payment is never a delegated payment: its legs are charged on the integrated
    // gateway's terminal. Resolving it onto the card family here — as the terminal picker
    // legitimately does — routed a delegated-only card setup's split to the delegated checkout,
    // which carries the `card_split` sentinel the backend rejects (B2BO-8885).
    if (paymentType === PaymentType.CARD_SPLIT) {
      return false;
    }
    const config = setup?.payment_configuration;
    const resolveEntry = (entry: OnsiteSetupPaymentConfigurationMethod): PaymentType =>
      this.#paymentMethodCodeResolver.resolve(entry.code) ?? (entry.code as PaymentType);
    const integratedMethods = new Set((config?.integrated_gateway?.selected_methods ?? []).map(resolveEntry));
    const delegatedMethods = new Set((config?.delegated_methods ?? []).map(resolveEntry));

    return delegatedMethods.has(paymentType) && !integratedMethods.has(paymentType);
  }

  /**
   * A split payment is collected leg by leg on a gateway terminal, so it may only be offered when a
   * gateway that can collect those legs is configured and carries a card method of its own. A card
   * configured only as a delegated method cannot back a split: offering it there sent the
   * `card_split` sentinel to the delegated checkout, which the backend rejects (B2BO-8885).
   */
  #addSplitPaymentIfAllowed(
    setup: OnsiteSetup | undefined,
    config: OnsiteSetupPaymentConfiguration,
    displayByType: Map<PaymentType, PaymentMethodDisplay>,
  ): void {
    if (config.allow_split_payments !== true || displayByType.has(PaymentType.CARD_SPLIT)) {
      return;
    }
    if (!this.#gatewayCanCollectSplitLegs(setup)) {
      return;
    }
    const integratedCard = this.#integratedCardDisplay(config);
    if (integratedCard === undefined) {
      return;
    }
    displayByType.set(PaymentType.CARD_SPLIT, { ...integratedCard, label: this.#translate.instant(splitPaymentLabelKey) });
  }

  #collectConfiguredMethods(config: OnsiteSetupPaymentConfiguration): Map<PaymentType, PaymentMethodDisplay> {
    const entries: OnsiteSetupPaymentConfigurationMethod[] = [
      ...(config.integrated_gateway?.selected_methods ?? []),
      ...config.delegated_methods,
    ];

    const displayByType = new Map<PaymentType, PaymentMethodDisplay>();
    for (const entry of entries) {
      const type = this.#paymentMethodCodeResolver.resolve(entry.code) ?? (entry.code as PaymentType);
      if (!displayByType.has(type)) {
        displayByType.set(type, toDisplay(entry));
      }
    }
    return displayByType;
  }

  #collectSideMethods(methods: OnsiteSetupPaymentConfigurationMethod[]): ReadonlyMap<PaymentType, ConfiguredPaymentMethod> {
    const byType = new Map<PaymentType, ConfiguredPaymentMethod>();
    for (const entry of methods) {
      const type = this.#paymentMethodCodeResolver.resolve(entry.code) ?? (entry.code as PaymentType);
      if (byType.has(type) || (SQUARE_WALLET_TYPES.has(type) && !this.#hasSquareDeviceConfigured())) {
        continue;
      }
      const { imageUrl, label } = toDisplay(entry);
      byType.set(type, { iconUrl: imageUrl, name: label, type });
    }
    return this.#sortSideMethods(byType);
  }

  /** Device filter: drop square-wallet methods if no Square device is configured. */
  #dropSquareWalletMethodsWithoutDevice(displayByType: Map<PaymentType, PaymentMethodDisplay>): void {
    if (this.#hasSquareDeviceConfigured()) {
      return;
    }
    for (const type of [...displayByType.keys()]) {
      if (SQUARE_WALLET_TYPES.has(type)) {
        displayByType.delete(type);
      }
    }
  }

  /**
   * Whether the configured gateway can collect a split payment's legs. Only Adyen can today: the
   * split path charges every integrated leg through an Adyen terminal regardless of the gateway on
   * the setup, and the square, payhere and razorpay checkouts forward the picked payment method
   * verbatim, so a split on any of them fails. Widen this when the split path becomes
   * gateway-aware — it is deliberately the one place that decides (B2BO-8885).
   */
  #gatewayCanCollectSplitLegs(setup: OnsiteSetup | undefined): boolean {
    const provider = this.getGatewayProvider(setup);
    return provider === 'adyen' || provider === 'adyen_local';
  }

  #hasSquareDeviceConfigured(): boolean {
    const storedPaymentConfig = this.#paymentConfigStorageService.getConfiguration();
    return Boolean(storedPaymentConfig?.deviceId && storedPaymentConfig?.squareConfiguration);
  }

  /** Display of the integrated gateway's own card method, preferring card over credit then debit. */
  #integratedCardDisplay(config: OnsiteSetupPaymentConfiguration): PaymentMethodDisplay | undefined {
    const displayByType = new Map<PaymentType, PaymentMethodDisplay>();
    for (const entry of config.integrated_gateway?.selected_methods ?? []) {
      const type = this.#paymentMethodCodeResolver.resolve(entry.code) ?? (entry.code as PaymentType);
      if (!displayByType.has(type)) {
        displayByType.set(type, toDisplay(entry));
      }
    }
    return displayByType.get(PaymentType.CARD) ?? displayByType.get(PaymentType.CREDIT_CARD) ?? displayByType.get(PaymentType.DEBIT_CARD);
  }

  #isSelectableAdyenLocalDevice(
    setup: OnsiteSetup | null,
    adyenLocalConfig: AdyenLocalConfiguration,
    deviceId: string | undefined,
  ): boolean {
    if (deviceId === undefined) {
      return false;
    }
    return isTapToPayDeviceId(deviceId) ? isTapToPayEnabled(setup) : adyenLocalConfig.devicesIds.includes(deviceId);
  }

  #sortDeclarativeMethods(displayByType: ReadonlyMap<PaymentType, PaymentMethodDisplay>): PaymentType[] {
    const pinned: PaymentType[] = [];
    if (displayByType.has(PaymentType.CASH)) {
      pinned.push(PaymentType.CASH);
    }
    if (displayByType.has(PaymentType.CARD)) {
      pinned.push(PaymentType.CARD);
    }

    // Sorted by code, not by the served name, so the order stays the same in every language.
    const remaining = [...displayByType.keys()]
      .filter(type => type !== PaymentType.CASH && type !== PaymentType.CARD)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    return [...pinned, ...remaining];
  }

  /** Cash first, card second, then by payment type code so the order does not depend on the language: map order is display order. */
  #sortSideMethods(byType: Map<PaymentType, ConfiguredPaymentMethod>): ReadonlyMap<PaymentType, ConfiguredPaymentMethod> {
    const rank = (method: ConfiguredPaymentMethod): number =>
      method.type === PaymentType.CASH ? 0 : method.type === PaymentType.CARD ? 1 : 2;
    const sorted = [...byType.values()].sort((a, b) => {
      const rankDiff = rank(a) - rank(b);
      if (rankDiff !== 0) {
        return rankDiff;
      }
      return a.type < b.type ? -1 : a.type > b.type ? 1 : 0;
    });
    return new Map(sorted.map(method => [method.type, method]));
  }
}

function toDisplay(entry: OnsiteSetupPaymentConfigurationMethod): PaymentMethodDisplay {
  return resolvePaymentMethodDisplay({ code: entry.code, iconUrl: entry.icon_url, name: entry.name });
}
