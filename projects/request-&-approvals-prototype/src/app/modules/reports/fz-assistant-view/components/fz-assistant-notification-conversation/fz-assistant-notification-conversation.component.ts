import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ChatbotMessageComponent } from '@fz-original/app/shared/components/chatbot-modal/chatbot-conversation/chatbot-message/chatbot-message.component';
import type { ChatbotMessage } from '@fz-original/app/shared/models/chatbot/chatbot.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChatbotMessageComponent],
  selector: 'app-fz-assistant-notification-conversation',
  standalone: true,
  styleUrl: './fz-assistant-notification-conversation.component.scss',
  templateUrl: './fz-assistant-notification-conversation.component.html',
})
export class FzAssistantNotificationConversationComponent {
  readonly messages = input<readonly ChatbotMessage[]>([]);
}
