import { CurrencyPipe, NgIf, NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';

import { CashDrawerOpenMessage } from '@fz-original/app/shared/services/webview-messenger/models/cash-drawer-open-message';
import { WebviewMessengerService } from '@fz-original/app/shared/services/webview-messenger/webview-messenger.service';
import { IgntAlertComponent } from '@ignite/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AutoformatNumericInputModule } from '../../directives/autoformat-numeric-input/autoformat-numeric-input.module';
import { InputMobileBehaviorModule } from '../../directives/input-mobile-behavior/input-mobile-behavior.module';
import { IconsModule } from '../../icons/icons.module';
import { Cart } from '../../models/cart/cart.model';
import { Money } from '../../models/money.model';
import { CashChangeCalculatorEnoughMoneyValidatorDirective } from './cash-change-calculator-enough-money.validator';

@Component({
  selector: 'app-cash-change-calculator',
  templateUrl: './cash-change-calculator.component.html',
  styleUrls: ['./cash-change-calculator.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAlertComponent,
    NgTemplateOutlet,
    NgIf,
    FormsModule,
    NgTemplateOutlet,
    CurrencyPipe,
    TranslateModule,
    IconsModule,
    AutoformatNumericInputModule,
    InputMobileBehaviorModule,
    CashChangeCalculatorEnoughMoneyValidatorDirective,
  ],
})
export class CashChangeCalculatorComponent implements AfterViewInit {
  #cartInternal = signal<Cart | null>(null);
  #cashReceivedInput = signal(0);
  #translate = inject(TranslateService);
  #webviewMessenger = inject(WebviewMessengerService);

  @Input() set cart(value: Cart | null) {
    this.#cartInternal.set(value);
  }
  protected cartTotal = computed(() => {
    const cart = this.#cartInternal();
    return cart?.total != null ? new Money(cart.total.amount, cart.total.currency) : null;
  });
  @Output() cashReceived = new EventEmitter<number>();
  @ViewChild(NgModel) cashReceivedInputRef: NgModel | undefined;
  @Input() cashReceivedRequired = false;

  protected cashReturn = computed(() => {
    const cartTotal = this.cartTotal();
    const cashReceivedInput = this.#cashReceivedInput();

    if (cartTotal == null) {
      return null;
    }

    const amount = cashReceivedInput > 0 ? cashReceivedInput - cartTotal.amount : 0;
    const currency = cartTotal?.currency;
    return new Money(amount, currency);
  });
  protected cashReturnPositive = computed(() => {
    return this.cashReturn() && this.cashReturn()!.amount > 0;
  });
  protected locale: string = this.#translate.currentLang;
  @Input() showCartTotalAmount = false;

  /**
   * Indicates whether the calculator has errors or not
   * @returns boolean
   */
  hasError(): boolean {
    return !!this.cashReceivedInputRef?.control.errors;
  }

  ngAfterViewInit() {
    this.#webviewMessenger.sendWebViewMessage(new CashDrawerOpenMessage());
  }

  protected updateInput(value: number): void {
    this.#cashReceivedInput.set(value);
    this.cashReceived.emit(this.#cashReceivedInput());
  }
}
