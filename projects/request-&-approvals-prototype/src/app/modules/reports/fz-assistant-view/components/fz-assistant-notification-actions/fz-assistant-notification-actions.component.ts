import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import type { FzAssistantInsightAction } from '../fz-assistant-notifications-dialog/fz-assistant-notifications-dialog-data.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-fz-assistant-notification-actions',
  standalone: true,
  styleUrl: './fz-assistant-notification-actions.component.scss',
  templateUrl: './fz-assistant-notification-actions.component.html',
})
export class FzAssistantNotificationActionsComponent {
  readonly actions = input<readonly FzAssistantInsightAction[]>([]);
  readonly questionKey = input<string>('chatbot.notificationsDialog.actions.question');
  readonly actionSelected = output<FzAssistantInsightAction>();
}
