import { afterRenderEffect, ChangeDetectionStrategy, Component, effect, ElementRef, inject, ViewEncapsulation } from '@angular/core';

import { MultiStepModalShellComponent } from '@fz-original/app/shared/multi-step-modal/containers/multi-step-modal-shell/multi-step-modal-shell.component';
import {
  MULTI_STEP_MODAL_CONFIG,
  MULTI_STEP_MODAL_CONTROLLER,
} from '@fz-original/app/shared/multi-step-modal/tokens/multi-step-modal.token';

import { orderPartialRefundConfig } from '../../config/order-partial-refund.config';
import { OrderPartialRefundStore } from '../../store/order-partial-refund.store';

/** The thin host the engine asks for: config, store, and the store again as the controller. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The width lives on the dialog, which is an ancestor: the rule has to escape this component.
  encapsulation: ViewEncapsulation.None,
  imports: [MultiStepModalShellComponent],
  providers: [
    { provide: MULTI_STEP_MODAL_CONFIG, useValue: orderPartialRefundConfig },
    OrderPartialRefundStore,
    { provide: MULTI_STEP_MODAL_CONTROLLER, useExisting: OrderPartialRefundStore },
  ],
  selector: 'app-order-partial-refund-shell',
  styleUrl: './order-partial-refund-shell.component.scss',
  templateUrl: './order-partial-refund-shell.component.html',
})
export class OrderPartialRefundShellComponent {
  readonly #hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #store = inject(OrderPartialRefundStore);

  constructor() {
    effect(() => {
      this.#syncDialogClasses(this.#store.currentStep()?.chrome.compactLayout === true);
    });

    afterRenderEffect(() => {
      this.#store.currentStepId();
      this.#hostElement.nativeElement.closest('.ignt-dialog-modal-shell')?.scrollTo({ top: 0 });
    });
  }

  #syncDialogClasses(compact: boolean): void {
    const shell = this.#hostElement.nativeElement.closest('.ignt-dialog-modal-shell');
    shell?.classList.add('order-partial-refund-dialog');
    shell?.classList.toggle('order-partial-refund-dialog--compact', compact);
  }
}
