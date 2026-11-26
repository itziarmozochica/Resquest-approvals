import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PlanReviewRequestComment } from '@fz-original/app/shared/models/plan-review/plan-review-request.model';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, TranslateModule],
  selector: 'app-plan-review-rejected-banner',
  standalone: true,
  styleUrls: ['./plan-review-rejected-banner.component.scss'],
  templateUrl: './plan-review-rejected-banner.component.html',
})
export class PlanReviewRejectedBannerComponent {
  comments = input<PlanReviewRequestComment[] | null>(null);
}
