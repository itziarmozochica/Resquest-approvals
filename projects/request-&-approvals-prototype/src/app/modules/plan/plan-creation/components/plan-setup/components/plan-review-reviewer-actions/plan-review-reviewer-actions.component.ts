import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { PlanReviewRequestModel } from '@fz-original/app/shared/models/plan-review/plan-review-request.model';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, TranslateModule],
  selector: 'app-plan-review-reviewer-actions',
  standalone: true,
  styleUrls: ['./plan-review-reviewer-actions.component.scss'],
  templateUrl: './plan-review-reviewer-actions.component.html',
})
export class PlanReviewReviewerActionsComponent {
  canWithdrawSubmission = input<boolean>(false);
  currentUserId = input<number | null>(null);
  hasReviewerPermissions = input<boolean>(false);
  loading = input<boolean>(false);
  reviewStatus = input<PlanReviewRequestModel | null>(null);

  readonly showClaimedByOtherReviewerBanner = computed(() => {
    if (!this.hasReviewerPermissions()) {
      return false;
    }
    const status = this.reviewStatus();
    if (status?.status !== 'claimed') {
      return false;
    }
    const claimedBy = status.reviewerId;
    const currentUserId = this.currentUserId();
    if (claimedBy === null || currentUserId === null) {
      return false;
    }
    return claimedBy !== currentUserId;
  });

  claim = output<void>();
  approve = output<void>();
  reject = output<void>();
  release = output<void>();
  withdraw = output<void>();

  onApprove(): void {
    this.approve.emit();
  }

  onClaim(): void {
    this.claim.emit();
  }

  onReject(): void {
    this.reject.emit();
  }

  onRelease(): void {
    this.release.emit();
  }

  onWithdraw(): void {
    this.withdraw.emit();
  }
}
