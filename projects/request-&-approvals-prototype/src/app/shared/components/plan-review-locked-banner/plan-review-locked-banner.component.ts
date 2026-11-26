import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { PlanEditionLockService } from '@fz-original/app/shared/services/plan-review/plan-edition-lock.service';
import { IgntAlertComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'status',
    'aria-live': 'polite',
    'data-testid': 'plan-review-locked-banner',
  },
  imports: [IgntAlertComponent, TranslateModule],
  selector: 'app-plan-review-locked-banner',
  standalone: true,
  styleUrl: './plan-review-locked-banner.component.scss',
  templateUrl: './plan-review-locked-banner.component.html',
})
export class PlanReviewLockedBannerComponent {
  readonly #lockService = inject(PlanEditionLockService);

  protected readonly titleKey = computed(() => this.#resolveCopyKey('title'));
  protected readonly messageKey = computed(() => this.#resolveCopyKey('message'));

  #resolveCopyKey(field: 'title' | 'message'): string {
    const reason = this.#lockService.lockReason();
    const variant = reason?.kind === 'plan_ready' ? 'planReady' : 'reviewInProgress';
    return `planReview.lockedBanner.${variant}.${field}`;
  }
}
