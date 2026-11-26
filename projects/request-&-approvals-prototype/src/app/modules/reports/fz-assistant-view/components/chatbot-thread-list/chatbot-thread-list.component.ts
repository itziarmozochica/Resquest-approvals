import { ChangeDetectionStrategy, Component, computed, input, output, Signal } from '@angular/core';

import { ChatbotThread, ChatbotThreadMenuActionId } from '@fz-original/app/shared/models/chatbot/chatbot-thread.model';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { ChatbotThreadItemComponent } from '../chatbot-thread-item/chatbot-thread-item.component';
import { ChatbotThreadRenameComponent } from '../chatbot-thread-rename/chatbot-thread-rename.component';

const SCROLL_THRESHOLD_PX = 100;

export interface ChatbotThreadMenuActionEvent {
  actionId: ChatbotThreadMenuActionId;
  threadId: string;
}

export interface ChatbotThreadRenameSaveEvent {
  threadId: string;
  title: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'chatbot-thread-list' },
  imports: [ChatbotThreadItemComponent, ChatbotThreadRenameComponent, IgntIconComponent, TranslateModule],
  selector: 'app-chatbot-thread-list',
  standalone: true,
  styleUrl: './chatbot-thread-list.component.scss',
  templateUrl: './chatbot-thread-list.component.html',
})
export class ChatbotThreadListComponent {
  static readonly DEFAULT_EMPTY_MESSAGE_KEY = 'chatbot.threads.empty';
  static readonly DEFAULT_NO_RESULTS_MESSAGE_KEY = 'chatbot.threads.noResults';

  threads = input.required<ChatbotThread[]>();
  activeThreadId = input<string | null>(null);
  emptyMessageKey = input<string>(ChatbotThreadListComponent.DEFAULT_EMPTY_MESSAGE_KEY);
  isLoading = input<boolean>(false);
  noResultsMessageKey = input<string>(ChatbotThreadListComponent.DEFAULT_NO_RESULTS_MESSAGE_KEY);
  pendingTitleThreadId = input<string | null>(null);
  renamingThreadId = input<string | null>(null);
  searchActive = input<boolean>(false);
  searchQuery = input<string>('');

  loadMore = output<void>();
  menuAction = output<ChatbotThreadMenuActionEvent>();
  renameCancel = output<void>();
  renameSave = output<ChatbotThreadRenameSaveEvent>();
  selectThread = output<string>();

  showEmptyState: Signal<boolean> = computed(() => !this.isLoading() && this.threads().length === 0);

  onBodyScroll(event: Event): void {
    const scrollElement: HTMLElement = event.target as HTMLElement;
    const bottomOffset: number = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;

    if (bottomOffset < SCROLL_THRESHOLD_PX) {
      this.loadMore.emit();
    }
  }

  onItemMenuAction(threadId: string, actionId: ChatbotThreadMenuActionId): void {
    this.menuAction.emit({ actionId, threadId });
  }

  onItemSelect(threadId: string): void {
    this.selectThread.emit(threadId);
  }

  onRenameCancel(): void {
    this.renameCancel.emit();
  }

  onRenameSave(threadId: string, title: string): void {
    this.renameSave.emit({ threadId, title });
  }

  trackByThreadId(_: number, thread: ChatbotThread): string {
    return thread.id;
  }
}
