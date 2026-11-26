import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { resolveOverlayPaneAppendTo } from '@fz-original/app/shared/utils/overlay-pane-ng-select.util';
import { isLogoOnlyPaymentMethod } from '@fz-original/app/shared/utils/payment-method-display/payment-method-display.util';
import { IgntOptionTileComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule } from '@ngx-translate/core';

import { PaymentSummaryPanelComponent } from '../../components/payment-summary-panel/payment-summary-panel.component';
import { SplitSummaryPanelComponent } from '../../components/split-summary-panel/split-summary-panel.component';
import type { CheckoutPaymentLinkOption } from '../../models/checkout-payment-link.model';
import type { CheckoutPaymentMethodDescriptor } from '../../models/checkout.model';
import { CheckoutStore } from '../../store/checkout.store';
import {
  formatPaymentLinkInstant,
  resolvePaymentLinkDurationErrorKey,
  resolvePaymentLinkExpiresAt,
} from '../../utils/checkout-payment-link.util';
import {
  checkoutMethodRequiresTerminal,
  getCheckoutPaymentMethodLabel,
  getCheckoutPaymentMethodLabelSuffixKey,
  isDelegatedCheckoutMethod,
} from '../../utils/checkout-payment.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntOptionTileComponent,
    NgSelectModule,
    PaymentSummaryPanelComponent,
    SplitSummaryPanelComponent,
    TranslateModule,
  ],
  selector: 'app-method-selection-step',
  standalone: true,
  styleUrl: './method-selection-step.component.scss',
  templateUrl: './method-selection-step.component.html',
})
export class MethodSelectionStepComponent implements OnInit {
  protected readonly store = inject(CheckoutStore);

  readonly #elementRef = inject(ElementRef<HTMLElement>);

  protected readonly paymentMethodTiles: Signal<{ hideTitle: boolean; method: CheckoutPaymentMethodDescriptor }[]> = computed(() =>
    this.store.context().availableMethods.map(method => ({ hideTitle: isLogoOnlyPaymentMethod(method.type), method })),
  );

  protected readonly paymentMethodLabel: Signal<string | null> = computed(() => getCheckoutPaymentMethodLabel(this.store.context()));

  protected readonly paymentMethodLabelSuffixKey: Signal<string | null> = computed(() =>
    getCheckoutPaymentMethodLabelSuffixKey(this.store.context()),
  );

  /** A payment link is a pay-in-full alternative only: split flows never offer it. */
  protected readonly paymentLink: Signal<CheckoutPaymentLinkOption | null> = computed(() =>
    this.store.isSplitFlow() ? null : this.store.context().paymentLink,
  );

  protected readonly isPaymentLinkSelected: Signal<boolean> = computed(() => this.store.context().paymentLinkSelected);

  protected readonly paymentLinkErrorKey: Signal<string | null> = computed(() => {
    const { paymentLinkDuration, paymentLinkErrorKey } = this.store.context();
    const option = this.paymentLink();
    if (paymentLinkErrorKey !== null || option === null) {
      return paymentLinkErrorKey;
    }
    return resolvePaymentLinkDurationErrorKey(paymentLinkDuration, option, new Date());
  });

  protected readonly paymentLinkExpiry: Signal<{ expiresAt: string; latest: string } | null> = computed(() => {
    const { locale, paymentLinkDuration } = this.store.context();
    const option = this.paymentLink();
    const expiresAt = resolvePaymentLinkExpiresAt(paymentLinkDuration, new Date());
    if (option === null) {
      return null;
    }
    return {
      expiresAt: expiresAt === null ? '' : formatPaymentLinkInstant(expiresAt, option.timezone, locale),
      latest: formatPaymentLinkInstant(option.latestExpiresAt, option.timezone, locale),
    };
  });

  // Delegated methods (cash, external card…) never reach a terminal, so the devices are hidden (B2BO-9031).
  protected readonly isTerminalHidden: Signal<boolean> = computed(
    () => isDelegatedCheckoutMethod(this.store.context()) || this.store.context().tapToPay === true,
  );

  protected readonly terminalDisabled: Signal<boolean> = computed(() => !checkoutMethodRequiresTerminal(this.store.context()));

  protected readonly terminalItems: Signal<{ id: string; label: string }[]> = computed(() =>
    this.store.context().availableTerminals.map(terminal => ({ id: terminal.id, label: terminal.label ?? terminal.id })),
  );

  protected readonly terminalPanelAppendTo: WritableSignal<string> = signal<string>('');

  ngOnInit(): void {
    this.terminalPanelAppendTo.set(resolveOverlayPaneAppendTo(this.#elementRef.nativeElement));
  }

  protected isSelected(method: CheckoutPaymentMethodDescriptor): boolean {
    const { selectedMethod, selectedMethodDelegated } = this.store.context();
    return selectedMethod === method.type && selectedMethodDelegated === method.delegated;
  }

  protected onPaymentLinkDurationChange(duration: string): void {
    this.store.setPaymentLinkDuration(duration);
  }

  protected onOpenCalculator(): void {
    this.store.transition('openCalculator');
  }

  protected onPayRemainingChange(payRemaining: boolean): void {
    this.store.togglePayRemaining(payRemaining);
  }

  protected onViewHistory(): void {
    this.store.transition('viewHistory');
  }

  protected select(method: CheckoutPaymentMethodDescriptor): void {
    this.store.selectPaymentMethod(method.type, method.delegated);
  }

  protected selectPaymentLink(): void {
    this.store.selectPaymentLink();
  }

  protected selectTerminal(terminalId: string): void {
    this.store.selectPaymentTerminal(terminalId);
  }
}
