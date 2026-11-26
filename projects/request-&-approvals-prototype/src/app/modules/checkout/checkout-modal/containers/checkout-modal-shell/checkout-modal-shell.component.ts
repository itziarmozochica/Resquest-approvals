import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, ViewEncapsulation } from '@angular/core';

import { MultiStepModalShellComponent } from '@fz-original/app/shared/multi-step-modal/containers/multi-step-modal-shell/multi-step-modal-shell.component';
import {
  MULTI_STEP_MODAL_CONFIG,
  MULTI_STEP_MODAL_CONTROLLER,
} from '@fz-original/app/shared/multi-step-modal/tokens/multi-step-modal.token';
import { IGNT_DIALOG_DATA } from '@ignite/common';

import type { CheckoutModalConfig } from '../../config/checkout-flow.shared';
import { resolveCheckoutFlow } from '../../config/checkout-modal-flows';
import type { CheckoutModalData, CheckoutStepId } from '../../models/checkout.model';
import { CheckoutLegOutcomeService } from '../../services/checkout-leg-outcome/checkout-leg-outcome.service';
import { CheckoutStore } from '../../store/checkout.store';
import { checkoutModalTrackingProvider } from '../../tracking/checkout-modal.tracking-provider';

const COMPACT_CALCULATOR_STEP_IDS = new Set<CheckoutStepId>(['calculator', 'cashCapture']);

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [MultiStepModalShellComponent],
  providers: [
    {
      provide: MULTI_STEP_MODAL_CONFIG,
      useFactory: (): CheckoutModalConfig => {
        const data = inject<CheckoutModalData | null>(IGNT_DIALOG_DATA, { optional: true });
        return resolveCheckoutFlow(data).config;
      },
    },
    CheckoutLegOutcomeService,
    CheckoutStore,
    { provide: MULTI_STEP_MODAL_CONTROLLER, useExisting: CheckoutStore },
    ...checkoutModalTrackingProvider(),
  ],
  selector: 'app-checkout-modal-shell',
  standalone: true,
  styleUrl: './checkout-modal-shell.component.scss',
  templateUrl: './checkout-modal-shell.component.html',
})
export class CheckoutModalShellComponent {
  readonly #data = inject<CheckoutModalData | null>(IGNT_DIALOG_DATA, { optional: true });
  readonly #fittedTileCounts = [1, 2, 3];
  readonly #hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #store = inject(CheckoutStore);

  readonly #tileCount = computed<number | null>(() =>
    this.#data?.fitToTiles === true && this.#store.currentStep()?.id === 'flowSelection'
      ? this.#store.context().availableFlowTypes.length
      : null,
  );

  constructor() {
    effect(() => {
      const stepId = this.#store.currentStep()?.id;
      this.#syncDialogClasses(stepId != null && COMPACT_CALCULATOR_STEP_IDS.has(stepId), this.#tileCount());
    });
  }

  #syncDialogClasses(compactCalculator: boolean, tileCount: number | null): void {
    const shell = this.#hostElement.nativeElement.closest('.ignt-dialog-modal-shell');
    shell?.classList.add('checkout-dialog');
    shell?.classList.toggle('checkout-dialog--calculator', compactCalculator);
    this.#fittedTileCounts.forEach(count => shell?.classList.toggle(`checkout-dialog--tiles-${count}`, tileCount === count));
  }
}
