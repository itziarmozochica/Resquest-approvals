import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';
import { merge } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { ApprovalItemReviewDecision } from '../../services/approvals.service';

export type ApprovalItemDecision = ApprovalItemReviewDecision;

@Component({
  selector: 'app-approval-item-review',
  templateUrl: './approval-item-review.component.html',
  styleUrls: ['./approval-item-review.component.scss'],
  imports: [TranslateModule, IgntIconComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalItemReviewComponent {
  readonly control = input.required<FormControl<ApprovalItemDecision | null>>();
  readonly reviewable = input<boolean>(true);
  // In dense grids the dropdown menu would be clipped by the scroll container, so the decided
  // pill instead reverts straight to pending on click; the reviewer can then re-pick.
  readonly inlineToggle = input<boolean>(false);
  /** True while this item's decision is being persisted; the pill shows it and refuses further clicks. */
  readonly busy = input<boolean>(false);
  readonly allowPending = input<boolean>(true);

  /** Every decision is routed to the container, which persists it. The pill never writes the control. */
  readonly decisionRequested = output<ApprovalItemDecision>();

  readonly menuOpen = signal<boolean>(false);

  readonly #changeDetectorRef = inject(ChangeDetectorRef);

  constructor() {
    // The template reads control().value imperatively, so with OnPush a decision staged from
    // OUTSIDE this component (folder "Approve all", bulk approve of selected items, the reject
    // dialog) would never repaint the pill. Re-check whenever the control's value or
    // enabled/disabled status changes.
    toObservable(this.control)
      .pipe(
        switchMap(control => merge(control.valueChanges, control.statusChanges)),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.#changeDetectorRef.markForCheck());
  }

  isApproved(): boolean {
    return this.control().value === 'APPROVE';
  }

  isRejected(): boolean {
    return this.control().value === 'REJECT';
  }

  isDecided(): boolean {
    return this.isApproved() || this.isRejected();
  }

  disabled(): boolean {
    return this.control().disabled || this.busy();
  }

  // The dense grid's pill only ever reverts to pending, so it has nothing to offer when that is refused.
  canToggleDecided(): boolean {
    return !this.inlineToggle() || this.allowPending();
  }

  onDecidedClick(): void {
    if (this.disabled()) {
      return;
    }
    if (this.inlineToggle()) {
      this.requestDecision('PENDING');
      return;
    }
    this.menuOpen.update(open => !open);
  }

  selectDecision(decision: ApprovalItemDecision): void {
    this.menuOpen.set(false);
    this.requestDecision(decision);
  }

  requestDecision(decision: ApprovalItemDecision): void {
    if (this.disabled()) {
      return;
    }
    this.decisionRequested.emit(decision);
  }
}
