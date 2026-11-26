import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
  signal,
  ViewChild,
} from '@angular/core';

import { CashChangeCalculatorComponent } from '@fz-original/app/shared/components/cash-change-calculator/cash-change-calculator.component';
import { FzTrackingService, type TrackingEvent } from '@fz/fz-tracking/src/public-api';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { Cart } from '../../../../../shared/models/cart/cart.model';
import {
  posCheckoutCashCalcCloseModal,
  type PosCheckoutCashCalcCloseModalAction,
} from '../../../one-stop-shop/tracking/events/pos-checkout-cash-calc-close-modal.event';

@Component({
  selector: 'app-cash-change-calculator-modal',
  standalone: false,
  templateUrl: './cash-change-calculator-modal.component.html',
  styleUrls: ['./cash-change-calculator-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashChangeCalculatorModalComponent {
  protected cashCalculatorCashReceived = signal<number | undefined>(undefined);
  #isCashCalculatorValueSet = computed(() => this.cashCalculatorCashReceived() != null && !Number.isNaN(this.cashCalculatorCashReceived()));

  readonly #fzTracking = inject(FzTrackingService);
  #modal = inject(NgbActiveModal);
  @Input() set cashModalMandatory(value: boolean) {
    this.cashModalMandatoryInternal.set(value);
  }
  @Input() cart!: Cart;
  @Input() trackViewEvent?: TrackingEvent;
  @ViewChild(CashChangeCalculatorComponent) cashChangeCalculatorRef!: CashChangeCalculatorComponent;
  cashModalMandatoryInternal = signal(false);

  @Output() cashReceived = new EventEmitter<{ amount: number }>();
  protected showConfirmPaymentButton = computed(() => {
    return this.cashModalMandatoryInternal() || this.#isCashCalculatorValueSet();
  });

  cancel(): void {
    this.#trackCloseModal('cancel');
    this.#modal.dismiss();
  }

  protected close(): void {
    if (this.showConfirmPaymentButton() && this.cashChangeCalculatorRef.hasError()) {
      return;
    }

    const action: PosCheckoutCashCalcCloseModalAction = this.showConfirmPaymentButton() ? 'continue' : 'skip';
    this.#trackCloseModal(action);
    this.cashReceived.emit({ amount: this.cashCalculatorCashReceived()! });
    this.#modal.close(this.cashCalculatorCashReceived);
  }

  protected isConfirmPaymentButtonDisabled(): boolean {
    return !this.#isCashCalculatorValueSet() || this.cashChangeCalculatorRef.hasError();
  }

  protected onCashReceived(cash: number): void {
    this.cashCalculatorCashReceived.set(cash);
  }

  @HostListener('keydown.enter', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    event.preventDefault();
    this.close();
  }

  #trackCloseModal(action: PosCheckoutCashCalcCloseModalAction): void {
    const cartTotal = this.cart?.total;
    if (cartTotal == null) {
      return;
    }

    const toBePaid = cartTotal.amount;
    const received = this.cashCalculatorCashReceived() ?? null;
    const change = received != null ? received - toBePaid : null;

    this.#fzTracking.track(
      posCheckoutCashCalcCloseModal({
        action,
        change,
        received,
        toBePaid,
      }),
    );
  }
}
