import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import {
  ZiflowDecisionSentiment,
  ziflowDecisionSentiment,
} from '@fz-original/app/modules/ir-approval/shared/utils/ziflow-decision-sentiment.util';
import { translationRevisionSignal } from '@fz-original/app/shared/utils/translation-revision.signal.util';
import { IgntButtonComponent, IgntButtonIcon } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ApprovalReviewProgress } from '../../models/approval.model';

/** A reviewer row with its decision already worded, so the template does not translate per pass. */
export interface ReviewerRow {
  email: string;
  decision?: string;
  decisionSentiment: ZiflowDecisionSentiment;
  decidedAt?: string;
  feedback?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.review-progress--shown]': 'visible()' },
  imports: [DatePipe, IgntButtonComponent, IgntIconComponent, TranslateModule],
  selector: 'app-approval-review-progress',
  standalone: true,
  styleUrl: './approval-review-progress.component.scss',
  templateUrl: './approval-review-progress.component.html',
})
export class ApprovalReviewProgressComponent {
  private static readonly DECISION_KEY_PREFIX = 'editHistory.ziflowDecision.';
  private static readonly OWN_DECISION_KEY = 'approvals.detail.reviewProgress.ownDecisionRegistered';
  private static readonly SUMMARY_KEY = 'approvals.detail.reviewProgress.summary';
  private static readonly PROGRESS_KEY = 'approvals.detail.reviewProgress.reviewerProgress';

  readonly progress = input.required<ApprovalReviewProgress>();
  readonly hideFeedback = input<boolean>(false);

  protected readonly expanded = signal<boolean>(false);

  readonly #translate = inject(TranslateService);
  readonly #i18nRevision = translationRevisionSignal(this.#translate);

  protected readonly visible = computed<boolean>(
    () => this.progress().totalReviewers > 0 && (this.progress().mode === 'everyone' || !!this.progress().ownDecision),
  );

  protected readonly unreachable = computed<boolean>(() => !!this.progress().ownDecision && this.progress().ownReachesZiflow === false);

  protected readonly reviewers = computed<ReviewerRow[]>(() => {
    this.#i18nRevision();
    return this.progress().reviewers.map(reviewer => ({
      email: reviewer.email,
      decision: reviewer.ziflowDecision ? this.#decisionLabel(reviewer.ziflowDecision) : undefined,
      decisionSentiment: ziflowDecisionSentiment(reviewer.ziflowDecision),
      decidedAt: reviewer.decidedAt,
      feedback: reviewer.feedback,
    }));
  });

  protected readonly summaryLabel = computed<string>(() => {
    this.#i18nRevision();
    const progress = this.progress();
    const counters = this.#translate.instant(ApprovalReviewProgressComponent.PROGRESS_KEY, {
      decided: progress.decidedReviewers,
      total: progress.totalReviewers,
    });
    const own = this.#translate.instant(ApprovalReviewProgressComponent.OWN_DECISION_KEY);
    if (progress.mode === 'only_one') {
      return own;
    }
    return progress.ownDecision ? this.#translate.instant(ApprovalReviewProgressComponent.SUMMARY_KEY, { own, counters }) : counters;
  });

  protected readonly summaryIcon = computed<IgntButtonIcon | undefined>(() =>
    this.progress().ownDecision ? { name: 'check-circle', variant: 'solid' } : undefined,
  );

  protected readonly chevron = computed<IgntButtonIcon>(() => ({
    name: this.expanded() ? 'chevron-down' : 'chevron-right',
    variant: 'light',
  }));

  protected toggle(): void {
    this.expanded.update(expanded => !expanded);
  }

  #decisionLabel(decision: string): string {
    const key = `${ApprovalReviewProgressComponent.DECISION_KEY_PREFIX}${decision.toLowerCase()}`;
    const label = this.#translate.instant(key);
    return label === key ? decision : label;
  }
}
