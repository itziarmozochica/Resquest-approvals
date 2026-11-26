import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';

import { IgntOptionTileComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import type { CheckoutFlowType } from '../../models/checkout.model';
import { CheckoutStore } from '../../store/checkout.store';

interface FlowTile {
  descriptionKey: string;
  iconName: string;
  testId: string;
  titleKey: string;
  type: CheckoutFlowType;
}

const FLOW_TILES: Record<CheckoutFlowType, Omit<FlowTile, 'type'>> = {
  customAmount: {
    descriptionKey: 'checkout.options.customAmountDescription',
    iconName: 'pen-to-square',
    testId: 'checkout-custom-amount-tile',
    titleKey: 'checkout.options.customAmount',
  },
  customSplit: {
    descriptionKey: 'checkout.options.payByItemDescription',
    iconName: 'rectangle-list',
    testId: 'checkout-pay-by-item-tile',
    titleKey: 'checkout.options.payByItem',
  },
  full: {
    descriptionKey: 'checkout.options.payInFullDescription',
    iconName: 'circle-dollar',
    testId: 'checkout-pay-in-full-tile',
    titleKey: 'checkout.options.payInFull',
  },
  splitEqually: {
    descriptionKey: 'checkout.options.splitEquallyDescription',
    iconName: 'scale-balanced',
    testId: 'checkout-split-equally-tile',
    titleKey: 'checkout.options.splitEqually',
  },
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntOptionTileComponent, TranslateModule],
  selector: 'app-flow-selection-step',
  standalone: true,
  styleUrl: './flow-selection-step.component.scss',
  templateUrl: './flow-selection-step.component.html',
})
export class FlowSelectionStepComponent {
  protected readonly store = inject(CheckoutStore);
  protected readonly selected: Signal<CheckoutFlowType | null> = computed(() => this.store.context().flowType);
  protected readonly tiles: Signal<FlowTile[]> = computed(() =>
    this.store.context().availableFlowTypes.map(type => ({ type, ...FLOW_TILES[type] })),
  );

  protected select(flowType: CheckoutFlowType): void {
    this.store.selectFlowType(flowType);
  }
}
