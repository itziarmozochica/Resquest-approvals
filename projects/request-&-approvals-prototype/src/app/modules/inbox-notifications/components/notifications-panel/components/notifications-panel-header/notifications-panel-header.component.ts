import { ChangeDetectionStrategy, Component, output } from '@angular/core';

import { AiSparkleIconComponent } from '@fz-original/app/shared/components/ai-sparkle-icon/ai-sparkle-icon.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AiSparkleIconComponent, IgntIconButtonComponent, TranslateModule],
  selector: 'app-notifications-panel-header',
  standalone: true,
  styleUrl: './notifications-panel-header.component.scss',
  templateUrl: './notifications-panel-header.component.html',
})
export class NotificationsPanelHeaderComponent {
  readonly close = output<void>();
}
