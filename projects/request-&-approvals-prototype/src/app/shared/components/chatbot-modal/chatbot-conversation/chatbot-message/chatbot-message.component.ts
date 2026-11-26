import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  signal,
  Signal,
  Type,
  ViewEncapsulation,
} from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { MarkdownModule } from 'ngx-markdown';

import { ChatbotMessage, ChatbotMessageType } from '../../../../models/chatbot/chatbot.model';
import { ChatbotUIRegistryService } from '../../../../services/chatbot/chatbot-ui-registry.service';
import { isChatbotTextMessage, isChatbotUIMessage } from '../../../../utils/chatbot.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [MarkdownModule, NgComponentOutlet, TranslateModule],
  selector: 'app-chatbot-message',
  standalone: true,
  styleUrls: ['./chatbot-message.component.scss', './chatbot-message-markdown.scss'],
  templateUrl: './chatbot-message.component.html',
})
export class ChatbotMessageComponent {
  #uiRegistry = inject(ChatbotUIRegistryService);

  message: InputSignal<ChatbotMessage> = input.required<ChatbotMessage>();
  isHuman: Signal<boolean> = computed<boolean>(() => this.message().type === ChatbotMessageType.HUMAN);
  isUiMessage: Signal<boolean> = computed<boolean>(() => isChatbotUIMessage(this.message()));

  textContent: Signal<string> = computed<string>(() => {
    const msg: ChatbotMessage = this.message();
    if (!isChatbotTextMessage(msg)) return '';
    return msg.content;
  });

  readonly #uiComponentSignal = signal<Type<unknown> | null>(null);
  readonly uiComponent = this.#uiComponentSignal.asReadonly();

  constructor() {
    effect(onCleanup => {
      const msg: ChatbotMessage = this.message();
      this.#uiComponentSignal.set(null);

      if (!isChatbotUIMessage(msg)) return;

      const loader = this.#uiRegistry.resolve(msg.content.ui_type);
      if (!loader) return;

      let stale = false;
      onCleanup(() => {
        stale = true;
      });

      loader()
        .then(c => {
          if (!stale) this.#uiComponentSignal.set(c);
        })
        .catch(() => {});
    });
  }

  uiInputs: Signal<Record<string, unknown>> = computed<Record<string, unknown>>(() => {
    const msg: ChatbotMessage = this.message();
    if (!isChatbotUIMessage(msg)) return {};
    return { data: msg.content.data };
  });
}
