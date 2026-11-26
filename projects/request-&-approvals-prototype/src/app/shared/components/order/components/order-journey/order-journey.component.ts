import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ActivitySegmentComponent } from '@fz-original/app/modules/asset-based/asset-based-calendar-view/components/booking-detail-panel/components/activities-tab/components/activity-segment/activity-segment.component';
import { IgntExpansionPanelComponent } from '@ignite/legacy/components/ignt-expansion-panel/ignt-expansion-panel.component';
import { TranslateModule } from '@ngx-translate/core';

import { formatJourneyInstant, journeyToActivitySegments } from '../../../../models/journey/journey-activity-segments.util';
import { Journey } from '../../../../models/journey/journey.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ActivitySegmentComponent, IgntExpansionPanelComponent, TranslateModule],
  selector: 'app-order-journey',
  styleUrl: './order-journey.component.scss',
  templateUrl: './order-journey.component.html',
})
export class OrderJourneyComponent {
  readonly journey = input.required<Journey>();

  protected readonly segments = computed(() => journeyToActivitySegments(this.journey()));
  protected readonly spanParams = computed(() => {
    const { endsAt, isMultiDay, startsAt, timezone } = this.journey();

    return {
      end: formatJourneyInstant(endsAt, timezone, isMultiDay),
      start: formatJourneyInstant(startsAt, timezone, isMultiDay),
    };
  });
}
