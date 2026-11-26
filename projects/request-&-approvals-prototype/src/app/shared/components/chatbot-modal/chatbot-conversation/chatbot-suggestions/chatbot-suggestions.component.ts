import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';

import { ChatbotSuggestionActionET, ChatbotSuggestionItem } from './chatbot-suggestion-item.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent],
  selector: 'app-chatbot-suggestions',
  standalone: true,
  styleUrl: './chatbot-suggestions.component.scss',
  templateUrl: './chatbot-suggestions.component.html',
})
export class ChatbotSuggestionsComponent {
  suggestions = input<ChatbotSuggestionItem[]>([]);
  /** A prompt was chosen; the payload is the text to send. */
  suggestionClick = output<string>();
  /** An item carrying an `action` was chosen, so there is no prompt to send. */
  actionSelected = output<ChatbotSuggestionActionET>();

  /**
   * Which of the two a click is, is this component's call — it owns the item model. Hosts bind the
   * output they care about instead of re-inspecting the item.
   */
  onSuggestionClick(suggestion: ChatbotSuggestionItem): void {
    if (suggestion.action) {
      this.actionSelected.emit(suggestion.action);
      return;
    }

    this.suggestionClick.emit(suggestion.text);
  }
}
