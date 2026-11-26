import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { TranslateService } from '@ngx-translate/core';

import { ClickOrderEvent } from '../../../../../core/tracking/core/events/click-order';
import { TrackingService } from '../../../../../core/tracking/tracking.service';
import { OrderSummary } from '../../../../services/orders-summary/models/order-summary.model';
import { OrdersListSortBy, OrdersListSortDirection } from '../../../../services/orders-summary/models/orders-list-sort.model';
import { isNonZeroNumber } from '../../../../utils/number.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TitleCasePipe],
  selector: 'app-order-table',
  standalone: false,
  styleUrl: './order-table.component.scss',
  templateUrl: './order-table.component.html',
})
export class OrderTableComponent {
  readonly hiddenChannel = input<boolean>(false);
  readonly enableTicketsSeatsAndTicketHoldersSort = input<boolean>(false);
  readonly orders = input<OrderSummary[]>([]);
  readonly showPartnerTotal = input<boolean>(false);
  readonly showSeatsColumn = input<boolean>(false);
  readonly sortable = input<boolean>(false);
  readonly sortBy = input<OrdersListSortBy | null>(null);
  readonly sortDirection = input<OrdersListSortDirection | null>(null);

  readonly seatCellClick = output<OrderSummary>();
  readonly sortColumnClick = output<OrdersListSortBy>();
  readonly ticketCellClick = output<OrderSummary>();

  readonly #trackingService = inject(TrackingService);
  readonly #translate = inject(TranslateService);

  readonly locale: string = this.#translate.currentLang;

  onSeatCellClick(order: OrderSummary, event: Event): void {
    event.stopPropagation();
    this.seatCellClick.emit(order);
  }

  onTicketCellClick(order: OrderSummary, event: Event): void {
    event.stopPropagation();
    this.ticketCellClick.emit(order);
  }

  sendClickOrderMixpanelEvent(orderId: string): void {
    this.#trackingService.track(new ClickOrderEvent({ order_id: Number(orderId) }));
  }

  sortHeaderClick(event: Event, column: OrdersListSortBy): void {
    event.stopPropagation();
    if (!this.isSortableColumn(column)) {
      return;
    }
    this.sortColumnClick.emit(column);
  }

  ariaSortFor(column: OrdersListSortBy): 'ascending' | 'descending' | 'none' | null {
    if (!this.isSortableColumn(column)) {
      return null;
    }
    if (this.sortBy() !== column) {
      return 'none';
    }
    if (this.sortDirection() === 'asc') {
      return 'ascending';
    }
    if (this.sortDirection() === 'desc') {
      return 'descending';
    }
    return 'none';
  }

  isSortIndicatorActive(column: OrdersListSortBy): boolean {
    const dir = this.sortDirection();
    return this.sortBy() === column && (dir === 'asc' || dir === 'desc');
  }

  sortIcon(column: OrdersListSortBy): IconProp {
    if (!this.isSortIndicatorActive(column)) {
      return ['far', 'sort-alt'];
    }

    return this.sortDirection() === 'asc' ? ['far', 'sort-amount-up-alt'] : ['far', 'sort-amount-down-alt'];
  }

  isSortableColumn(key: OrdersListSortBy): boolean {
    if (!this.sortable()) {
      return false;
    }
    switch (key) {
      case 'channel':
        return !this.hiddenChannel();
      case 'tickets':
        return this.enableTicketsSeatsAndTicketHoldersSort();
      case 'seats':
        return this.showSeatsColumn() && this.enableTicketsSeatsAndTicketHoldersSort();
      default:
        return true;
    }
  }

  trackOrderBy(_: number, order: OrderSummary): string | OrderSummary {
    return order.orderId ?? order;
  }

  shouldShowOrderLoyaltyPoints(order: OrderSummary): boolean {
    return isNonZeroNumber(order.loyaltyPoints);
  }
}
