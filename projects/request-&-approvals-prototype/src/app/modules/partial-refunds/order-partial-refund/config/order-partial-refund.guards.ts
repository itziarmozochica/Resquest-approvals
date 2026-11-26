import type { OrderPartialRefundContext } from '../models/order-partial-refund-context.model';

export const hasSelection = (context: OrderPartialRefundContext): boolean => context.selectedOrderItemIds.size > 0;

/** A selection or any answer on the definition step: what the discard confirmation guards. */
export const hasUnsavedInput = (context: OrderPartialRefundContext): boolean =>
  hasSelection(context) || context.mode !== null || context.value !== null || context.includeSurcharge !== null || context.reason !== null;

export const hasNoUnsavedInput = (context: OrderPartialRefundContext): boolean => !hasUnsavedInput(context);
