import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { OrderActionEvent } from '@fz-original/app/shared/models/order/order-action.model';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { OrderCommonModule } from '../../../../shared/components/order/order-common.module';
import { CartSession } from '../../../../shared/models/cart/cart-session.model';
import { Cart } from '../../../../shared/models/cart/cart.model';
import { Order } from '../../../../shared/models/order/order.model';
import { ReservationStatus } from '../../../reservation/models/reservation-status.enum';
import { ValidationLoadingSpinnerComponent } from '../validation-loading-spinner/validation-loading-spinner.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, OrderCommonModule, TranslateModule, ValidationLoadingSpinnerComponent],
  selector: 'app-validation-summary-order-detail',
  standalone: true,
  styleUrl: './validation-summary-order-detail.component.scss',
  templateUrl: './validation-summary-order-detail.component.html',
})
export class ValidationSummaryOrderDetailComponent {
  readonly cartSessionsForOrder = input.required<CartSession[]>();
  readonly order = input.required<Order>();
  readonly loadingDetail = input(false);
  readonly groupedOrders = input<Order[]>([]);
  readonly groupedOrdersLoading = input(false);
  readonly searchedQRCode = input('');
  readonly searchedTicketId = input(0);
  readonly separateHeaderCard = input(false);
  readonly showBackButton = input(false);
  readonly depositCart = input<Cart | null>(null);
  readonly showDepositRefundButton = input(false);
  readonly depositReservationStatus = input<ReservationStatus | null>(null);
  readonly onDepositRefund = input<(() => Observable<boolean>) | null>(null);

  readonly backToList = output<void>();
  readonly orderAction = output<OrderActionEvent>();

  protected onBackToListClick(): void {
    this.backToList.emit();
  }

  protected onOrderAction(event: OrderActionEvent): void {
    this.orderAction.emit(event);
  }
}
