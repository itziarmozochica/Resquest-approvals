import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, signal, type OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslateModule } from '@ngx-translate/core';
import { MarkdownModule } from 'ngx-markdown';

import { RemoteMarkdownService } from '../../services/remote-markdown.service';

/** The single thing the template renders: a spinner, the markdown body, or a load-error message. */
type MarkdownViewState = 'loading' | 'ready' | 'error';

/** Matches absolute http(s) links; anchors like `#section` or `mailto:` are left untouched (see D7). */
const EXTERNAL_HTTP_LINK = /^https?:\/\//i;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownModule, TranslateModule],
  selector: 'app-fz-assistant-notification-markdown',
  standalone: true,
  styleUrl: './fz-assistant-notification-markdown.component.scss',
  templateUrl: './fz-assistant-notification-markdown.component.html',
})
export class FzAssistantNotificationMarkdownComponent implements OnInit {
  readonly #destroyRef = inject(DestroyRef);
  readonly #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #remoteMarkdown = inject(RemoteMarkdownService);

  /** Remote `.md` file URL (pre-signed S3); the only content source. A null url renders the load error. */
  readonly url = input<string | null>(null);

  protected readonly isLoading = signal(true);
  protected readonly fetchFailed = signal(false);
  protected readonly remoteContent = signal<string | null>(null);

  protected readonly state = computed<MarkdownViewState>(() => {
    if (this.url() === null) return 'error';
    if (this.isLoading()) return 'loading';
    if (this.fetchFailed()) return 'error';
    return 'ready';
  });

  protected readonly resolvedData = computed<string>(() => this.remoteContent() ?? '');

  ngOnInit(): void {
    const url = this.url();
    if (url === null) {
      this.isLoading.set(false);
      return;
    }

    this.#remoteMarkdown
      .fetch(url)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.fetchFailed.set(true);
          this.isLoading.set(false);
        },
        next: markdown => {
          if (markdown.trim().length === 0) {
            this.fetchFailed.set(true);
          } else {
            this.remoteContent.set(markdown);
          }
          this.isLoading.set(false);
        },
      });
  }

  protected onReady(): void {
    const anchors = this.#elementRef.nativeElement.querySelectorAll<HTMLAnchorElement>('a[href]');
    anchors.forEach(anchor => {
      if (EXTERNAL_HTTP_LINK.test(anchor.getAttribute('href') ?? '')) {
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }
}
