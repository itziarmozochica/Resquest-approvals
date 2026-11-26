import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntButtonComponent, IgntDialogModule, IgntDialogRef } from '@ignite/common';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntNativeDateInputComponent } from '@ignite/legacy/components/ignt-native-date-input/ignt-native-date-input.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';

import {
  addVenueDays,
  isSameServingInstant,
  servingInstantToDisplayDate,
  servingInstantToVenueDate,
  servingInstantToVenueTime,
  venueDateOffset,
  venueDateTimeToServingInstant,
} from '../../utils/serving-time.util';
import { ProductRow } from './service-time-modal.model';

export interface ServiceTimeProduct {
  name: string;
  servingAt: string | null;
  sessionId: number;
  timezone: string;
  units: number;
}

export interface ServiceTimeChange {
  servingAt: string | null;
  sessionId: number;
}

export interface ServiceTimeDialogData {
  anchorDate: string | null;
  products: ServiceTimeProduct[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IgntButtonComponent,
    IgntCheckboxComponent,
    IgntDialogModule,
    IgntIconButtonComponent,
    IgntInputFieldComponent,
    IgntNativeDateInputComponent,
    IgntTagComponent,
    TranslateModule,
  ],
  selector: 'app-service-time-modal',
  standalone: true,
  styleUrl: './service-time-modal.component.scss',
  templateUrl: './service-time-modal.component.html',
})
export class ServiceTimeModalComponent {
  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<ServiceTimeChange[]>;
  readonly #data = inject<ServiceTimeDialogData>(IGNT_DIALOG_DATA);

  protected readonly orderDate = servingInstantToDisplayDate(this.#data.anchorDate, this.#data.products[0]?.timezone ?? 'UTC');
  readonly #day = this.#initialDay();
  readonly #rows = signal<ProductRow[]>(
    this.#data.products.map(product => ({
      ...product,
      dayOffset: this.#initialDayOffset(product),
      time: servingInstantToVenueTime(product.servingAt, product.timezone),
    })),
  );
  protected readonly rows = this.#rows.asReadonly();
  readonly #selectedSessionIds = signal<ReadonlySet<number>>(new Set());
  protected readonly selectedSessionIds = this.#selectedSessionIds.asReadonly();
  readonly #bulkTime = signal<string>('');
  protected readonly bulkTime = this.#bulkTime.asReadonly();
  readonly #editingSessionId = signal<number | null>(null);
  protected readonly editingSessionId = this.#editingSessionId.asReadonly();
  readonly #selectedDay = signal<string>(this.#day);
  protected readonly day = this.#selectedDay.asReadonly();

  protected readonly allSelected = computed(() => {
    const rows = this.rows();
    return rows.length > 0 && rows.every(row => this.selectedSessionIds().has(row.sessionId));
  });

  protected readonly hasSelection = computed(() => this.selectedSessionIds().size > 0);

  protected applyBulkTime(): void {
    const time = this.bulkTime().trim();
    if (!time) {
      return;
    }
    const selected = this.selectedSessionIds();
    this.#rows.set(this.rows().map(row => (selected.has(row.sessionId) ? { ...row, dayOffset: 0, time } : row)));
  }

  protected cancel(): void {
    this.#dialogRef.close();
  }

  protected clearRowTime(row: ProductRow): void {
    this.#patchRow(row.sessionId, { dayOffset: 0, time: '' });
  }

  protected dayOffsetLabel(row: ProductRow): string {
    if (row.dayOffset === 0) {
      return '';
    }
    return row.dayOffset > 0 ? ` (+${row.dayOffset})` : ` (${row.dayOffset})`;
  }

  protected isEditing(row: ProductRow): boolean {
    return this.editingSessionId() === row.sessionId;
  }

  protected isNextDay(row: ProductRow): boolean {
    return row.dayOffset > 0;
  }

  protected isSelected(row: ProductRow): boolean {
    return this.selectedSessionIds().has(row.sessionId);
  }

  protected save(): void {
    this.#dialogRef.close(this.#buildChanges());
  }

  protected setBulkTime(time: string): void {
    this.#bulkTime.set(time);
  }

  protected setDay(day: string): void {
    this.#selectedDay.set(day);
  }

  protected setRowNextDay(row: ProductRow, nextDay: boolean): void {
    this.#patchRow(row.sessionId, { dayOffset: nextDay ? 1 : 0 });
  }

  protected setRowTime(row: ProductRow, time: string): void {
    this.#patchRow(row.sessionId, { time });
  }

  protected startEditing(row: ProductRow): void {
    this.#editingSessionId.set(this.editingSessionId() === row.sessionId ? null : row.sessionId);
  }

  protected toggleSelectAll(checked: boolean): void {
    this.#selectedSessionIds.set(checked ? new Set(this.rows().map(row => row.sessionId)) : new Set());
  }

  protected toggleSelection(row: ProductRow, checked: boolean): void {
    const next = new Set(this.selectedSessionIds());
    if (checked) {
      next.add(row.sessionId);
    } else {
      next.delete(row.sessionId);
    }
    this.#selectedSessionIds.set(next);
  }

  #buildChanges(): ServiceTimeChange[] {
    return this.rows()
      .filter(row => !row.time || this.#venueDateFor(row) !== '')
      .map(row => ({
        previous: row.servingAt,
        servingAt: venueDateTimeToServingInstant(this.#venueDateFor(row), row.time, row.timezone),
        sessionId: row.sessionId,
      }))
      .filter(change => !isSameServingInstant(change.servingAt, change.previous))
      .map(({ servingAt, sessionId }) => ({ servingAt, sessionId }));
  }

  #initialDay(): string {
    const timezone = this.#data.products[0]?.timezone ?? 'UTC';
    const anchorDay = servingInstantToVenueDate(this.#data.anchorDate, timezone);
    if (anchorDay) {
      return anchorDay;
    }
    const recordedDays = this.#data.products
      .map(product => servingInstantToVenueDate(product.servingAt, product.timezone))
      .filter(day => day !== '')
      .sort();
    return recordedDays[0] ?? '';
  }

  #initialDayOffset(product: ServiceTimeProduct): number {
    const recorded = servingInstantToVenueDate(product.servingAt, product.timezone);
    return recorded === '' ? 0 : venueDateOffset(recorded, this.#day);
  }

  #patchRow(sessionId: number, patch: Partial<ProductRow>): void {
    this.#rows.set(this.rows().map(row => (row.sessionId === sessionId ? { ...row, ...patch } : row)));
  }

  #venueDateFor(row: ProductRow): string {
    return addVenueDays(this.day() || this.#day, row.dayOffset);
  }
}
