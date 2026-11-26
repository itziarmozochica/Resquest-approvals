import { ChangeDetectionStrategy, Component, computed, input, InputSignal, output, OutputEmitterRef, Signal } from '@angular/core';

import { ChatbotConversationItem, ChatbotMessageType } from '../../../models/chatbot/chatbot.model';
import { FeedbackRequestEvent } from './chatbot-conversation.model';
import { ChatbotFeedbackComponent, FeedbackType } from './chatbot-feedback/chatbot-feedback.component';
import { ChatbotMessageComponent } from './chatbot-message/chatbot-message.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChatbotFeedbackComponent, ChatbotMessageComponent],
  selector: 'app-chatbot-conversation',
  standalone: true,
  styleUrls: ['./chatbot-conversation.component.scss'],
  templateUrl: './chatbot-conversation.component.html',
})
export class ChatbotConversationComponent {
  conversationItem = input.required<ChatbotConversationItem>();
  confirmedFeedback: InputSignal<FeedbackType | null> = input<FeedbackType | null>(null);

  negativeFeedbackRequested: OutputEmitterRef<FeedbackRequestEvent> = output<FeedbackRequestEvent>();
  positiveFeedbackSubmitted: OutputEmitterRef<FeedbackRequestEvent> = output<FeedbackRequestEvent>();

  isAi: Signal<boolean> = computed<boolean>(() => this.conversationItem().type === ChatbotMessageType.AI);
  isHuman: Signal<boolean> = computed<boolean>(() => this.conversationItem().type === ChatbotMessageType.HUMAN);

  onFeedbackClick(feedbackType: FeedbackType): void {
    const runId = this.conversationItem().runId;
    if (!runId) return;

    if (feedbackType === 'positive') {
      this.positiveFeedbackSubmitted.emit({ runId });
      return;
    }

    this.negativeFeedbackRequested.emit({ runId });
  }
}
