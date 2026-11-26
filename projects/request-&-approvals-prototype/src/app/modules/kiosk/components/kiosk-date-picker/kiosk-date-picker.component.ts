import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { IgntDialogService } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { map, startWith } from 'rxjs';

import { KioskDatePickerModalComponent } from '../../shared/components/modals/kiosk-date-picker/kiosk-date-picker-modal.component';
import { KioskDatePickerModalData } from '../../shared/components/modals/kiosk-date-picker/kiosk-date-picker-modal.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent],
  selector: 'app-kiosk-date-picker',
  standalone: true,
  styleUrl: './kiosk-date-picker.component.scss',
  templateUrl: './kiosk-date-picker.component.html',
})
export class KioskDatePickerComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialog = inject(IgntDialogService);
  readonly #translateService = inject(TranslateService);

  readonly #displayLanguage = toSignal(
    this.#translateService.onLangChange.pipe(
      map(event => event.lang),
      startWith(this.#translateService.currentLang || this.#translateService.defaultLang || 'en'),
    ),
    { initialValue: this.#translateService.currentLang || this.#translateService.defaultLang || 'en' },
  );

  applyLabel = input('Apply');
  hasError = input(false);
  label = input('');
  maxDate = input<string | null>(null);
  minDate = input<string | null>(null);
  modalTitle = input('');
  startDate = input<string | null>(null);
  timezone = input('');

  changeDate = output<string | null>();

  #selectedDate = signal<string | null>(null);
  protected selectedDateDisplay = computed<string>(() =>
    this.#formatSelectedDate(this.#selectedDate(), this.timezone(), this.#displayLanguage()),
  );

  constructor() {
    effect(() => {
      this.#selectedDate.set(this.startDate());
    });
  }

  protected openModal(): void {
    const data: KioskDatePickerModalData = {
      applyLabel: this.applyLabel(),
      initialDate: this.#selectedDate(),
      maxDate: this.maxDate(),
      minDate: this.minDate(),
      timezone: this.timezone(),
      title: this.modalTitle().length > 0 ? this.modalTitle() : this.label(),
    };
    const dialogRef = this.#dialog.openModal<string | null, KioskDatePickerModalData>(KioskDatePickerModalComponent, {
      data,
      size: 'md',
    });
    dialogRef.closed$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(result => {
      if (result === undefined) return;
      this.#selectedDate.set(result);
      this.changeDate.emit(result);
    });
  }

  #formatSelectedDate(value: string | null, timezone: string, language: string): string {
    if (value === null || value.trim().length === 0) return '';

    const dateOnly = moment.utc(value, 'YYYY-MM-DD', true);
    if (dateOnly.isValid()) {
      return this.#formatDate(new Date(Date.UTC(dateOnly.year(), dateOnly.month(), dateOnly.date())), 'UTC', language);
    }

    const parsed = moment(value, moment.ISO_8601, true);
    if (!parsed.isValid()) return '';

    const timeZone = timezone.trim().length > 0 ? timezone : 'UTC';
    const zoned = timezone.trim().length > 0 ? parsed.clone().tz(timezone) : parsed.clone().utc();
    if (!zoned.isValid()) return '';

    return this.#formatDate(zoned.toDate(), timeZone, language);
  }

  #formatDate(date: Date, timeZone: string, language: string): string {
    return new Intl.DateTimeFormat(language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone,
    }).format(date);
  }
}
