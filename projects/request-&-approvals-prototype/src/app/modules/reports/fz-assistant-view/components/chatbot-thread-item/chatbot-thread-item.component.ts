import { OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, input, output, Signal, signal, WritableSignal } from '@angular/core';

import {
  CHATBOT_THREAD_MENU_ACTIONS,
  ChatbotThread,
  ChatbotThreadItemMenuAction,
  ChatbotThreadMenuActionId,
} from '@fz-original/app/shared/models/chatbot/chatbot-thread.model';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

export const DEFAULT_THREAD_MENU_ACTIONS: readonly ChatbotThreadItemMenuAction[] = [
  { iconName: 'pen', id: CHATBOT_THREAD_MENU_ACTIONS.Rename, labelKey: 'chatbot.threads.rename' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '[attr.aria-current]': 'isActive() ? "true" : null',
    '[class.chatbot-thread-item--active]': 'isActive()',
    '[class.chatbot-thread-item--menu-open]': 'isMenuOpen()',
    '[class.chatbot-thread-item--unread]': 'isUnread()',
    class: 'chatbot-thread-item',
  },
  imports: [IgntIconComponent, OverlayModule, TranslateModule],
  selector: 'app-chatbot-thread-item',
  standalone: true,
  styleUrl: './chatbot-thread-item.component.scss',
  templateUrl: './chatbot-thread-item.component.html',
})
export class ChatbotThreadItemComponent {
  thread = input.required<ChatbotThread>();
  isActive = input<boolean>(false);
  isMenuDisabled = input<boolean>(false);
  menuActions = input<readonly ChatbotThreadItemMenuAction[]>(DEFAULT_THREAD_MENU_ACTIONS);

  menuActionClick = output<ChatbotThreadMenuActionId>();
  select = output<void>();

  isMenuOpen: WritableSignal<boolean> = signal<boolean>(false);
  isUnread: Signal<boolean> = computed<boolean>(() => !this.thread().read);

  onEscape(): void {
    if (this.isMenuOpen()) {
      this.isMenuOpen.set(false);
    }
  }

  onMenuActionClick(event: MouseEvent, actionId: ChatbotThreadMenuActionId): void {
    event.stopPropagation();
    this.isMenuOpen.set(false);
    this.menuActionClick.emit(actionId);
  }

  onMenuToggle(event: MouseEvent): void {
    event.stopPropagation();
    this.isMenuOpen.update((open: boolean) => !open);
  }

  onSelect(): void {
    this.select.emit();
  }
}
