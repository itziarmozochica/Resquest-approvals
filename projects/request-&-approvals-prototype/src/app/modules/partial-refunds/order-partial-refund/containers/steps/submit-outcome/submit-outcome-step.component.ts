import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import type { OrderPartialRefundStepId } from '../../../models/order-partial-refund-context.model';
import { OrderPartialRefundStore } from '../../../store/order-partial-refund.store';

/** Shows where the job is for `submitting`, `queued` and `submitFailed`; the store sends it and moves the flow on. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, TranslateModule],
  selector: 'app-order-partial-refund-submit-outcome-step',
  styleUrl: './submit-outcome-step.component.scss',
  templateUrl: './submit-outcome-step.component.html',
})
export class SubmitOutcomeStepComponent {
  readonly #store = inject(OrderPartialRefundStore);

  /** The job id is the only receipt the engine hands back, so it is shown for support to trace. */
  protected readonly jobId: Signal<string | null> = computed(() => this.#store.job().data?.jobId ?? null);
  /** A gateway error or a dropped connection can come after fever2 queued the job, so nothing can be promised either way. */
  protected readonly isOutcomeUnknown: Signal<boolean> = computed(() => {
    const { error } = this.#store.job();
    const cause: unknown = typeof error === 'object' && error !== null && 'error' in error ? error.error : error;
    return cause instanceof HttpErrorResponse && (cause.status === 0 || cause.status >= HttpStatusCode.InternalServerError);
  });
  protected readonly stepId: Signal<OrderPartialRefundStepId | null> = this.#store.currentStepId;
}
