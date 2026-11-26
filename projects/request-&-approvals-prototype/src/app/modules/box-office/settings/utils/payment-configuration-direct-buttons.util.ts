import {
  PAYMENT_CONFIGURATION_DIRECT_PAYMENT_BUTTON_LIMIT,
  PaymentConfigurationCheckout,
  PaymentConfigurationMethodInput,
  PaymentConfigurationQuickAction,
} from '../../shared/models/payment-configuration';
import { isCheckoutScreenForced } from '../../shared/utils/direct-payment-buttons.util';
import {
  PaymentConfigurationDirectButtonChoice,
  PaymentConfigurationDirectButtonLabels,
  PaymentConfigurationDirectButtonSlot,
  PaymentConfigurationDirectButtonSlotChange,
  PaymentConfigurationDirectButtonSlotId,
  PaymentConfigurationDirectButtonSlotToggle,
} from '../components/payment-configuration-direct-buttons/payment-configuration-direct-buttons.model';
import { quickActionKey } from './payment-configuration-checkout.util';

export const DIRECT_BUTTON_SLOT_IDS: PaymentConfigurationDirectButtonSlotId[] = ['primary', 'secondary', 'tertiary'];
export const DIRECT_BUTTON_METHOD_SLOT_COUNT = PAYMENT_CONFIGURATION_DIRECT_PAYMENT_BUTTON_LIMIT;

type PaymentMethodQuickAction = Extract<PaymentConfigurationQuickAction, { type: 'payment_method' }>;

export function toDirectButtonSlots(
  checkout: PaymentConfigurationCheckout,
  labels: PaymentConfigurationDirectButtonLabels,
): PaymentConfigurationDirectButtonSlot[] {
  const payments = paymentActions(checkout.quickActions);
  const checkoutScreen = checkoutScreenOf(checkout.quickActions);
  const chosenKeys = payments.map(quickActionKey);
  const free = checkout.paymentMethods.filter(method => !chosenKeys.includes(methodKey(method)));
  const toChoice = (method: PaymentConfigurationMethodInput): PaymentConfigurationDirectButtonChoice => ({
    id: methodKey(method),
    label: labels.methodLabel(method),
  });

  const methodSlots = DIRECT_BUTTON_SLOT_IDS.slice(0, DIRECT_BUTTON_METHOD_SLOT_COUNT).map(
    (id, index): PaymentConfigurationDirectButtonSlot => {
      const action = payments[index];
      if (action === undefined) {
        const unavailable = checkout.paymentMethods.length <= index || free.length === 0;
        return {
          enabled: false,
          id,
          items: unavailable ? [] : free.map(toChoice),
          kind: 'method',
          label: null,
          method: null,
          selectedKey: null,
          toggleable: !unavailable && payments.length === index,
          unavailable,
        };
      }
      const own = checkout.paymentMethods.find(method => methodKey(method) === quickActionKey(action)) ?? action;
      return {
        enabled: true,
        id,
        items: [own, ...free].map(toChoice),
        kind: 'method',
        label: labels.methodLabel(own),
        method: { gatewayProvider: own.gatewayProvider, methodCode: own.methodCode },
        selectedKey: methodKey(own),
        toggleable: true,
        unavailable: false,
      };
    },
  );

  if (checkoutScreen === undefined && !needsCheckoutScreen(checkout)) {
    return methodSlots;
  }
  const only = payments.length === 0;
  return [
    ...methodSlots,
    {
      enabled: true,
      id: 'tertiary',
      items: [],
      kind: only ? 'pay' : 'see_more',
      label: only ? labels.pay : labels.seeMore,
      method: null,
      selectedKey: null,
      toggleable: false,
      unavailable: false,
    },
  ];
}

export function needsCheckoutScreen(checkout: PaymentConfigurationCheckout): boolean {
  const { multiFlow } = checkout;
  const offersSplitFlows = multiFlow.enabled && multiFlow.flows.some(flow => flow !== 'full_payment');
  return checkoutScreenOf(checkout.quickActions) === undefined && isCheckoutScreenForced(checkout.paymentMethods.length, offersSplitFlows);
}

export function withDirectButtonLimit(checkout: PaymentConfigurationCheckout): PaymentConfigurationCheckout {
  const payments = paymentActions(checkout.quickActions);
  if (payments.length <= DIRECT_BUTTON_METHOD_SLOT_COUNT) {
    return checkout;
  }
  return { ...checkout, quickActions: withCheckoutScreenLast(payments.slice(0, DIRECT_BUTTON_METHOD_SLOT_COUNT), checkout.quickActions) };
}

export function withMainDirectButtonKept(
  checkout: PaymentConfigurationCheckout,
  requested: PaymentConfigurationQuickAction[],
): PaymentConfigurationCheckout {
  const main = checkout.paymentMethods[0];
  if (paymentActions(checkout.quickActions).length > 0 || paymentActions(requested).length === 0 || main === undefined) {
    return checkout;
  }
  const handedOver = [toPaymentAction(main)];
  return { ...checkout, quickActions: checkout.multiFlow.enabled ? withCheckoutScreenLast(handedOver, checkout.quickActions) : handedOver };
}

export function withDirectButtonRow(
  checkout: PaymentConfigurationCheckout,
  toggle: PaymentConfigurationDirectButtonSlotToggle,
): PaymentConfigurationQuickAction[] {
  const payments = paymentActions(checkout.quickActions);
  const index = DIRECT_BUTTON_SLOT_IDS.indexOf(toggle.id);
  if (!toggle.enabled) {
    return index < payments.length ? withCheckoutScreenLast(payments.slice(0, index), checkout.quickActions) : checkout.quickActions;
  }
  const chosenKeys = payments.map(quickActionKey);
  const next = checkout.paymentMethods.find(method => !chosenKeys.includes(methodKey(method)));
  if (next === undefined || payments.length !== index) {
    return checkout.quickActions;
  }
  return withCheckoutScreenLast([...payments, toPaymentAction(next)], checkout.quickActions);
}

export function withDirectButtonSlot(
  checkout: PaymentConfigurationCheckout,
  change: PaymentConfigurationDirectButtonSlotChange,
): PaymentConfigurationQuickAction[] {
  const method = checkout.paymentMethods.find(candidate => methodKey(candidate) === change.key);
  const index = DIRECT_BUTTON_SLOT_IDS.indexOf(change.id);
  const payments = paymentActions(checkout.quickActions);
  if (method === undefined || index === -1 || index >= payments.length) {
    return checkout.quickActions;
  }
  const holder = payments.findIndex(action => quickActionKey(action) === change.key);
  const next = [...payments];
  if (holder !== -1) {
    next[holder] = payments[index];
  }
  next[index] = toPaymentAction(method);
  return withCheckoutScreenLast(next, checkout.quickActions);
}

function checkoutScreenOf(quickActions: PaymentConfigurationQuickAction[]): PaymentConfigurationQuickAction | undefined {
  return quickActions.find(action => action.type === 'multi_flow_checkout');
}

function methodKey(method: PaymentConfigurationMethodInput): string {
  return quickActionKey(toPaymentAction(method));
}

function paymentActions(quickActions: PaymentConfigurationQuickAction[]): PaymentMethodQuickAction[] {
  return quickActions.filter((action): action is PaymentMethodQuickAction => action.type === 'payment_method');
}

function toPaymentAction(method: PaymentConfigurationMethodInput): PaymentMethodQuickAction {
  return { gatewayProvider: method.gatewayProvider, methodCode: method.methodCode, type: 'payment_method' };
}

function withCheckoutScreenLast(
  payments: PaymentMethodQuickAction[],
  previous: PaymentConfigurationQuickAction[],
): PaymentConfigurationQuickAction[] {
  const checkoutScreen = checkoutScreenOf(previous);
  return checkoutScreen === undefined ? payments : [...payments, checkoutScreen];
}
