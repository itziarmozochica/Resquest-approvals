import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { clickCancelRejectReview } from '@fz-original/app/modules/plan/tracking/events/click-cancel-reject-review.event';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, IgntDialogRef } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

export type RejectPlanReviewModalResult = string[] | null;

export interface RejectPlanReviewModalData {
  planId: number | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IgntButtonComponent, IgntDialogModule, TranslateModule],
  selector: 'app-reject-plan-review-modal',
  standalone: true,
  styleUrls: ['./reject-plan-review-modal.component.scss'],
  templateUrl: './reject-plan-review-modal.component.html',
})
export class RejectPlanReviewModalComponent {
  readonly #dialogRef: IgntDialogRef<RejectPlanReviewModalResult> = inject<IgntDialogRef<RejectPlanReviewModalResult>>(IGNT_DIALOG_REF);
  readonly #data: RejectPlanReviewModalData | null = inject(IGNT_DIALOG_DATA, { optional: true }) as RejectPlanReviewModalData | null;
  readonly #fzTracking = inject(FzTrackingService);

  comment = '';
  loading = false;

  cancel(): void {
    const planId = this.#data?.planId ?? null;
    if (planId !== null) {
      this.#fzTracking.track(clickCancelRejectReview({ plan_id: planId }));
    }
    this.#dialogRef.close(null);
  }

  confirm(): void {
    if (!this.isValid) {
      return;
    }
    this.#dialogRef.close([this.comment.trim()]);
  }

  get isValid(): boolean {
    return this.comment.trim().length > 0;
  }
}
