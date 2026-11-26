import { ChangeDetectionStrategy, Component, input, InputSignal, output } from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { IconsModule } from '../../../../icons/icons.module';

export type FeedbackType = 'positive' | 'negative';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FontAwesomeModule, IconsModule],
  selector: 'app-chatbot-feedback',
  standalone: true,
  styleUrls: ['./chatbot-feedback.component.scss'],
  templateUrl: './chatbot-feedback.component.html',
})
export class ChatbotFeedbackComponent {
  feedbackSubmitted = output<FeedbackType>();
  selectedFeedback: InputSignal<FeedbackType | null> = input<FeedbackType | null>(null);

  onFeedbackClick(feedbackType: FeedbackType): void {
    if (this.selectedFeedback() === feedbackType) return;

    this.feedbackSubmitted.emit(feedbackType);
  }
}
