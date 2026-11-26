import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, LOCALE_ID, type Signal } from '@angular/core';

import type { CancellableItem, TicketSummary } from '@fz-original/app/modules/cancellation/models/ticket-summary.model';
import { IgntAlertComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntTagComponent, type TagSentiment } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { TicketRefundStatus, type TicketRefundState } from '../../../models/order-partial-refund-context.model';
import { orderPartialRefundRejectionLabelKey } from '../../../models/order-partial-refund-rejection.model';
import { OrderPartialRefundStore } from '../../../store/order-partial-refund.store';

interface TicketItemView {
  readonly details: string;
  readonly isSelectable: boolean;
  readonly isSelected: boolean;
  readonly item: CancellableItem;
  readonly label: string;
  readonly status: { readonly kind: TicketRefundStatus; readonly label: string; readonly sentiment: TagSentiment } | null;
}

interface TicketGroupView {
  /** Every selectable unit of the line is ticked, so the line's own box reads as checked. */
  readonly isAllSelected: boolean;
  /** The line has at least one unit the engine would refund; otherwise its box has nothing to do. */
  readonly isSelectable: boolean;
  readonly items: readonly TicketItemView[];
  readonly summary: TicketSummary;
}

/**
 * The same tickets the cancellation page lists, drawn from the same `TicketSummary` data, with one
 * box per ticket. A ticket the engine has already paid out in full is shown as such and cannot be
 * ticked, which is the ticket's "cannot be refunded twice".
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, IgntCheckboxComponent, IgntIconComponent, IgntTagComponent, TranslateModule],
  selector: 'app-order-partial-refund-select-tickets-step',
  styleUrl: './select-tickets-step.component.scss',
  templateUrl: './select-tickets-step.component.html',
})
export class SelectTicketsStepComponent {
  protected readonly store = inject(OrderPartialRefundStore);

  readonly #currency = new CurrencyPipe(inject(LOCALE_ID));
  readonly #statusLabelKeys: Record<TicketRefundStatus, string> = {
    [TicketRefundStatus.FullyRefunded]: 'orders.partialRefund.selectTickets.status.fullyRefunded',
    [TicketRefundStatus.NotRefundable]: 'orders.partialRefund.selectTickets.status.notRefundable',
    [TicketRefundStatus.PartiallyRefunded]: 'orders.partialRefund.selectTickets.status.partiallyRefunded',
  };
  readonly #translateService = inject(TranslateService);

  /** The engine's codes as the sentences the review step shows for them, joined: the alert takes one description. */
  protected readonly blockerReasons: Signal<string> = computed(() =>
    this.store
      .context()
      .orderBlockers.map(code => this.#translateService.instant(orderPartialRefundRejectionLabelKey(code)))
      .join(' '),
  );

  protected readonly groups: Signal<readonly TicketGroupView[]> = computed(() =>
    this.store.context().ticketsSummaries.map(summary => {
      const items = summary.cancellableItems.map(item => this.#itemView(item));
      const selectable = items.filter(view => view.isSelectable);
      return {
        isAllSelected: selectable.length > 0 && selectable.every(view => view.isSelected),
        isSelectable: selectable.length > 0,
        items,
        summary,
      };
    }),
  );

  protected readonly hasSelectableTickets: Signal<boolean> = computed(() => this.store.selectableOrderItemIds().size > 0);

  protected readonly isProbing: Signal<boolean> = computed(() => this.store.context().status.isLoading);

  /** The probe failed, or answered without naming the tickets: either way no history is shown and nothing is narrowed. */
  protected readonly statusUnavailable: Signal<boolean> = computed(() => {
    const { status } = this.store.context();
    return status.error !== null || (status.data !== null && !this.store.isStatusKnown());
  });

  protected onGroupChange(summary: TicketSummary): void {
    this.store.toggleGroup(summary);
  }

  protected onItemChange(item: CancellableItem): void {
    this.store.toggleItem(item);
  }

  protected onSelectAllChange(): void {
    this.store.toggleAll();
  }

  #itemView(item: CancellableItem): TicketItemView {
    const state = this.store.ticketRefundStates().get(item.referenceId);
    const name = [item.nominativeFirstName, item.nominativeLastName].filter(part => part != null && part.length > 0).join(' ');
    return {
      details: [item.seat?.label, name].filter((part): part is string => part != null && part.length > 0).join(' · '),
      isSelectable: state?.isSelectable ?? false,
      isSelected: item.orderItemIds.length > 0 && item.orderItemIds.every(id => this.store.context().selectedOrderItemIds.has(id)),
      item,
      label: item.code?.code ?? item.referenceId,
      status: state === undefined ? null : this.#status(state),
    };
  }

  /** The store decides the ticket's fate; this only puts it into words. */
  #status({ remaining, status }: TicketRefundState): TicketItemView['status'] {
    if (status === null) {
      return null;
    }
    const isPartiallyRefunded = status === TicketRefundStatus.PartiallyRefunded;
    const params =
      isPartiallyRefunded && remaining !== null
        ? { remaining: this.#currency.transform(remaining.amount, remaining.currency, 'symbol-narrow') ?? String(remaining.amount) }
        : undefined;
    return {
      kind: status,
      label: this.#translateService.instant(this.#statusLabelKeys[status], params),
      sentiment: isPartiallyRefunded ? 'warning' : 'disable',
    };
  }
}
