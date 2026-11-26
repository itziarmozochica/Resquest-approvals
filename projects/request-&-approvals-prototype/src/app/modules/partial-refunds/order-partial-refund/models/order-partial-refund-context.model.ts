import type { TicketSummary } from '@fz-original/app/modules/cancellation/models/ticket-summary.model';

import type { PartialRefundDefinitionState } from '../../models/partial-refund-definition.model';
import type { PartialRefundPreview } from '../../models/partial-refund-preview.model';
import type { RequestState } from '../../models/request-state.model';

export type OrderPartialRefundStepId =
  | 'confirmDiscard'
  | 'defineRefund'
  | 'queued'
  | 'review'
  | 'selectTickets'
  | 'submitFailed'
  | 'submitting';

/** `back`, `cancel`, `close` and `dismiss` are the engine's reserved intents: the shell handles them itself. */
export type OrderPartialRefundIntent =
  | 'back'
  | 'cancel'
  | 'close'
  | 'confirm'
  | 'continue'
  | 'dismiss'
  | 'requestExit'
  | 'submitFailed'
  | 'submitSucceeded';

/** What the status probe learnt about one order item: the engine's own figures, never recomputed here. */
export interface OrderItemRefundStatus {
  readonly alreadyRefundedAmount: number;
  readonly currency: string;
  readonly remainingAmount: number;
}

export enum TicketRefundStatus {
  FullyRefunded = 'fullyRefunded',
  NotRefundable = 'notRefundable',
  PartiallyRefunded = 'partiallyRefunded',
}

/** One ticket as the select step shows it: whether it can be ticked, and the tag that says why. */
export interface TicketRefundState {
  readonly isSelectable: boolean;
  /** Summed across a pack's order items; null while the engine has not named every one of them. */
  readonly remaining: { readonly amount: number; readonly currency: string } | null;
  readonly status: TicketRefundStatus | null;
}

export interface OrderPartialRefundContext extends PartialRefundDefinitionState {
  readonly doubleRefundAcknowledged: boolean;
  /** Keyed by order item id. Empty until the probe answers, and stays empty when it fails. */
  itemStatuses: ReadonlyMap<number, OrderItemRefundStatus>;
  /** Rejection codes the probe returned for the order as a whole; any one of them blocks the flow. */
  orderBlockers: readonly string[];
  orderId: number;
  partnerId: number;
  selectedOrderItemIds: ReadonlySet<number>;
  /** The probe: one preview over every cancellable item, run on open, to tell already-refunded tickets apart. */
  status: RequestState<PartialRefundPreview>;
  ticketsSummaries: readonly TicketSummary[];
}

export interface OrderPartialRefundModalData {
  orderId: number;
  partnerId: number;
  ticketsSummaries: readonly TicketSummary[];
}
