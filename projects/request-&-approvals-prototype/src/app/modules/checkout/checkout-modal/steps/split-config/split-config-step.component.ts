import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { SplitSummaryPanelComponent } from '../../components/split-summary-panel/split-summary-panel.component';
import { CheckoutStore } from '../../store/checkout.store';
import { maxEqualSplitCount, toCents } from '../../utils/checkout-split.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, IgntButtonComponent, IgntIconComponent, SplitSummaryPanelComponent, TranslateModule],
  selector: 'app-split-config-step',
  standalone: true,
  styleUrl: './split-config-step.component.scss',
  templateUrl: './split-config-step.component.html',
})
export class SplitConfigStepComponent {
  static readonly minSplitCount = 2;
  protected readonly store = inject(CheckoutStore);

  protected readonly splitCount: Signal<number> = computed(() => this.store.context().splitCount);
  protected readonly maxSplitCount: Signal<number> = computed(() =>
    maxEqualSplitCount(toCents(this.store.context().cartTotal?.amount ?? 0)),
  );
  protected readonly canDecrement: Signal<boolean> = computed(() => this.splitCount() > SplitConfigStepComponent.minSplitCount);
  protected readonly canIncrement: Signal<boolean> = computed(() => this.splitCount() < this.maxSplitCount());

  constructor() {
    if (this.store.context().splitCount < SplitConfigStepComponent.minSplitCount) {
      this.store.configureEqualSplits(SplitConfigStepComponent.minSplitCount);
    }
  }

  protected decrement(): void {
    if (this.canDecrement()) {
      this.store.configureEqualSplits(this.splitCount() - 1);
    }
  }

  protected increment(): void {
    if (this.canIncrement()) {
      this.store.configureEqualSplits(this.splitCount() + 1);
    }
  }

  protected onViewHistory(): void {
    this.store.transition('viewHistory');
  }
}
