import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, ViewEncapsulation, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslateService } from '@ngx-translate/core';
import { interval, timer } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgOptimizedImage],
  selector: 'app-chatbot-loading',
  standalone: true,
  styleUrls: ['./chatbot-loading.component.scss'],
  templateUrl: './chatbot-loading.component.html',
})
export class ChatbotLoadingComponent {
  static readonly cycleMessageKeys: string[] = [
    'chatbot.loading.messages.processing',
    'chatbot.loading.messages.identifying',
    'chatbot.loading.messages.analyzing',
    'chatbot.loading.messages.generating',
  ];
  static readonly finalMessageDelayMs: number = 40000;
  static readonly finalMessageKey: string = 'chatbot.loading.messages.final';
  static readonly messageIntervalMs: number = 5000;

  #destroyRef = inject(DestroyRef);
  #isFinalMessageShown: WritableSignal<boolean> = signal<boolean>(false);
  #translateService = inject(TranslateService);

  currentMessage: WritableSignal<string> = signal<string>(this.#translateService.instant(ChatbotLoadingComponent.cycleMessageKeys[0]));

  constructor() {
    this.#startMessageCycle();
    this.#scheduleFinalMessage();
  }

  #scheduleFinalMessage(): void {
    timer(ChatbotLoadingComponent.finalMessageDelayMs)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#isFinalMessageShown.set(true);
        this.currentMessage.set(this.#translateService.instant(ChatbotLoadingComponent.finalMessageKey));
      });
  }

  #startMessageCycle(): void {
    interval(ChatbotLoadingComponent.messageIntervalMs)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((index: number) => {
        if (!this.#isFinalMessageShown()) {
          const messageIndex: number = (index + 1) % ChatbotLoadingComponent.cycleMessageKeys.length;
          const translationKey: string = ChatbotLoadingComponent.cycleMessageKeys[messageIndex];
          this.currentMessage.set(this.#translateService.instant(translationKey));
        }
      });
  }
}
