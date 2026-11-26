import { ChangeDetectionStrategy, Component, output } from '@angular/core';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, TranslateModule],
  selector: 'app-notifications-panel-footer',
  standalone: true,
  styleUrl: './notifications-panel-footer.component.scss',
  templateUrl: './notifications-panel-footer.component.html',
})
export class NotificationsPanelFooterComponent {
  readonly viewAll = output<void>();
}
