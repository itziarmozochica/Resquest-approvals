import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Observable } from 'rxjs';

import { OrderCommonModule } from '../../../../shared/components/order/order-common.module';
import { CartSession } from '../../../../shared/models/cart/cart-session.model';
import { Cart } from '../../../../shared/models/cart/cart.model';
import { OrderActionEvent } from '../../../../shared/models/order/order-action.model';
import { Order } from '../../../../shared/models/order/order.model';
import { ReservationStatus } from '../../../reservation/models/reservation-status.enum';
import { resolveGroupedOrdersForDisplay, resolvePrimaryOrdersForDisplay } from '../../utils/resolve-grouped-orders-for-display.util';
import { ValidationEmptyFiltersPlaceholderComponent } from '../validation-empty-filters-placeholder/validation-empty-filters-placeholder.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OrderCommonModule, ValidationEmptyFiltersPlaceholderComponent],
  selector: 'app-validation-legacy-orders-list',
  standalone: true,
  styleUrl: './validation-legacy-orders-list.component.scss',
  templateUrl: './validation-legacy-orders-list.component.html',
})
export class ValidationLegacyOrdersListComponent {
  readonly cartSessions = input.required<Map<number | undefined, CartSession[]>>();
  readonly depositCarts = input.required<Map<number, Cart>>();
  readonly depositRefundFns = input.required<Map<number, () => Observable<boolean>>>();
  readonly groupedOrders = input<Order[]>([]);
  readonly groupedOrdersLoading = input(false);
  readonly orders = input.required<Order[]>();
  readonly reservationStatusLookup = input<(order: Order) => ReservationStatus | undefined>();

  readonly searchedQRCode = input('');
  readonly searchedTicketId = input(0);
  readonly separateHeaderCard = input(false);
  readonly showDepositRefundButton = input(false);

  readonly openHowToValidate = output<void>();
  readonly orderAction = output<OrderActionEvent>();

  protected readonly displayedOrders = computed(() => resolvePrimaryOrdersForDisplay(this.orders()));
  protected readonly groupedOrdersByOrderId = computed(() => {
    const fetchedGroupedOrders = this.groupedOrders();
    const searchResultOrders = this.orders();
    return new Map(
      this.displayedOrders()
        .filter((order): order is Order & { id: number } => order.id !== undefined)
        .map(order => [order.id, resolveGroupedOrdersForDisplay(order, searchResultOrders, fetchedGroupedOrders)]),
    );
  });

  protected onOpenHowToValidate(): void {
    this.openHowToValidate.emit();
  }

  protected onOrderAction(event: OrderActionEvent): void {
    this.orderAction.emit(event);
  }

  protected reservationStatusFor(order: Order): ReservationStatus | undefined {
    const lookup = this.reservationStatusLookup();
    return lookup ? lookup(order) : undefined;
  }
}
