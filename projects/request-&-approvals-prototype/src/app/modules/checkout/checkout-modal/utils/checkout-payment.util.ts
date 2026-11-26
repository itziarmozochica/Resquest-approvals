import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';

import type { CheckoutContext, CheckoutPaymentMethodDescriptor } from '../models/checkout.model';

/**
 * Descriptor of a method option. An option is the `(type, delegated)` pair — the same `type` can be
 * offered both integrated and delegated — so `delegated` narrows the lookup; with no recorded path
 * (`null`, i.e. legacy/spec selections) it falls back to the first descriptor of the type.
 */
export function findCheckoutMethodDescriptor(
  context: CheckoutContext,
  method: PaymentType | null,
  delegated: boolean | null = null,
): CheckoutPaymentMethodDescriptor | null {
  if (method === null) {
    return null;
  }
  return (
    context.availableMethods.find(descriptor => descriptor.type === method && (delegated === null || descriptor.delegated === delegated)) ??
    null
  );
}

/**
 * The card method preselected when the modal opens (B2BO-8101: "card is selected by default").
 * Prefers the integrated (non-delegated) card so the terminal selector shows, falling back to a
 * delegated card; `null` when the setup offers no card at all.
 */
export function findDefaultCheckoutCardMethod(context: CheckoutContext): CheckoutPaymentMethodDescriptor | null {
  const cards = context.availableMethods.filter(descriptor => descriptor.type === PaymentType.CARD);
  return cards.find(descriptor => !descriptor.delegated) ?? cards[0] ?? null;
}

/**
 * The cash method preselected by the direct-cash flow (B2BO-8678). Only the delegated option
 * qualifies: cash is always externally managed, and the cash-tendered capture gate reads the
 * delegated flag. `null` when the setup offers no delegated cash.
 */
export function findDefaultCheckoutCashMethod(context: CheckoutContext): CheckoutPaymentMethodDescriptor | null {
  return context.availableMethods.find(descriptor => descriptor.type === PaymentType.CASH && descriptor.delegated) ?? null;
}

/** Descriptor of the currently selected method option, by its `(type, delegated)` pair. */
export function findSelectedCheckoutMethodDescriptor(context: CheckoutContext): CheckoutPaymentMethodDescriptor | null {
  return findCheckoutMethodDescriptor(context, context.selectedMethod, context.selectedMethodDelegated);
}

export function getCheckoutPaymentMethodLabel(context: CheckoutContext): string | null {
  return findSelectedCheckoutMethodDescriptor(context)?.label ?? null;
}

/**
 * Disambiguation suffix key of the selected method's descriptor ("Card (Adyen)" vs
 * "Card (External)"), `null` when the option has none: every step that shows the selected method
 * must render it, or the two options of a colliding type become indistinguishable after selection.
 */
export function getCheckoutPaymentMethodLabelSuffixKey(context: CheckoutContext): string | null {
  return findSelectedCheckoutMethodDescriptor(context)?.labelSuffixKey ?? null;
}

/** Delegated flag of the selected method's descriptor, `false` when none is selected or available. */
export function isDelegatedCheckoutMethod(context: CheckoutContext): boolean {
  return findSelectedCheckoutMethodDescriptor(context)?.delegated ?? false;
}

/** Only non-delegated (integrated) methods are driven through a terminal, when the setup has any. */
export function checkoutMethodRequiresTerminal(context: CheckoutContext): boolean {
  const descriptor = findSelectedCheckoutMethodDescriptor(context);
  return descriptor !== null && !descriptor.delegated && context.availableTerminals.length > 0;
}

export function isTapToPayCheckoutPayment(context: CheckoutContext): boolean {
  const descriptor = findSelectedCheckoutMethodDescriptor(context);
  return context.tapToPay === true && descriptor !== null && !descriptor.delegated;
}

export function canConfirmCheckoutMethod(context: CheckoutContext): boolean {
  if (context.selectedMethod === null) {
    return false;
  }
  if (checkoutMethodRequiresTerminal(context)) {
    return context.selectedTerminalId !== null && context.selectedTerminalId !== '';
  }
  return true;
}
