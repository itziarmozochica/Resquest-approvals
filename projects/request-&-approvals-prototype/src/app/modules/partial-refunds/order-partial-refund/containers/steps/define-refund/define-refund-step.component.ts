import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PartialRefundDefinitionFormComponent } from '../../../../components/partial-refund-definition-form/partial-refund-definition-form.component';
import { RefundSummaryPanelComponent } from '../../../../components/refund-summary-panel/refund-summary-panel.component';
import { OrderPartialRefundStore } from '../../../store/order-partial-refund.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PartialRefundDefinitionFormComponent, RefundSummaryPanelComponent],
  selector: 'app-order-partial-refund-define-refund-step',
  styleUrl: './define-refund-step.component.scss',
  templateUrl: './define-refund-step.component.html',
})
export class DefineRefundStepComponent {
  protected readonly store = inject(OrderPartialRefundStore);

  constructor() {
    this.store.ensurePreview();
  }

  protected onIncludeSurchargeChange(includeSurcharge: boolean): void {
    this.store.setIncludeSurcharge(includeSurcharge);
    this.store.loadPreview();
  }

  protected onValueChange(value: number | null): void {
    this.store.setValue(value);
    this.store.loadPreview();
  }
}
