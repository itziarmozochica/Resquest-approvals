import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { ActivitySegment } from '../../../../models/activity-segment.model';
import { ActivityRowComponent } from '../activity-row/activity-row.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ActivityRowComponent, IgntIconComponent, TranslateModule],
  selector: 'app-activity-segment',
  standalone: true,
  styleUrl: './activity-segment.component.scss',
  templateUrl: './activity-segment.component.html',
})
export class ActivitySegmentComponent {
  segment = input.required<ActivitySegment>();

  locateAsset = output<number>();
  moveAsset = output<number>();
}
