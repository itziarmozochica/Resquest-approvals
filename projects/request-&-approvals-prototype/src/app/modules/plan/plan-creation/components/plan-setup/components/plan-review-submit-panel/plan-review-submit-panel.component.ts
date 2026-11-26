import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { PlanReviewSubmitVariant } from '../../models/plan-review-submit-variant.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, TranslateModule],
  selector: 'app-plan-review-submit-panel',
  standalone: true,
  styleUrls: ['./plan-review-submit-panel.component.scss'],
  templateUrl: './plan-review-submit-panel.component.html',
})
export class PlanReviewSubmitPanelComponent {
  variant = input.required<PlanReviewSubmitVariant>();
  loading = input<boolean>(false);

  setReadyClicked = output<void>();
  submitted = output<void>();

  readonly translationKeys = computed(() => {
    if (this.variant() === 'setReady') {
      return {
        bullets: ['planReview.setReady.bulletDraft', 'planReview.setReady.bulletSetReady', 'planReview.setReady.bulletPublish'],
        testId: 'plan-setup-set-ready',
        title: 'planReview.setReady.title',
      };
    }
    if (this.variant() === 'both') {
      return {
        bullets: [
          'planReview.setReady.bulletDraft',
          'planReview.reviewOptions.bulletSetReadyPath',
          'planReview.reviewOptions.bulletSubmitPath',
          'planReview.setReady.bulletPublish',
        ],
        testId: 'plan-setup-review-options',
        title: 'planReview.setReady.title',
      };
    }
    return {
      bullets: ['planReview.almostDone.bulletDraft', 'planReview.almostDone.bulletSubmit', 'planReview.almostDone.bulletPublish'],
      testId: 'plan-setup-almost-done',
      title: 'planReview.almostDone.title',
    };
  });

  onSetReadyClick(): void {
    this.setReadyClicked.emit();
  }

  onSubmitClick(): void {
    this.submitted.emit();
  }
}
