import { computed, inject } from '@angular/core';

import type { CancellableItem, TicketSummary } from '@fz-original/app/modules/cancellation/models/ticket-summary.model';
import { withMultiStepNavigation } from '@fz-original/app/shared/multi-step-modal/store/with-multi-step-navigation.feature';
import { IGNT_DIALOG_DATA } from '@ignite/common';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, type Observable } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

import type { PartialRefundOrderItemCriteria } from '../../models/partial-refund-criteria.model';
import { clearedPreview, type PartialRefundRequestInput } from '../../models/partial-refund-definition.model';
import { partialRefundModes, type PartialRefundMode } from '../../models/partial-refund-mode.model';
import type {
  PartialRefundPreview,
  PartialRefundPreviewItem,
  PartialRefundPreviewRow,
  PartialRefundPreviewSection,
} from '../../models/partial-refund-preview.model';
import type { PartialRefundReason } from '../../models/partial-refund-reason.model';
import { partialRefundRejectionCodes } from '../../models/partial-refund-rejection.model';
import { PartialRefundApiService } from '../../services/partial-refund-api.service';
import { partialRefundConfirmPipeline, partialRefundPreviewPipeline } from '../../store/partial-refund-request.pipelines';
import { refundTicketCount } from '../../utils/partial-refund-definition.util';
import { requestFailed, requestLoading, requestSucceeded } from '../../utils/request-state.util';
import {
  TicketRefundStatus,
  type OrderItemRefundStatus,
  type OrderPartialRefundContext,
  type OrderPartialRefundIntent,
  type OrderPartialRefundModalData,
  type OrderPartialRefundStepId,
  type TicketRefundState,
} from '../models/order-partial-refund-context.model';
import { initialOrderPartialRefundState, type OrderPartialRefundStoreState } from '../models/order-partial-refund-store.model';

/**
 * The probe asks for everything, so the answer names every ticket: a full percentage over every
 * cancellable item, fees included, double refunds accepted. Its amounts are never shown; only the
 * per-item history and the order-level rejections are read from it.
 */
const statusProbe = { doubleRefundAcknowledged: true, includeSurcharge: true, mode: partialRefundModes.PERCENTAGE, value: 100 } as const;

/**
 * The codes that shut the whole order out. The two ceiling codes are left off on purpose: the probe
 * asks for the full amount, so a ticket with only part of it left trips them without meaning the
 * order cannot be refunded at all.
 */
const orderBlockingCodes: ReadonlySet<string> = new Set([
  partialRefundRejectionCodes.GATEWAY_PARTIAL_REFUND_NOT_SUPPORTED,
  partialRefundRejectionCodes.NO_REFUNDABLE_AMOUNT,
  partialRefundRejectionCodes.ORDER_NOT_REFUNDABLE,
  partialRefundRejectionCodes.PAYMENT_METHOD_NOT_REFUNDABLE,
  partialRefundRejectionCodes.PAYMENT_METHOD_PARTIAL_REFUND_NOT_SUPPORTED,
  partialRefundRejectionCodes.PAYMENT_METHOD_REFUND_PERIOD_EXPIRED,
  partialRefundRejectionCodes.UNSUPPORTED_MULTI_LEG_ORDER,
]);

function allOrderItemIds(context: OrderPartialRefundContext): number[] {
  return context.ticketsSummaries.flatMap(summary => summary.cancellableItems.flatMap(item => item.orderItemIds));
}

/**
 * The probe's answer names each ticket only when the order has 100 order items or fewer; past that
 * the engine leaves `items` out, and the order-level rejections are all it says.
 */
function isItemHistoryKnown(context: OrderPartialRefundContext): boolean {
  const probe = context.status.data;
  return probe !== null && (probe.items.length > 0 || probe.totalItems === 0);
}

/**
 * Picking a ticket refunded before is the acknowledgment. Without per-ticket history it is assumed,
 * since withheld on such an order the engine refuses the whole selection.
 */
function acknowledgesDoubleRefund(context: OrderPartialRefundContext): boolean {
  return (
    !isItemHistoryKnown(context) ||
    [...context.selectedOrderItemIds].some(id => (context.itemStatuses.get(id)?.alreadyRefundedAmount ?? 0) > 0)
  );
}

/**
 * Selectable is what the engine would still pay out on. A ticket that cannot be cancelled (validated,
 * outside the window, a non-cancellable type) can still be partially refunded, so only `isCancelled`
 * or the engine's answer takes one out. Before the probe answers, when it could not, or when it left
 * the tickets out, every uncancelled ticket stays selectable; the probe narrows that, it never widens it.
 * A pack counts as one ticket: every order item of it must be named, and something must be left across them.
 */
function ticketRefundState(item: CancellableItem, context: OrderPartialRefundContext): TicketRefundState {
  if (item.isCancelled || item.orderItemIds.length === 0) {
    return { isSelectable: false, remaining: null, status: TicketRefundStatus.NotRefundable };
  }
  if (!isItemHistoryKnown(context)) {
    return { isSelectable: true, remaining: null, status: null };
  }
  const statuses = item.orderItemIds.map(id => context.itemStatuses.get(id));
  const known = statuses.filter((entry): entry is OrderItemRefundStatus => entry !== undefined);
  if (known.length < statuses.length) {
    return { isSelectable: false, remaining: null, status: TicketRefundStatus.NotRefundable };
  }
  const remaining = { amount: known.reduce((total, entry) => total + entry.remainingAmount, 0), currency: known[0].currency };
  if (remaining.amount <= 0) {
    return { isSelectable: false, remaining, status: TicketRefundStatus.FullyRefunded };
  }
  const isPartiallyRefunded = known.some(entry => entry.alreadyRefundedAmount > 0);
  return { isSelectable: true, remaining, status: isPartiallyRefunded ? TicketRefundStatus.PartiallyRefunded : null };
}

function isItemSelectable(item: CancellableItem, context: OrderPartialRefundContext): boolean {
  return ticketRefundState(item, context).isSelectable;
}

function selectableOrderItemIds(context: OrderPartialRefundContext): ReadonlySet<number> {
  return new Set(
    context.ticketsSummaries.flatMap(summary =>
      summary.cancellableItems.filter(item => isItemSelectable(item, context)).flatMap(item => item.orderItemIds),
    ),
  );
}

/** A pack's order items summed into one ticket row; every amount is a sum of the engine's own figures. */
function ticketRow(ticket: CancellableItem | undefined, items: readonly PartialRefundPreviewItem[]): PartialRefundPreviewRow {
  const [first] = items;
  const sum = (amount: (item: PartialRefundPreviewItem) => number): number => items.reduce((total, item) => total + amount(item), 0);
  const refundAmount = sum(item => item.refundAmount);
  const refundableBase = sum(item => item.refundableBase);
  const code = ticket === undefined ? String(first.orderItemId) : (ticket.code?.code ?? ticket.referenceId);
  return {
    alreadyRefundedAmount: sum(item => item.alreadyRefundedAmount),
    currency: first.currency,
    isCapped: items.some(item => item.isCapped),
    refundableBaseAmount: refundableBase,
    refundableBasePerTicket: refundableBase,
    refundAmount,
    refundAmountPerTicket: refundAmount,
    remainingAmount: sum(item => item.remainingAmount),
    remainingAmountAfter: sum(item => item.remainingAmountAfter),
    ticketsCount: 1,
    ticketTypeLabel: `${code} · ${first.ticketTypeLabel}`,
  };
}

/** One row per ticket. Past 100 order items the engine leaves `preview.items` out, so its ticket-type rows stand. */
function ticketSection(context: OrderPartialRefundContext): PartialRefundPreviewSection | null {
  const preview = context.preview.data;
  const section = preview?.sections[0];
  if (preview === null || section === undefined) {
    return null;
  }
  if (preview.items.length === 0) {
    return section;
  }
  const tickets = context.ticketsSummaries.flatMap(summary => summary.cancellableItems);
  const groups = new Map<CancellableItem | number, PartialRefundPreviewItem[]>();
  for (const item of preview.items) {
    const key = tickets.find(candidate => candidate.orderItemIds.includes(item.orderItemId)) ?? item.orderItemId;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return {
    currency: section.currency,
    rows: [...groups].map(([key, items]) => ticketRow(typeof key === 'number' ? undefined : key, items)),
    totals: section.totals,
  };
}

/** Keyed by the ticket's reference id, which is what the select step tracks its rows by. */
function ticketRefundStates(context: OrderPartialRefundContext): ReadonlyMap<string, TicketRefundState> {
  return new Map(
    context.ticketsSummaries.flatMap(summary => summary.cancellableItems.map(item => [item.referenceId, ticketRefundState(item, context)])),
  );
}

function rejectionCodesOf(preview: PartialRefundPreview): string[] {
  return preview.rejectedOrders.length > 0
    ? preview.rejectedOrders.flatMap(order => order.rejectionCodes)
    : preview.rejections.map(rejection => rejection.code);
}

function blockersOf(preview: PartialRefundPreview): string[] {
  return [...new Set(rejectionCodesOf(preview).filter(code => orderBlockingCodes.has(code)))];
}

/**
 * A refund made outside this flow lowers the order's total without saying which tickets it covered,
 * so the probe trips the order ceiling and the engine names no ticket at all.
 */
function hasUntrackedRefunds(context: OrderPartialRefundContext): boolean {
  const probe = context.status.data;
  return (
    probe !== null &&
    !isItemHistoryKnown(context) &&
    rejectionCodesOf(probe).includes(partialRefundRejectionCodes.AMOUNT_EXCEEDS_ORDER_CEILING)
  );
}

/** Modal-scoped: provided by the shell, so closing the dialog discards the selection and the answers. */
export const OrderPartialRefundStore = signalStore(
  withState<OrderPartialRefundStoreState>(initialOrderPartialRefundState),
  withMultiStepNavigation<OrderPartialRefundContext, OrderPartialRefundStepId, OrderPartialRefundIntent>(),
  withComputed(store => ({
    criteria: computed<PartialRefundOrderItemCriteria | null>(() => {
      const orderItemIds = [...store.context().selectedOrderItemIds];
      return orderItemIds.length > 0 ? { orderItemIds } : null;
    }),
    doubleRefundAcknowledged: computed(() => store.context().doubleRefundAcknowledged),
    hasUntrackedRefunds: computed(() => hasUntrackedRefunds(store.context())),
    /** Read off the engine's figures, so it holds even when the probe could not tell the tickets apart. */
    includesPriorRefund: computed(() => (store.context().preview.data?.sections[0]?.totals.alreadyRefundedAmount ?? 0) > 0),
    includeSurcharge: computed(() => store.context().includeSurcharge),
    isOrderBlocked: computed(() => store.context().orderBlockers.length > 0),
    /** Whether the engine named each order item. Its own cut-off decides, so the review never repeats it. */
    isReviewPerTicket: computed(() => (store.context().preview.data?.items.length ?? 0) > 0),
    isStatusKnown: computed(() => isItemHistoryKnown(store.context())),
    job: computed(() => store.context().job),
    mode: computed(() => store.context().mode),
    preview: computed(() => store.context().preview),
    previewedAmount: computed(() => store.context().previewedAmount),
    previewedIncludeSurcharge: computed(() => store.context().previewedIncludeSurcharge),
    previewedRate: computed(() => store.context().previewedRate),
    reason: computed(() => store.context().reason),
    refundTicketCount: computed(() => refundTicketCount(store.context().preview.data)),
    /** One order is one currency, so the first section is the whole refund. */
    refundTotal: computed<{ amount: number; currency: string } | null>(() => {
      const section = store.context().preview.data?.sections[0];
      return section === undefined ? null : { amount: section.totals.refundAmount, currency: section.currency };
    }),
    reviewSection: computed<PartialRefundPreviewSection | null>(() => ticketSection(store.context())),
    selectableOrderItemIds: computed<ReadonlySet<number>>(() => selectableOrderItemIds(store.context())),
    selectedTicketCount: computed(() => {
      const selected = store.context().selectedOrderItemIds;
      return store
        .context()
        .ticketsSummaries.flatMap(summary => summary.cancellableItems)
        .filter(item => item.orderItemIds.length > 0 && item.orderItemIds.every(id => selected.has(id))).length;
    }),
    ticketRefundStates: computed<ReadonlyMap<string, TicketRefundState>>(() => ticketRefundStates(store.context())),
    totalTicketCount: computed(() =>
      store.context().ticketsSummaries.reduce((total, summary) => total + summary.cancellableItems.length, 0),
    ),
    value: computed(() => store.context().value),
  })),
  // A second block so it can read `selectableOrderItemIds`: siblings of one `withComputed` cannot see each other.
  withComputed(store => ({
    isEverySelectableSelected: computed(() => {
      const selectable = store.selectableOrderItemIds();
      const selected = store.context().selectedOrderItemIds;
      return selectable.size > 0 && [...selectable].every(id => selected.has(id));
    }),
  })),
  withMethods((store, api = inject(PartialRefundApiService)) => {
    const patchContext = (changes: Partial<OrderPartialRefundContext>): void => {
      patchState(store, { context: { ...store.context(), ...changes } });
    };
    const requestInput = (): PartialRefundRequestInput | null => {
      const context = store.context();
      const criteria = store.criteria();
      return criteria === null
        ? null
        : { criteria, definition: context, doubleRefundAcknowledged: context.doubleRefundAcknowledged, partnerId: context.partnerId };
    };
    /** Another selection is another refund, so the figures for the old one go with it. */
    const select = (selectedOrderItemIds: ReadonlySet<number>): void => {
      const doubleRefundAcknowledged = acknowledgesDoubleRefund({ ...store.context(), selectedOrderItemIds });
      patchContext({ ...clearedPreview, doubleRefundAcknowledged, selectedOrderItemIds });
    };
    const loadPreview = rxMethod<void>(
      partialRefundPreviewPipeline({
        api,
        read: requestInput,
        write: {
          failed: (error): void => patchContext({ ...clearedPreview, preview: requestFailed(error) }),
          idle: (): void => patchContext(clearedPreview),
          isStillLoading: (): boolean => store.context().preview.isLoading,
          loading: (): void => patchContext({ preview: requestLoading(store.context().preview) }),
          succeeded: (resolved, snapshot): void => patchContext({ ...snapshot, preview: requestSucceeded(resolved) }),
        },
      }),
    );
    /** A guard refusal fails the flow: `submitting` cannot be closed, so it must not leave the operator on a spinner. */
    const baseTransition = store.transition;
    const submit = rxMethod<void>(
      partialRefundConfirmPipeline({
        api,
        read: requestInput,
        write: {
          failed: (error): void => {
            patchContext({ job: requestFailed(error) });
            baseTransition('submitFailed');
          },
          loading: (): void => patchContext({ job: requestLoading(store.context().job) }),
          refused: (): void => baseTransition('submitFailed'),
          succeeded: (queued): void => {
            patchContext({ job: requestSucceeded(queued) });
            baseTransition('submitSucceeded');
          },
        },
        state: () => store.context(),
      }),
    );
    return {
      loadPreview,
      /**
       * The order detail says nothing about partial refunds per ticket, so the engine is asked once,
       * up front, about every ticket. Failing is not fatal: every uncancelled ticket stays selectable.
       */
      loadStatus: rxMethod<void>(
        switchMap((): Observable<PartialRefundPreview> => {
          const context = store.context();
          const orderItemIds = allOrderItemIds(context);
          if (orderItemIds.length === 0) {
            return EMPTY;
          }
          patchContext({ status: requestLoading(context.status) });
          return api.getPreview(context.partnerId, { ...statusProbe, criteria: { orderItemIds } }).pipe(
            tap(probe => {
              const itemStatuses = new Map<number, OrderItemRefundStatus>(
                probe.items.map(item => [
                  item.orderItemId,
                  { alreadyRefundedAmount: item.alreadyRefundedAmount, currency: item.currency, remainingAmount: item.remainingAmount },
                ]),
              );
              const answered = { ...store.context(), itemStatuses, orderBlockers: blockersOf(probe), status: requestSucceeded(probe) };
              const doubleRefundAcknowledged = acknowledgesDoubleRefund(answered);
              patchContext(
                doubleRefundAcknowledged === answered.doubleRefundAcknowledged
                  ? answered
                  : { ...answered, ...clearedPreview, doubleRefundAcknowledged },
              );
            }),
            catchError((error: unknown) => {
              patchContext({ status: requestFailed(error) });
              return EMPTY;
            }),
          );
        }),
      ),
      /** Arriving on the define step with no figures asks again: a new selection drops them. */
      ensurePreview(): void {
        const { preview } = store.context();
        if (preview.data === null && !preview.isLoading) {
          loadPreview();
        }
      },
      setIncludeSurcharge(includeSurcharge: boolean): void {
        patchContext({ includeSurcharge });
      },
      setMode(mode: PartialRefundMode): void {
        patchContext({ mode });
      },
      setReason(reason: PartialRefundReason | null): void {
        patchContext({ reason });
      },
      setValue(value: number | null): void {
        patchContext({ value });
      },
      /** Ticks every selectable ticket, or clears the lot once they all are. A blocked order takes none. */
      toggleAll(): void {
        if (store.isOrderBlocked()) {
          return;
        }
        select(store.isEverySelectableSelected() ? new Set<number>() : new Set(store.selectableOrderItemIds()));
      },
      /**
       * One ticket line at a time, the way the cancellation page's ticket card offers it: every selectable
       * unit of the line goes in, or every one of them comes out once they all are. Units the engine
       * will not refund are left alone either way.
       */
      toggleGroup(summary: TicketSummary): void {
        const context = store.context();
        const groupIds = summary.cancellableItems.filter(item => isItemSelectable(item, context)).flatMap(item => item.orderItemIds);
        if (groupIds.length === 0) {
          return;
        }
        const next = new Set(context.selectedOrderItemIds);
        const isSelected = groupIds.every(id => next.has(id));
        for (const id of groupIds) {
          if (isSelected) {
            next.delete(id);
          } else {
            next.add(id);
          }
        }
        select(next);
      },
      /** A pack is one ticket to the operator, so its order items go in and out together. */
      toggleItem(item: CancellableItem): void {
        const context = store.context();
        if (!isItemSelectable(item, context)) {
          return;
        }
        const next = new Set(context.selectedOrderItemIds);
        const isSelected = item.orderItemIds.every(id => next.has(id));
        for (const id of item.orderItemIds) {
          if (isSelected) {
            next.delete(id);
          } else {
            next.add(id);
          }
        }
        select(next);
      },
      /** Arriving on `submitting` is what sends the job, so the step only shows that it is on its way. */
      transition(intent: OrderPartialRefundIntent): void {
        const fromStepId = store.currentStepId();
        baseTransition(intent);
        const toStepId = store.currentStepId();
        if (toStepId !== fromStepId && toStepId === 'submitting') {
          submit();
        }
      },
    };
  }),
  withHooks({
    onInit(store): void {
      const data = inject<OrderPartialRefundModalData | null>(IGNT_DIALOG_DATA, { optional: true });
      if (data !== null) {
        patchState(store, {
          context: { ...store.context(), orderId: data.orderId, partnerId: data.partnerId, ticketsSummaries: data.ticketsSummaries },
        });
      }
      store.initNavigation();
      store.loadStatus();
    },
  }),
);
