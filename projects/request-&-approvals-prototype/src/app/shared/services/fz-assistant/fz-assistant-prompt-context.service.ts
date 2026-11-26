import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';

import {
  ChatbotSuggestionAction,
  ChatbotSuggestionItem,
} from '@fz-original/app/shared/components/chatbot-modal/chatbot-conversation/chatbot-suggestions/chatbot-suggestion-item.model';
import { FzAssistantPromptContextId } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-route-data.model';
import { ZendeskService } from '@fz-original/app/shared/services/script-loader/zendesk/zendesk.service';
import { getFzAssistantPromptContextFromRouteSnapshot } from '@fz-original/app/shared/utils/fz-assistant-route.util';
import { TranslateService } from '@ngx-translate/core';
import { filter, map, startWith } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class FzAssistantPromptContextService {
  readonly #destroyRef = inject(DestroyRef);
  readonly #router = inject(Router);
  readonly #translateService = inject(TranslateService);
  readonly #zendeskService = inject(ZendeskService);
  readonly #langTick = signal<number>(0);

  readonly promptContextId = toSignal(
    this.#router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.#readPromptContextFromRouter()),
      startWith(this.#readPromptContextFromRouter()),
    ),
    { requireSync: true },
  );

  readonly headerDescriptionKey = computed(() => {
    this.#langTick();
    return this.#headerDescriptionKeyForContext(this.promptContextId());
  });

  readonly headerTitleKey = computed(() => {
    this.#langTick();
    return this.#headerTitleKeyForContext(this.promptContextId());
  });

  readonly inputPlaceholderKey = computed(() => {
    this.#langTick();
    return this.#inputPlaceholderKeyForContext(this.promptContextId());
  });

  readonly suggestions = computed(() => {
    this.#langTick();
    return this.#buildSuggestions(this.promptContextId());
  });

  constructor() {
    this.#translateService.onLangChange.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#langTick.update((n: number) => n + 1);
    });
  }

  #buildPromptSuggestions(contextId: FzAssistantPromptContextId | undefined): ChatbotSuggestionItem[] {
    if (contextId === 'reviews') {
      const tag = this.#translateService.instant('chatbot.context.reviews.suggestions.tags.reviews');
      return [
        {
          iconName: 'chart-line',
          iconVariant: 'light',
          tags: [tag],
          text: this.#translateService.instant('chatbot.context.reviews.suggestions.items.first'),
        },
        {
          iconName: 'comments-alt',
          iconVariant: 'light',
          tags: [tag],
          text: this.#translateService.instant('chatbot.context.reviews.suggestions.items.second'),
        },
        {
          iconName: 'list-alt',
          iconVariant: 'light',
          tags: [tag],
          text: this.#translateService.instant('chatbot.context.reviews.suggestions.items.third'),
        },
      ];
    }

    if (contextId === 'dashboard-builder') {
      const tag = this.#translateService.instant('chatbot.context.dashboard-builder.suggestions.tags.reporting');
      return [
        {
          iconName: 'question-circle',
          iconVariant: 'light',
          tags: [tag],
          text: this.#translateService.instant('chatbot.context.dashboard-builder.suggestions.items.first'),
        },
        {
          iconName: 'search',
          iconVariant: 'light',
          tags: [tag],
          text: this.#translateService.instant('chatbot.context.dashboard-builder.suggestions.items.second'),
        },
        {
          iconName: 'chart-area',
          iconVariant: 'light',
          tags: [tag],
          text: this.#translateService.instant('chatbot.context.dashboard-builder.suggestions.items.third'),
        },
      ];
    }

    const tag = this.#translateService.instant('chatbot.suggestions.tags.sales');
    return [
      {
        iconName: 'store-alt',
        iconVariant: 'light',
        tags: [tag],
        text: this.#translateService.instant('chatbot.suggestions.items.first'),
      },
      {
        iconName: 'clock',
        iconVariant: 'light',
        tags: [tag],
        text: this.#translateService.instant('chatbot.suggestions.items.second'),
      },
      {
        iconName: 'hand-holding-usd',
        iconVariant: 'light',
        tags: [tag],
        text: this.#translateService.instant('chatbot.suggestions.items.third'),
      },
    ];
  }

  /**
   * The customer-service handoff when the new Zendesk entry points are on, then the context's prompt
   * suggestions.
   *
   * The handoff leads, so it stays above the fold on a short viewport. Together with the profile
   * menu's "Chat with Partner Support" item it replaces the header "Chat with us" button, so it shows exactly
   * when that button does not, and on every route.
   */
  #buildSuggestions(contextId: FzAssistantPromptContextId | undefined): ChatbotSuggestionItem[] {
    const suggestions = this.#buildPromptSuggestions(contextId);
    if (!this.#zendeskService.areNewEntryPointsEnabled()) {
      return suggestions;
    }

    return [
      {
        action: ChatbotSuggestionAction.customerService,
        iconName: 'user-headset',
        iconVariant: 'light',
        tags: [this.#translateService.instant('chatbot.suggestions.tags.support')],
        text: this.#translateService.instant('chatbot.suggestions.customerService'),
      },
      ...suggestions,
    ];
  }

  #headerDescriptionKeyForContext(contextId: FzAssistantPromptContextId | undefined): string {
    if (contextId === 'reviews') {
      return 'chatbot.context.reviews.header.description';
    }
    if (contextId === 'dashboard-builder') {
      return 'chatbot.context.dashboard-builder.header.description';
    }
    return 'chatbot.header.description';
  }

  #headerTitleKeyForContext(contextId: FzAssistantPromptContextId | undefined): string {
    if (contextId === 'reviews') {
      return 'chatbot.context.reviews.header.title';
    }
    if (contextId === 'dashboard-builder') {
      return 'chatbot.context.dashboard-builder.header.title';
    }
    return 'chatbot.header.title';
  }

  #inputPlaceholderKeyForContext(contextId: FzAssistantPromptContextId | undefined): string {
    if (contextId === 'reviews') {
      return 'chatbot.context.reviews.input.placeholder';
    }
    if (contextId === 'dashboard-builder') {
      return 'chatbot.context.dashboard-builder.input.placeholder';
    }
    return 'chatbot.input.placeholder';
  }

  #readPromptContextFromRouter(): FzAssistantPromptContextId | undefined {
    return getFzAssistantPromptContextFromRouteSnapshot(this.#router.routerState.snapshot.root);
  }
}
