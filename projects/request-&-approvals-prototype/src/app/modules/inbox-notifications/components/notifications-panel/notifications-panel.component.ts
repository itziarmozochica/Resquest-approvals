import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { NotificationsOverlayService } from '../../services/notifications-overlay.service';
import { PANEL_CLOSE } from '../../tokens/panel-close.token';
import { NotificationsPanelContentComponent } from '../notifications-panel-content/notifications-panel-content.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-label]': 'ariaLabel',
    'aria-modal': 'false',
    cdkTrapFocus: '',
    cdkTrapFocusAutoCapture: 'true',
    role: 'dialog',
  },
  imports: [A11yModule, NotificationsPanelContentComponent],
  providers: [
    {
      provide: PANEL_CLOSE,
      useFactory: (): (() => void) => {
        const overlayService = inject(NotificationsOverlayService);
        return () => overlayService.close();
      },
    },
  ],
  selector: 'app-notifications-panel',
  standalone: true,
  styleUrl: './notifications-panel.component.scss',
  templateUrl: './notifications-panel.component.html',
})
export class NotificationsPanelComponent {
  protected readonly ariaLabel = inject(TranslateService).instant('notifications.title');
}
