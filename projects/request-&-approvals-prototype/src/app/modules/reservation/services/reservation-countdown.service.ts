import { DestroyRef, effect, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { interval, Subject } from 'rxjs';

interface CountdownTranslations {
  days: string;
  hours: string;
  minuteLabel: string;
  minutes: string;
  minutesLabel: string;
  secondLabel: string;
  secondsLabel: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationCountdownService {
  #destroyRef = inject(DestroyRef);
  #translateService = inject(TranslateService);
  #translationsCache: CountdownTranslations | null = null;

  expirationDate: WritableSignal<string | null> = signal(null);
  isExpired = signal(false);
  reservationExpired$ = new Subject<void>();
  timeLeftCountdown = signal('');
  timezone: WritableSignal<string | null> = signal(null);

  constructor() {
    this.#loadTranslations();
    this.#translateService.onLangChange.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#loadTranslations();
    });
    this.#translateService.onDefaultLangChange.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#loadTranslations();
    });

    effect(effectCleanUp => {
      const expirationDate = this.expirationDate();
      const timezone = this.timezone();

      if (!expirationDate || !timezone) {
        return;
      }

      if (this.isReservationExpired(expirationDate, timezone)) {
        this.#stopCountdown(true);
        this.reservationExpired$.next();
        return;
      }

      this.isExpired.set(false);
      this.timeLeftCountdown.set(this.formatCountdown(expirationDate, timezone));

      const subscription = interval(1000).subscribe(() => {
        const currentExpirationDate = this.expirationDate();
        const currentTimezone = this.timezone();

        if (!currentExpirationDate || !currentTimezone) {
          this.#stopCountdown(false);
          subscription.unsubscribe();
          return;
        }

        if (this.isReservationExpired(currentExpirationDate, currentTimezone)) {
          this.#stopCountdown(true);
          this.reservationExpired$.next();
          subscription.unsubscribe();
          return;
        }

        this.timeLeftCountdown.set(this.formatCountdown(currentExpirationDate, currentTimezone));
      });

      effectCleanUp(() => {
        subscription.unsubscribe();
      });
    });
  }

  formatCountdown(expirationDate: string, timezone: string): string {
    if (!expirationDate || !timezone) {
      return '';
    }

    const expirationMoment = moment.utc(expirationDate).tz(timezone);
    const now = moment().tz(timezone);

    if (expirationMoment.isBefore(now)) {
      return '';
    }

    const diff = moment.duration(expirationMoment.diff(now));
    const days = Math.floor(diff.asDays());
    const hours = diff.hours();
    const minutes = diff.minutes();
    const seconds = diff.seconds();

    if (!this.#translationsCache) {
      this.#loadTranslations();
    }

    const {
      days: daysLabel,
      hours: hoursLabel,
      minutes: minutesLabel,
      minutesLabel: minutesFullLabel,
      minuteLabel: minuteFullLabel,
      secondsLabel: secondsFullLabel,
      secondLabel: secondFullLabel,
    } = this.#translationsCache!;

    if (days > 0) {
      return `${days}${daysLabel} ${hours}${hoursLabel} ${minutes}${minutesLabel}`;
    }

    if (hours > 0) {
      return `${hours}${hoursLabel} ${minutes}${minutesLabel}`;
    }

    if (minutes > 0) {
      const minutesText = minutes === 1 ? minuteFullLabel : minutesFullLabel;
      return `${minutes} ${minutesText}`;
    }

    const secondsText = seconds === 1 ? secondFullLabel : secondsFullLabel;
    return `${seconds} ${secondsText}`;
  }

  formatExpirationDate(expirationDate: string, timezone: string): { dateTime: string; timezone: string } | null {
    if (!expirationDate || !timezone) {
      return null;
    }

    const expirationMoment = moment.utc(expirationDate).tz(timezone);
    const formattedDate = expirationMoment.format('ddd, DD MMM YYYY, h:mm A');
    const utcOffset = expirationMoment.format('Z');
    const utcOffsetFormatted = utcOffset.replace(/([+-])(\d{2}):(\d{2})/, (_, sign, hours) => {
      const hoursNum = parseInt(hours, 10);
      return `UTC${sign}${hoursNum}`;
    });

    return {
      dateTime: formattedDate,
      timezone: utcOffsetFormatted,
    };
  }

  formatExpirationDateForListing(expirationDate: string, timezone: string): { date: string; time: string } | null {
    if (!expirationDate || !timezone) {
      return null;
    }

    const expirationMoment = moment.utc(expirationDate).tz(timezone);
    return {
      date: expirationMoment.format('D MMM YYYY'),
      time: expirationMoment.format('HH:mm'),
    };
  }

  initializeCountdown(expirationDate: string, timezone: string): void {
    this.expirationDate.set(expirationDate);
    this.timezone.set(timezone);
  }

  isReservationExpired(expirationDate: string, timezone: string): boolean {
    if (!expirationDate || !timezone) {
      return false;
    }

    const expirationMoment = moment.utc(expirationDate).tz(timezone);
    const now = moment().tz(timezone);

    return expirationMoment.isBefore(now);
  }

  resetCountdown(): void {
    this.expirationDate.set(null);
    this.timezone.set(null);
    this.timeLeftCountdown.set('');
    this.isExpired.set(false);
  }

  #loadTranslations(): void {
    this.#translationsCache = {
      days: this.#translateService.instant('reservation.checkout.paymentSelector.timeLeft.days'),
      hours: this.#translateService.instant('reservation.checkout.paymentSelector.timeLeft.hours'),
      minutes: this.#translateService.instant('reservation.checkout.paymentSelector.timeLeft.minutes'),
      minutesLabel: this.#translateService.instant('reservation.checkout.paymentSelector.timeLeft.minutesLabel'),
      minuteLabel: this.#translateService.instant('reservation.checkout.paymentSelector.timeLeft.minuteLabel'),
      secondsLabel: this.#translateService.instant('reservation.checkout.paymentSelector.timeLeft.secondsLabel'),
      secondLabel: this.#translateService.instant('reservation.checkout.paymentSelector.timeLeft.secondLabel'),
    };
  }

  #stopCountdown(isExpiredValue: boolean): void {
    this.timeLeftCountdown.set('');
    this.isExpired.set(isExpiredValue);
  }
}
