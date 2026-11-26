import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule } from '@ngx-translate/core';

import { PaymentSummaryPanelComponent } from '../../components/payment-summary-panel/payment-summary-panel.component';
import { SplitSummaryPanelComponent } from '../../components/split-summary-panel/split-summary-panel.component';
import { CheckoutStore } from '../../store/checkout.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    IgntCheckboxComponent,
    IgntIconComponent,
    PaymentSummaryPanelComponent,
    SplitSummaryPanelComponent,
    TranslateModule,
  ],
  selector: 'app-item-selection-step',
  standalone: true,
  styleUrl: './item-selection-step.component.scss',
  templateUrl: './item-selection-step.component.html',
})
export class ItemSelectionStepComponent {
  protected readonly store = inject(CheckoutStore);

  private readonly selectedIdSet: Signal<Set<string>> = computed(() => new Set(this.store.context().selectedItemIds));

  constructor() {
    this.store.preselectSingleCartItem();
  }

  protected isSelected(itemId: string): boolean {
    return this.selectedIdSet().has(itemId);
  }

  protected toggleItem(itemId: string): void {
    this.store.toggleCartItem(itemId);
  }

  protected onPayRemainingChange(payRemaining: boolean): void {
    this.store.togglePayRemaining(payRemaining);
  }

  protected onViewHistory(): void {
    this.store.transition('viewHistory');
  }
}
