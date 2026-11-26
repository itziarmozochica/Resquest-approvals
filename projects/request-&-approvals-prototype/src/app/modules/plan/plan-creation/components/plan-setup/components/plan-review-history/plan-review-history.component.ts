import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PlanReviewRequestModel } from '@fz-original/app/shared/models/plan-review/plan-review-request.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslateModule],
  selector: 'app-plan-review-history',
  standalone: true,
  styleUrls: ['./plan-review-history.component.scss'],
  templateUrl: './plan-review-history.component.html',
})
export class PlanReviewHistoryComponent {
  reviews = input.required<PlanReviewRequestModel[]>();
}
