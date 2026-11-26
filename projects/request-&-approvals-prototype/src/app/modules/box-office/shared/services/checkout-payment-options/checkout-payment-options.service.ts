import { inject, Injectable } from '@angular/core';

import type {
  CheckoutFlowType,
  CheckoutPaymentMethodDescriptor,
  CheckoutTerminalOption,
} from '@fz-original/app/modules/checkout/checkout-modal/models/checkout.model';
import { TAP_TO_PAY_DEVICE_ID } from '@fz-original/app/payments/models/tap-to-pay.model';

import { PaymentType } from '../../../checkout/models/payment-type.enum';
import { OnsiteSetup, OnsiteSetupPaymentConfigurationQuickAction } from '../../models/onsite-setup';
import { PAYMENT_CONFIGURATION_DIRECT_PAYMENT_BUTTON_LIMIT, PaymentConfigurationCheckoutFlow } from '../../models/payment-configuration';
import { isCheckoutScreenForced, methodLabelSuffixKey } from '../../utils/direct-payment-buttons.util';
import { isTapToPayEnabled } from '../../utils/tap-to-pay.util';
import { PaymentConfiguration } from '../payment-configuration.model';
import { PaymentFlowFeatureService } from '../payment-flow-feature/payment-flow-feature.service';
import { BoxOfficePaymentMethodsService } from '../payment-methods/box-office-payment-methods.service';
import { DeclarativePaymentMethodsSource } from '../payment-methods/declarative-payment-methods-source';
import { PaymentMethodCodeResolver } from '../payment-methods/payment-method-code.resolver';
import { PaymentMethodsRolloutTelemetry } from '../payment-methods/payment-methods-rollout-telemetry.service';
import { ConfiguredPaymentMethod } from '../payment-methods/payment-methods-source';

export interface CheckoutPaymentOptions {
  basePaymentConfiguration: PaymentConfiguration;
  checkoutFlows: CheckoutFlowType[] | undefined;
  fitToTiles: boolean;
  methods: CheckoutPaymentMethodDescriptor[];
  selectedTerminalId: string | null;
  tapToPay: boolean;
  terminals: CheckoutTerminalOption[];
}

export type CheckoutQuickAction =
  | { method: CheckoutPaymentMethodDescriptor; type: 'payment_method'; main?: boolean }
  | { type: 'multi_flow_checkout' };

const CHECKOUT_FLOW_TYPE_BY_CONFIGURED_FLOW: Record<PaymentConfigurationCheckoutFlow, CheckoutFlowType> = {
  custom_split: 'customAmount',
  full_payment: 'full',
  pay_by_item: 'customSplit',
  split_equally: 'splitEqually',
};

/**
 * Resolves the checkout modal payment options for an onsite setup (B2BO-7664).
 *
 * The modal renders every configured method of both payment paths of the declarative
 * `payment_configuration` — non-delegated (integrated gateway) first, delegated (externally
 * managed) after — and the gateway's selected terminals with their labels. The two paths co-exist:
 * a configuration may offer the same code on both (an integrated `card` plus a delegated `card`),
 * which yields two options whose labels are disambiguated with the provider name and the
 * "External" suffix ("Card (Adyen)" / "Card (External)").
 */
@Injectable({ providedIn: 'root' })
export class CheckoutPaymentOptionsService {
  readonly #boxOfficePaymentMethodsService = inject(BoxOfficePaymentMethodsService);
  readonly #declarativePaymentMethodsSource = inject(DeclarativePaymentMethodsSource);
  readonly #paymentFlowFeatureService = inject(PaymentFlowFeatureService);
  readonly #paymentMethodCodeResolver = inject(PaymentMethodCodeResolver);
  readonly #rolloutTelemetry = inject(PaymentMethodsRolloutTelemetry);

  resolve(setup: OnsiteSetup | null, storedDeviceId: string | undefined): CheckoutPaymentOptions {
    const basePaymentConfiguration = this.#boxOfficePaymentMethodsService.buildPaymentConfiguration(setup);
    this.#rolloutTelemetry.reportUnsupportedModalGatewayIfApplicable(setup);
    const methods = this.#resolveDeclarativeMethods(setup);
    const checkoutFlows = this.#resolveCheckoutFlows(setup);
    const fitToTiles = this.#paymentFlowFeatureService.isPaymentConfigurationV2Enabled();
    if (isTapToPayEnabled(setup)) {
      basePaymentConfiguration.deviceId = TAP_TO_PAY_DEVICE_ID;
      return { basePaymentConfiguration, checkoutFlows, fitToTiles, methods, selectedTerminalId: null, tapToPay: true, terminals: [] };
    }
    const terminals = this.#resolveDeclarativeTerminals(setup);
    const selectedTerminalId = storedDeviceId != null && terminals.some(terminal => terminal.id === storedDeviceId) ? storedDeviceId : null;
    // The base configuration only carries a device that is still selectable: a stale stored device
    // must not ride into persistence when the modal saves a terminal on top of this base.
    basePaymentConfiguration.deviceId = selectedTerminalId ?? undefined;
    return { basePaymentConfiguration, checkoutFlows, fitToTiles, methods, selectedTerminalId, tapToPay: false, terminals };
  }

  hasDelegatedCashMethod(setup: OnsiteSetup | null): boolean {
    return this.#resolveDeclarativeMethods(setup).some(method => method.type === PaymentType.CASH && method.delegated);
  }

  hasIntegratedCardMethod(setup: OnsiteSetup | null): boolean {
    return this.#resolveDeclarativeMethods(setup).some(method => method.type === PaymentType.CARD && !method.delegated);
  }

  resolveQuickActions(setup: OnsiteSetup | null): CheckoutQuickAction[] {
    const methods = this.#resolveDeclarativeMethods(setup);
    const configured = setup?.payment_configuration?.checkout?.quick_actions;
    const v2 = this.#paymentFlowFeatureService.isPaymentConfigurationV2Enabled();
    const actions =
      v2 && configured !== undefined
        ? withPaymentButtonLimit(
            configured.flatMap((action): CheckoutQuickAction[] => {
              if (action.type === 'multi_flow_checkout') {
                return [action];
              }
              const method = methods.find(candidate => this.#matchesQuickAction(setup, candidate, action));
              return method === undefined ? [] : [{ method, type: 'payment_method' }];
            }),
          )
        : defaultQuickActions(methods, v2);
    const checkoutFlows = this.#resolveCheckoutFlows(setup);
    const offersSplitFlows = checkoutFlows === undefined || checkoutFlows.some(flow => flow !== 'full');
    const forced = !v2 || isCheckoutScreenForced(methods.length, offersSplitFlows);
    const resolved = withoutRedundantLabelSuffixes(withCheckoutScreen(actions, forced));
    return v2 ? withMainQuickAction(resolved) : resolved;
  }

  #matchesQuickAction(
    setup: OnsiteSetup | null,
    method: CheckoutPaymentMethodDescriptor,
    action: Extract<OnsiteSetupPaymentConfigurationQuickAction, { type: 'payment_method' }>,
  ): boolean {
    const delegated = action.provider === 'delegated';
    if (method.delegated !== delegated) {
      return false;
    }
    if (!delegated && action.provider !== setup?.payment_configuration?.integrated_gateway?.provider) {
      return false;
    }
    return method.type === (this.#paymentMethodCodeResolver.resolve(action.code) ?? action.code);
  }

  /**
   * Non-delegated (integrated) options always render first, delegated ones after; within each
   * path the source's display order is kept. A method's payment path comes from the map it
   * belongs to — never re-derived from the type, which cannot tell an integrated `card` from a
   * delegated `card`. When the same type exists on both paths the labels are disambiguated: the
   * integrated entry shows its provider ("Card (Adyen)"), the delegated one shows "External"
   * ("Card (External)").
   */
  #resolveDeclarativeMethods(setup: OnsiteSetup | null): CheckoutPaymentMethodDescriptor[] {
    const { delegated, integrated, integratedProvider } = this.#declarativePaymentMethodsSource.getConfiguredMethods(setup);
    return [
      ...[...integrated.values()].map(method =>
        this.#toDescriptor(method, false, delegated.has(method.type) ? methodLabelSuffixKey(integratedProvider) : null),
      ),
      ...[...delegated.values()].map(method =>
        this.#toDescriptor(method, true, integrated.has(method.type) ? methodLabelSuffixKey('delegated') : null),
      ),
    ];
  }

  #resolveCheckoutFlows(setup: OnsiteSetup | null): CheckoutFlowType[] | undefined {
    if (setup?.payment_configuration?.allow_split_payments === false) {
      return ['full'];
    }
    const multiFlow = setup?.payment_configuration?.checkout?.multi_flow;
    if (!this.#paymentFlowFeatureService.isPaymentConfigurationV2Enabled() || multiFlow === undefined) {
      return undefined;
    }
    if (!multiFlow.enabled) {
      return ['full'];
    }
    const flows = multiFlow.flows.map(flow => CHECKOUT_FLOW_TYPE_BY_CONFIGURED_FLOW[flow]).filter(flow => flow !== undefined);
    return flows.length > 0 ? flows : undefined;
  }

  #resolveDeclarativeTerminals(setup: OnsiteSetup | null): CheckoutTerminalOption[] {
    return this.#declarativePaymentMethodsSource
      .getGatewayTerminals(setup)
      .map(terminal => ({ id: terminal.externalId, label: terminal.label }));
  }

  #toDescriptor(method: ConfiguredPaymentMethod, delegated: boolean, labelSuffixKey: string | null): CheckoutPaymentMethodDescriptor {
    return { delegated, imageUrl: method.iconUrl, label: method.name, labelSuffixKey, type: method.type };
  }
}

function defaultQuickActions(methods: CheckoutPaymentMethodDescriptor[], paymentConfigurationV2: boolean): CheckoutQuickAction[] {
  const integratedCard = methods.find(method => method.type === PaymentType.CARD && !method.delegated);
  const delegatedCash = methods.find(method => method.type === PaymentType.CASH && method.delegated);
  return (paymentConfigurationV2 ? [delegatedCash, integratedCard] : [integratedCard, delegatedCash])
    .filter(method => method !== undefined)
    .map(method => ({ method, type: 'payment_method' as const }));
}

function withCheckoutScreen(actions: CheckoutQuickAction[], forced: boolean): CheckoutQuickAction[] {
  if (actions.some(action => action.type === 'multi_flow_checkout') || (actions.length > 0 && !forced)) {
    return actions;
  }
  return [...actions, { type: 'multi_flow_checkout' }];
}

function withPaymentButtonLimit(actions: CheckoutQuickAction[]): CheckoutQuickAction[] {
  const payments = actions.filter(action => action.type === 'payment_method');
  return actions.filter(
    action => action.type !== 'payment_method' || payments.indexOf(action) < PAYMENT_CONFIGURATION_DIRECT_PAYMENT_BUTTON_LIMIT,
  );
}

function withMainQuickAction(actions: CheckoutQuickAction[]): CheckoutQuickAction[] {
  const main = actions.find(action => action.type === 'payment_method');
  return actions.map(action => (action.type === 'payment_method' ? { ...action, main: action === main } : action));
}

function withoutRedundantLabelSuffixes(actions: CheckoutQuickAction[]): CheckoutQuickAction[] {
  const types = actions.flatMap(action => (action.type === 'payment_method' ? [action.method.type] : []));
  return actions.map(action =>
    action.type === 'payment_method' && types.filter(type => type === action.method.type).length === 1
      ? { ...action, method: { ...action.method, labelSuffixKey: null } }
      : action,
  );
}
