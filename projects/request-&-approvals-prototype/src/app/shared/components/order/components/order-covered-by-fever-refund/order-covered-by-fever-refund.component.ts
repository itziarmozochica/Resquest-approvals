import { ChangeDetectionStrategy, Component, computed, input, type InputSignal, type Signal } from '@angular/core';

import { Money } from '@fz-original/app/shared/models/money.model';
import type { OrderUserCancellationRecord } from '@fz-original/app/shared/models/order/order-cancellation-record.model';
import type { Order } from '@fz-original/app/shared/models/order/order.model';
import { ReimbursementType } from '@fz-original/app/shared/models/order/reimbursement-type.enum';
import { OrderPaymentMethodLabelPipe } from '@fz-original/app/shared/pipes/order-payment-method-label/order-payment-method-label.pipe';
import { PipesModule } from '@fz-original/app/shared/pipes/pipes.module';
import { isCoveredByFeverOrderStatus, isPremiumRefundPolicyRecord } from '@fz-original/app/shared/utils/order-status.util';
import { IgntAlertComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, OrderPaymentMethodLabelPipe, PipesModule, TranslateModule],
  selector: 'app-order-covered-by-fever-refund',
  styleUrl: './order-covered-by-fever-refund.component.scss',
  templateUrl: './order-covered-by-fever-refund.component.html',
})
export class OrderCoveredByFeverRefundComponent {
  readonly isSuperuser: InputSignal<boolean> = input<boolean>(false);
  readonly locale: InputSignal<string | null> = input<string | null>(null);
  readonly order: InputSignal<Order | null> = input<Order | null>(null);

  protected readonly ReimbursementType = ReimbursementType;

  protected readonly isVisible: Signal<boolean> = computed(() => isCoveredByFeverOrderStatus(this.order()?.status));

  protected readonly premiumRefundPolicyRecords: Signal<OrderUserCancellationRecord[]> = computed(() =>
    (this.order()?.userCancellationRecords ?? []).filter((record: OrderUserCancellationRecord) => isPremiumRefundPolicyRecord(record)),
  );

  protected readonly latestRecord: Signal<OrderUserCancellationRecord | null> = computed(() =>
    this.premiumRefundPolicyRecords().reduce<OrderUserCancellationRecord | null>(
      (latest: OrderUserCancellationRecord | null, record: OrderUserCancellationRecord) =>
        latest === null || record.createdAt > latest.createdAt ? record : latest,
      null,
    ),
  );

  protected readonly refundedAmount: Signal<string | null> = computed(() => {
    const amounts = this.premiumRefundPolicyRecords()
      .map((record: OrderUserCancellationRecord) => this.#getCoveredAmount(record))
      .filter((amount: Money | null): amount is Money => amount != null);
    return this.#sum(amounts)?.toString(this.locale() ?? undefined) ?? null;
  });

  protected readonly refundedAt: Signal<string | null> = computed(() => {
    const record = this.latestRecord();
    return record?.refundedAt ?? record?.createdAt ?? null;
  });

  #getCoveredAmount(record: OrderUserCancellationRecord): Money | null {
    if (record.reimbursementType !== ReimbursementType.Voucher) {
      return record.refundedAmount;
    }
    const amountsByCouponCode = new Map<string, Money>();
    for (const ticket of record.cancelledTickets) {
      if (ticket.cancellationCouponCode != null && ticket.cancellationCouponAmount != null) {
        amountsByCouponCode.set(ticket.cancellationCouponCode, ticket.cancellationCouponAmount);
      }
    }
    return this.#sum([...amountsByCouponCode.values()]);
  }

  #sum(amounts: Money[]): Money | null {
    if (amounts.length === 0) {
      return null;
    }
    return new Money(
      amounts.reduce((total: number, amount: Money) => total + amount.amount, 0),
      amounts[0].currency,
    );
  }
}
