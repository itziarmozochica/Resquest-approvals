import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, type Signal } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-fz-assistant-notification-insight',
  standalone: true,
  styleUrl: './fz-assistant-notification-insight.component.scss',
  templateUrl: './fz-assistant-notification-insight.component.html',
})
export class FzAssistantNotificationInsightComponent {
  readonly #sanitizer = inject(DomSanitizer);

  readonly url = input.required<string | null>();

  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);

  constructor() {
    // The load/error state is per-URL. Reset it whenever the `url` input rebinds so a stale
    // error/loaded branch from a previous URL can't suppress the new iframe.
    effect(() => {
      this.url();
      this.isLoading.set(true);
      this.hasError.set(false);
    });
  }

  /**
   * Builds the `SafeResourceUrl` only for valid HTTPS URLs. The `bypassSecurityTrustResourceUrl`
   * is acceptable here because the iframe is sandboxed (opaque origin, no `allow-same-origin`)
   * and the URL is a backend-issued presigned link; the HTTPS guard blocks `javascript:`/`data:`
   * schemes in a tampered payload.
   */
  protected readonly safeUrl: Signal<SafeResourceUrl | null> = computed(() => {
    const raw = this.url();
    if (raw === null || !this.#isHttpsUrl(raw)) return null;
    return this.#sanitizer.bypassSecurityTrustResourceUrl(raw);
  });

  protected onError(): void {
    this.isLoading.set(false);
    this.hasError.set(true);
  }

  protected onLoad(): void {
    this.isLoading.set(false);
  }

  #isHttpsUrl(value: string): boolean {
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }
}
