import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

export type PlanReviewSuccessVariant = 'submitted' | 'ready';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntIconComponent, TranslateModule],
  selector: 'app-plan-review-success-panel',
  standalone: true,
  styleUrls: ['./plan-review-success-panel.component.scss'],
  templateUrl: './plan-review-success-panel.component.html',
})
export class PlanReviewSuccessPanelComponent {
  variant = input.required<PlanReviewSuccessVariant>();
  showCancelSubmission = input<boolean>(false);
  loading = input<boolean>(false);

  backToList = output<void>();
  cancelSubmission = output<void>();
  takeMeToChannels = output<void>();

  onBackToList(): void {
    this.backToList.emit();
  }

  onCancelSubmission(): void {
    this.cancelSubmission.emit();
  }

  onTakeMeToChannels(): void {
    this.takeMeToChannels.emit();
  }
}
