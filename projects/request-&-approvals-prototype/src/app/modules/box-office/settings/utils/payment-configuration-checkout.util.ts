import {
  PaymentConfigurationCheckout,
  PaymentConfigurationCheckoutFlow,
  PaymentConfigurationConfiguredMethod,
  PaymentConfigurationMethodInput,
  PaymentConfigurationQuickAction,
} from '../../shared/models/payment-configuration';
import { PaymentMethodCode } from '../../shared/models/payment-method';

export const DEFAULT_CHECKOUT_FLOWS: PaymentConfigurationCheckoutFlow[] = ['full_payment', 'split_equally', 'pay_by_item', 'custom_split'];
export const MAX_QUICK_ACTIONS = 3;

export interface PaymentConfigurationFlowSetting {
  enabled: boolean;
  flow: PaymentConfigurationCheckoutFlow;
}

export function toFlowSettings(flows: PaymentConfigurationCheckoutFlow[]): PaymentConfigurationFlowSetting[] {
  const enabled = flows.filter(flow => DEFAULT_CHECKOUT_FLOWS.includes(flow));
  const settings = enabled.length > 0 ? enabled : DEFAULT_CHECKOUT_FLOWS.slice(0, 1);
  return [
    ...settings.map(flow => ({ enabled: true, flow })),
    ...DEFAULT_CHECKOUT_FLOWS.filter(flow => !settings.includes(flow)).map(flow => ({ enabled: false, flow })),
  ];
}

export function withQuickActions(
  checkout: PaymentConfigurationCheckout,
  quickActions: PaymentConfigurationQuickAction[] | null,
): PaymentConfigurationCheckout {
  if (quickActions === null) {
    return checkout;
  }
  const enabledKeys = new Set(checkout.paymentMethods.map(methodKey));
  const room = MAX_QUICK_ACTIONS - Number(checkout.multiFlow.enabled);
  const paymentActions = quickActions
    .filter(action => action.type === 'payment_method' && enabledKeys.has(methodKey(action)))
    .slice(0, room);
  const kept = quickActions.filter(action =>
    action.type === 'payment_method' ? paymentActions.includes(action) : checkout.multiFlow.enabled,
  );
  return { ...checkout, quickActions: quickActionsFor({ ...checkout, quickActions: kept }, checkout.multiFlow.enabled) };
}

export function quickActionKey(action: PaymentConfigurationQuickAction): string {
  return action.type === 'payment_method' ? methodKey(action) : action.type;
}

export function withMultiFlow(
  checkout: PaymentConfigurationCheckout,
  enabled: boolean,
  settings: PaymentConfigurationFlowSetting[],
): PaymentConfigurationCheckout {
  if (checkout.multiFlow.enabled === enabled && sameFlowSettings(toFlowSettings(checkout.multiFlow.flows), settings)) {
    return checkout;
  }
  const flows = settings.filter(setting => setting.enabled).map(setting => setting.flow);
  return { multiFlow: { enabled, flows }, paymentMethods: checkout.paymentMethods, quickActions: quickActionsFor(checkout, enabled) };
}

export function defaultCheckout(methods: PaymentConfigurationConfiguredMethod[]): PaymentConfigurationCheckout {
  const ordered = [...methods].sort(compareBoxOfficeOrder);
  const integratedCard = ordered.find(method => !isDelegated(method) && method.methodCode === PaymentMethodCode.CARD);
  const delegatedCash = ordered.find(method => isDelegated(method) && method.methodCode === PaymentMethodCode.CASH);
  return {
    multiFlow: { enabled: true, flows: [...DEFAULT_CHECKOUT_FLOWS] },
    paymentMethods: ordered.map(toReference),
    quickActions: [
      ...[delegatedCash, integratedCard]
        .filter((method): method is PaymentConfigurationConfiguredMethod => method !== undefined)
        .map(toPaymentMethodQuickAction),
      { type: 'multi_flow_checkout' },
    ],
  };
}

export function reconcileCheckout(
  checkout: PaymentConfigurationCheckout,
  previousMethods: PaymentConfigurationConfiguredMethod[],
  methods: PaymentConfigurationConfiguredMethod[],
): PaymentConfigurationCheckout {
  const defaults = defaultCheckout(methods);
  if (isUnset(checkout) || checkoutKey(checkout) === checkoutKey(defaultCheckout(previousMethods))) {
    return defaults;
  }

  const previousKeys = new Set(previousMethods.map(methodKey));
  const configuredKeys = new Set(methods.map(methodKey));
  const kept = checkout.paymentMethods.filter(method => configuredKeys.has(methodKey(method)));
  const keptKeys = new Set(kept.map(methodKey));
  const added = defaults.paymentMethods.filter(method => !previousKeys.has(methodKey(method)) && !keptKeys.has(methodKey(method)));
  const paymentMethods = kept.length + added.length > 0 ? [...kept, ...added] : defaults.paymentMethods.slice(0, 1);
  const enabledKeys = new Set(paymentMethods.map(methodKey));

  const keptQuickActions = checkout.quickActions.filter(action => action.type !== 'payment_method' || enabledKeys.has(methodKey(action)));
  const quickActions =
    keptQuickActions.length === 0 && paymentMethods.length > 0 ? [toPaymentMethodQuickAction(paymentMethods[0])] : keptQuickActions;

  return {
    multiFlow: { enabled: checkout.multiFlow.enabled, flows: [...checkout.multiFlow.flows] },
    paymentMethods,
    quickActions,
  };
}

function checkoutKey(checkout: PaymentConfigurationCheckout): string {
  return JSON.stringify([
    checkout.multiFlow.enabled,
    checkout.multiFlow.flows,
    checkout.paymentMethods.map(methodKey),
    checkout.quickActions.map(quickActionKey),
  ]);
}

function sameFlowSettings(a: PaymentConfigurationFlowSetting[], b: PaymentConfigurationFlowSetting[]): boolean {
  return a.length === b.length && a.every((setting, index) => setting.flow === b[index].flow && setting.enabled === b[index].enabled);
}

function quickActionsFor(checkout: PaymentConfigurationCheckout, multiFlowEnabled: boolean): PaymentConfigurationQuickAction[] {
  const hasMultiFlowAction = checkout.quickActions.some(action => action.type === 'multi_flow_checkout');
  if (multiFlowEnabled && hasMultiFlowAction) {
    return checkout.quickActions;
  }
  const paymentActions = checkout.quickActions.filter(action => action.type === 'payment_method');
  if (multiFlowEnabled) {
    return [...paymentActions.slice(0, MAX_QUICK_ACTIONS - 1), { type: 'multi_flow_checkout' }];
  }
  return paymentActions.length > 0 ? paymentActions : [{ type: 'multi_flow_checkout' }];
}

function compareBoxOfficeOrder(a: PaymentConfigurationConfiguredMethod, b: PaymentConfigurationConfiguredMethod): number {
  return (
    Number(isDelegated(a)) - Number(isDelegated(b)) ||
    rank(a) - rank(b) ||
    compareCodePoints(a.displayNameKey, b.displayNameKey) ||
    compareCodePoints(a.methodCode, b.methodCode)
  );
}

function compareCodePoints(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function isDelegated(method: PaymentConfigurationMethodInput): boolean {
  return method.gatewayProvider === 'delegated';
}

function isUnset(checkout: PaymentConfigurationCheckout): boolean {
  return checkout.paymentMethods.length === 0 || checkout.quickActions.length === 0;
}

function methodKey(method: PaymentConfigurationMethodInput): string {
  return `${method.gatewayProvider}:${method.methodCode}`;
}

function rank(method: PaymentConfigurationMethodInput): number {
  return method.methodCode === PaymentMethodCode.CASH ? 0 : method.methodCode === PaymentMethodCode.CARD ? 1 : 2;
}

function toPaymentMethodQuickAction(method: PaymentConfigurationMethodInput): PaymentConfigurationQuickAction {
  return { type: 'payment_method', ...toReference(method) };
}

function toReference(method: PaymentConfigurationMethodInput): PaymentConfigurationMethodInput {
  return { gatewayProvider: method.gatewayProvider, methodCode: method.methodCode };
}
