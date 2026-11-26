import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IgntAlertComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, IgntIconComponent],
  selector: 'app-loading-notice',
  styleUrl: './loading-notice.component.scss',
  templateUrl: './loading-notice.component.html',
})
export class LoadingNoticeComponent {
  readonly label = input.required<string>();
}
