import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { IFrameResizerModule } from '@fz-original/app/shared/directives/iframe-resizer/iframe-resizer.module';
import { IgntIconComponent } from '@ignite/icon';

import { InsightsEmbedTheme } from '../../models/insights-embed-theme';
import { RealTimeFiltersEmbeddedSelection } from '../../models/real-time-embedded-selection.model';
import { RealTimeEmbeddedAuthCookieService } from '../../services/real-time-embedded-auth-cookie.service';
import { RealTimeEmbeddedMessagingService } from '../../services/real-time-embedded-messaging.service';

/**
 * The whole iframe wiring for every Real Time dashboard screen (PRD-4267).
 *
 * It sits in `components/` despite injecting services because `postMessage` needs
 * `iframe.contentWindow`, and the strict containers/components split does not apply to
 * `src/app/shared/` (see the `angular-standards-fever` feverzoneclient conventions, "Legacy
 * exceptions › Scaffolding"). It lives there, not in a feature, because two hosts render it: the
 * legacy `/reports` screens and the `/reporting` Dashboard of `@fz/fz-reporting`.
 *
 * It does NOT provide {@link RealTimeEmbeddedAuthCookieService} — the page does, because that
 * browser cookie is shared with the `three-sixty-analytics` embed and clearing it when the iframe
 * unmounts would interfere with that surface in another tab.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IFrameResizerModule, IgntIconComponent],
  selector: 'app-real-time-embedded-frame',
  standalone: true,
  styleUrl: './real-time-embedded-frame.component.scss',
  templateUrl: './real-time-embedded-frame.component.html',
})
export class RealTimeEmbeddedFrameComponent {
  readonly #embeddedAuthCookieService = inject(RealTimeEmbeddedAuthCookieService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #messaging = inject(RealTimeEmbeddedMessagingService);
  readonly #sanitizer = inject(DomSanitizer);

  readonly dashboardId = input.required<string>();
  readonly dataTestIdPrefix = input.required<string>();
  readonly frameTitle = input.required<string>();
  readonly selection = input<RealTimeFiltersEmbeddedSelection | null>(null);
  /**
   * Left unset by the Real Time pages, which theme the shell around the iframe instead and let the
   * portal apply its own default. A host on a light shell — 360 Analytics — asks for `'light'` here.
   */
  readonly theme = input<InsightsEmbedTheme | null>(null);

  protected readonly iframeEl = viewChild<ElementRef<HTMLIFrameElement>>('realTimeEmbeddedIframe');
  protected readonly isLoading = signal<boolean>(true);
  protected readonly safeUrl = computed<SafeResourceUrl>(() =>
    this.#sanitizer.bypassSecurityTrustResourceUrl(this.#messaging.buildEmbedUrl(this.dashboardId(), this.theme())),
  );

  constructor() {
    // Tracks the URL, not just the dashboard id: the language and the theme are in it too, and any
    // change to it navigates the iframe. Missing one leaves the overlay off and, because
    // `#postSelection` waits on `isLoading`, leaves the new document without its token or filters.
    effect(() => {
      this.safeUrl();
      this.isLoading.set(true);
    });

    effect(() => {
      this.#postSelection();
    });

    this.#messaging
      .createReadyMessageStream(event =>
        this.#messaging.isReadyMessageForSource(event, this.iframeEl()?.nativeElement.contentWindow ?? null),
      )
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.isLoading.set(false);
      });
  }

  #postSelection(): void {
    if (this.isLoading()) return;
    const selection = this.selection();
    if (selection === null) return;
    const contentWindow = this.iframeEl()?.nativeElement.contentWindow;
    if (!contentWindow) return;

    this.#embeddedAuthCookieService.saveToken();
    this.#messaging.postFiltersUpdate(contentWindow, selection);
  }
}
