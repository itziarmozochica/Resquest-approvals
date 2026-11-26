import { ChangeDetectionStrategy, Component, inject, NgZone, output, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslateModule } from '@ngx-translate/core';
import { fromEvent, merge, timer } from 'rxjs';
import { filter, map, startWith, switchMap, takeWhile, tap } from 'rxjs/operators';

import {
  kioskScreensaverFallbackLogoUrl,
  kioskScreensaverIdleMs,
  kioskScreensaverPlayTimeoutMs,
} from '../../constants/screensaver/screensaver.constants';
import { KioskScreensaverService } from '../../services/screensaver/kiosk-screensaver.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-kiosk-screensaver',
  standalone: true,
  styleUrl: './kiosk-screensaver.component.scss',
  templateUrl: './kiosk-screensaver.component.html',
})
export class KioskScreensaverComponent {
  readonly #kioskScreensaverService = inject(KioskScreensaverService);
  readonly #ngZone = inject(NgZone);
  protected logoUrl: WritableSignal<string> = signal(kioskScreensaverFallbackLogoUrl);
  protected logoWidthPx: WritableSignal<number | null> = signal(null);
  protected isVideoPlaying: WritableSignal<boolean> = signal(false);
  protected videoUrl: WritableSignal<string | null> = signal(null);
  readonly dismissed = output<void>();
  readonly shown = output<void>();
  #activationEpoch = 0;
  #playWatcherId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.#kioskScreensaverService.prefetch();
    // Outside the zone: otherwise every touch on home would trigger a change-detection cycle
    // whose only purpose is resetting this timer. #activate re-enters the zone when it renders.
    this.#ngZone.runOutsideAngular(() => {
      merge(fromEvent(document, 'pointerdown'), fromEvent(document, 'touchstart'))
        .pipe(
          tap(() => this.#activationEpoch++),
          startWith(null),
          switchMap(() => timer(kioskScreensaverIdleMs, kioskScreensaverIdleMs)),
          map(() => this.#kioskScreensaverService.isScreensaverEnabled()),
          takeWhile((isEnabled: boolean | null) => isEnabled !== false),
          filter((isEnabled: boolean | null) => isEnabled === true),
          takeUntilDestroyed(),
        )
        .subscribe(() => this.#activate());
    });
  }

  protected dismiss(event?: Event): void {
    if (event?.cancelable) {
      event.preventDefault();
    }
    this.#hideOverlay();
    // Fallback for prefers-reduced-motion, where the fade-in never runs and animationend never fires.
    this.resetScroll();
    this.dismissed.emit();
  }

  protected onLogoError(): void {
    this.logoUrl.set(kioskScreensaverFallbackLogoUrl);
    this.logoWidthPx.set(null);
  }

  protected onVideoError(video: HTMLVideoElement): void {
    this.#handleFail(`media error (code ${video.error?.code ?? 'unknown'}: ${video.error?.message || 'no message'})`);
  }

  protected onVideoPlaying(): void {
    this.#clearPlayWatcher();
    this.#kioskScreensaverService.notifyPlaybackStarted();
    if (this.isVideoPlaying()) {
      return;
    }
    this.isVideoPlaying.set(true);
    this.shown.emit();
  }

  protected onVideoReady(video: HTMLVideoElement): void {
    video.muted = true;
    void video.play().catch((error: unknown) => {
      if (this.videoUrl() === null) {
        return;
      }
      this.#handleFail(`play() rejected (${String(error)})`);
    });
  }

  protected resetScroll(): void {
    window.scrollTo(0, 0);
  }

  #activate(): void {
    if (this.videoUrl() !== null) {
      return;
    }
    const epoch: number = this.#activationEpoch;
    void this.#kioskScreensaverService.getVideoObjectUrl().then((url: string | null) => {
      if (url !== null && epoch === this.#activationEpoch) {
        this.#ngZone.run(() => {
          this.logoUrl.set(this.#kioskScreensaverService.getScreensaverLogoUrl());
          this.logoWidthPx.set(this.#kioskScreensaverService.getScreensaverLogoWidthPx());
          this.videoUrl.set(url);
          // Covers every silent path: metadata never arriving, autoplay denied without rejection, decode stalls.
          this.#playWatcherId = setTimeout(() => {
            this.#handleFail(`playback never started within ${kioskScreensaverPlayTimeoutMs}ms`);
          }, kioskScreensaverPlayTimeoutMs);
        });
      }
    });
  }

  #clearPlayWatcher(): void {
    if (this.#playWatcherId !== null) {
      clearTimeout(this.#playWatcherId);
      this.#playWatcherId = null;
    }
  }

  #handleFail(detail: string): void {
    void this.#kioskScreensaverService.handlePlaybackFailure(detail);
    this.#hideOverlay();
  }

  #hideOverlay(): void {
    this.#clearPlayWatcher();
    this.#kioskScreensaverService.releaseObjectUrl();
    this.isVideoPlaying.set(false);
    this.videoUrl.set(null);
  }
}
