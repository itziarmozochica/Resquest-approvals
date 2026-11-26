import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { Router } from '@angular/router';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { KioskStateService } from '@fz-original/app/modules/kiosk/services/kiosk-state/kiosk-state.service';
import { KioskStorageService } from '@fz-original/app/modules/kiosk/services/kiosk-storage.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SpinnerService {
  readonly #animationDuration = 4400;
  readonly #animationOffsetMs = signal(0);
  #animationOrigin: number = this.#splashAnimationOrigin();
  readonly #animationResumeWindow = 500;
  #dataDogLogService = inject(DatadogLogService);
  readonly #document = inject(DOCUMENT);
  #isKiosk: Signal<boolean>;
  #fzDomain: Signal<string> = computed(() => (this.#isKiosk() ? 'Kiosk' : 'Feverzone'));
  #kioskStateService = inject(KioskStateService);
  #kioskStorageService = inject(KioskStorageService);
  #loadingInterface: Signal<string> = computed(() => (this.#isKiosk() ? 'skeleton' : 'spinner'));
  readonly #longLoadingThreshold = 30000;
  readonly #maxWarnings = 5;
  readonly #ongoingLoadingThreshold = 60000;
  #ongoingLongShowIntervalId: ReturnType<typeof setInterval> | null = null;
  #router = inject(Router);
  #showTimeoutId: ReturnType<typeof setTimeout> | null = null;
  #startTime: number | null = null;
  #userService = inject(UserService);
  #warningCount = 0;
  #lastHiddenAt: number | null = null;
  readonly animationOffsetMs = this.#animationOffsetMs.asReadonly();
  isLoading$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.#isKiosk = this.#kioskStateService.getStateProp('isKioskRoute');
  }

  hide(): void {
    if (this.#showTimeoutId !== null) {
      clearTimeout(this.#showTimeoutId);
      this.#showTimeoutId = null;
    }
    if (this.#ongoingLongShowIntervalId !== null) {
      clearInterval(this.#ongoingLongShowIntervalId);
      this.#ongoingLongShowIntervalId = null;
      this.#warningCount = 0;
    }
    if (this.isLoading$.value || this.#document.querySelector('.app-splash') !== null) {
      this.#lastHiddenAt = performance.now();
    }
    this.isLoading$.next(false);
    this.#removeSplash();
    if (this.#startTime !== null) {
      const elapsedTime: number = Date.now() - this.#startTime;
      if (elapsedTime > this.#longLoadingThreshold) {
        this.#trackLongLoadingTime(elapsedTime);
      }
      this.#startTime = null;
    }
  }

  isShowing(): boolean {
    return this.isLoading$.value || this.#showTimeoutId !== null;
  }

  show(): void {
    if (this.#showTimeoutId !== null) {
      clearTimeout(this.#showTimeoutId);
    }
    this.#startTime = Date.now();
    this.#showTimeoutId = setTimeout(() => {
      this.#showTimeoutId = null;
      if (this.isLoading$.value) {
        return;
      }
      this.#syncAnimationOffset();
      this.isLoading$.next(true);
      this.#removeSplash();
      this.#setupContinuousWarnings();
    }, 0) as ReturnType<typeof setTimeout>;
  }

  #captureSplashAnimationOrigin(): void {
    const splashLogo: Element | null = this.#document.querySelector('.app-splash-logo');
    if (!(splashLogo instanceof HTMLElement)) {
      return;
    }
    // When the splash logo's loop started, as a Date (fever-logo-loader.js).
    const start = Number(splashLogo.dataset['start']);
    if (isNaN(start) || start <= 0) {
      return;
    }
    this.#animationOrigin = performance.now() - (Date.now() - start);
  }

  #getDomain(): string {
    const serial: string | null = this.#getKioskSerial();
    if (serial !== null) {
      return `${this.#fzDomain()} (${this.#getKioskSerial()})`;
    } else {
      return this.#fzDomain();
    }
  }

  #getKioskSerial(): string | null {
    if (this.#isKiosk()) {
      return this.#kioskStorageService.getConfiguration()?.serial ?? this.#kioskStorageService.getAppParams()?.serial ?? null;
    } else {
      return null;
    }
  }

  #isKioskEmulatedInFZ(): boolean {
    return this.#router.url.includes('/kiosk/') && !this.#userService.isKioskUser();
  }

  #removeSplash(): void {
    this.#document.querySelector('.app-splash')?.remove();
  }

  #setupContinuousWarnings(): void {
    if (this.#ongoingLongShowIntervalId !== null) {
      clearInterval(this.#ongoingLongShowIntervalId);
    }
    this.#warningCount = 0;
    this.#ongoingLongShowIntervalId = setInterval(() => {
      if (this.#warningCount >= this.#maxWarnings) {
        if (this.#ongoingLongShowIntervalId !== null) {
          clearInterval(this.#ongoingLongShowIntervalId);
          this.#ongoingLongShowIntervalId = null;
        }
        return;
      }
      this.#warningCount++;
      this.#trackOngoingLoadingTime();
    }, this.#ongoingLoadingThreshold) as ReturnType<typeof setInterval>;
  }

  #splashAnimationOrigin(): number {
    return performance.getEntriesByType?.('paint')[0]?.startTime ?? 0;
  }

  #syncAnimationOffset(): void {
    if (this.#document.querySelector('.app-splash') !== null) {
      this.#captureSplashAnimationOrigin();
    }
    const now: number = performance.now();
    if (this.#lastHiddenAt !== null && now - this.#lastHiddenAt > this.#animationResumeWindow) {
      this.#animationOrigin = now;
    }
    this.#animationOffsetMs.set((this.#animationOrigin - now) % this.#animationDuration);
  }

  #trackLongLoadingTime(elapsedTime: number): void {
    if (this.#isKioskEmulatedInFZ()) return;

    const domain: string = this.#getDomain();
    const message = `Global ${this.#loadingInterface()} took ${elapsedTime / 1000} seconds on ${domain} to disappear`;
    this.#dataDogLogService.logWarn(message, { domain: domain });
  }

  #trackOngoingLoadingTime(): void {
    if (this.#isKioskEmulatedInFZ()) return;

    const domain: string = this.#getDomain();
    const message = `Global ${this.#loadingInterface()} is being displayed for longer than ${this.#warningCount} ${this.#warningCount === 1 ? 'minute' : 'minutes'} already on ${domain}`;
    this.#dataDogLogService.logWarn(message, { domain: domain });
  }
}
