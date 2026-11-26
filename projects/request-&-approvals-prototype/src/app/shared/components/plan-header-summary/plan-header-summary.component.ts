import { ChangeDetectionStrategy, Component, computed, input, Signal } from '@angular/core';

import { PlanPreviewLinksComponent } from '@fz-original/app/shared/components/plan-preview-links/plan-preview-links.component';
import { IgntIconComponent } from '@ignite/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-testid': 'plan-header-summary',
  },
  imports: [IgntIconComponent, PlanPreviewLinksComponent],
  selector: 'app-plan-header-summary',
  standalone: true,
  styleUrl: './plan-header-summary.component.scss',
  templateUrl: './plan-header-summary.component.html',
})
export class PlanHeaderSummaryComponent {
  hasUnsavedChanges = input<() => boolean>(() => false);
  imageUrl = input.required<string | null>();
  name = input.required<string>();
  partnerId = input.required<number | null>();
  planId = input.required<number | null>();
  showPreviewLinks = input<boolean>(true);
  venue = input.required<string | null>();

  shouldShowPreviewLinks: Signal<boolean> = computed<boolean>(
    () => this.showPreviewLinks() && this.planId() !== null && this.partnerId() !== null,
  );
}
