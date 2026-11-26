import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { eachDayInclusiveYmd } from '../../models/event-schedule-composer-v1.helpers';
import { NamedDateRangeV1 } from '../../models/event-schedule-composer-v1.model';
import { IrDateRangeCalendarComponent } from '../ir-date-range-calendar/ir-date-range-calendar.component';

interface SegmentRow {
  end: string;
  start: string;
}

/**
 * Identity step of the event-schedule band wizard: band name, one or more date-range segments
 * (union of periods), and excluded ("closed") date ranges inside those periods. Periods and
 * exclusions are both row-based and commit live (no separate confirm step); emits a new band on edit.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IrDateRangeCalendarComponent],
  selector: 'app-ir-schedule-wizard-step-identity',
  standalone: true,
  styleUrls: ['./ir-schedule-wizard-step-identity.component.scss'],
  templateUrl: './ir-schedule-wizard-step-identity.component.html',
})
export class IrScheduleWizardStepIdentityComponent {
  readonly band = input.required<NamedDateRangeV1>();
  readonly validationAttempted = input<boolean>(false);
  readonly otherBandsUsedYmds = input<readonly string[]>([]);
  readonly bandChange = output<NamedDateRangeV1>();

  readonly minDate: string = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  readonly segments = computed<SegmentRow[]>(() => {
    const rawRows = this.band().rangeSegments;
    if (Array.isArray(rawRows) && rawRows.length) {
      return rawRows.map(row => ({ end: String(row.end ?? ''), start: String(row.start ?? '') }));
    }
    if (this.band().rangeStart || this.band().rangeEnd) {
      return [{ end: this.band().rangeEnd ?? '', start: this.band().rangeStart ?? '' }];
    }
    return [{ end: '', start: '' }];
  });

  /** Excluded ranges as raw editor rows; falls back to collapsing legacy flat `excludedDates`. */
  readonly excludedRanges = computed<SegmentRow[]>(() => {
    const rawRows = this.band().excludedRanges;
    if (Array.isArray(rawRows)) {
      return rawRows.map(row => ({ end: String(row.end ?? ''), start: String(row.start ?? '') }));
    }
    const dates = this.band().excludedDates ?? [];
    return dates.length ? this.#collapseDatesIntoRanges(dates) : [];
  });

  readonly ownPeriodYmds = computed<string[]>(() =>
    this.segments()
      .filter(row => row.start.trim() && row.end.trim())
      .flatMap(row => eachDayInclusiveYmd(row.start, row.end)),
  );

  readonly excludedDays = computed<string[]>(() =>
    this.excludedRanges()
      .filter(row => row.start.trim() && row.end.trim())
      .flatMap(row => eachDayInclusiveYmd(row.start, row.end)),
  );

  readonly usedYmds = computed<string[]>(() => {
    const excluded = new Set(this.excludedDays());
    return [...this.ownPeriodYmds().filter(ymd => !excluded.has(ymd)), ...this.otherBandsUsedYmds()];
  });

  readonly showExclusionCalendar = signal(false);

  revealExclusionCalendar(): void {
    this.showExclusionCalendar.set(true);
  }

  addSegment(): void {
    this.#emitSegments([...this.segments(), { end: '', start: '' }]);
  }

  addSegmentFromRange(range: { start: string; end: string }): void {
    const real = this.segments().filter(row => row.start.trim() && row.end.trim());
    this.#emitSegments([...real, { end: range.end, start: range.start }]);
  }

  patchSegment(index: number, field: 'start' | 'end', value: string): void {
    const rows = this.segments().map((row, i) => (i === index ? { ...row, [field]: value } : row));
    this.#emitSegments(rows);
  }

  removeSegment(index: number): void {
    const rows = this.segments().filter((_, i) => i !== index);
    this.#emitSegments(rows.length ? rows : [{ end: '', start: '' }]);
  }

  addExcludedRangeFromCalendar(range: { start: string; end: string }): void {
    const real = this.excludedRanges().filter(row => row.start.trim() && row.end.trim());
    this.#emitExcluded([...real, { end: range.end, start: range.start }]);
  }

  removeExcludedRange(index: number): void {
    this.#emitExcluded(this.excludedRanges().filter((_, i) => i !== index));
  }

  /** A single-day exclusion is a range whose start and end are the same day. */
  isSingleDay(range: SegmentRow): boolean {
    return !!range.start.trim() && range.start === range.end;
  }

  setName(name: string): void {
    this.#emit({ ...this.band(), name });
  }

  segmentInvalid(segment: SegmentRow): boolean {
    if (!this.validationAttempted()) return false;
    const hasCompleteSegment = this.segments().some(row => row.start.trim() && row.end.trim());
    return (!segment.start.trim() && !segment.end.trim() && !hasCompleteSegment) || !!segment.start.trim() !== !!segment.end.trim();
  }

  nameInvalid(): boolean {
    return this.validationAttempted() && !this.band().name?.trim();
  }

  #emit(band: NamedDateRangeV1): void {
    this.bandChange.emit(band);
  }

  #emitSegments(rows: SegmentRow[]): void {
    const complete = rows.filter(r => r.start && r.end);
    let lo = '';
    let hi = '';
    for (const r of complete) {
      const start = r.start <= r.end ? r.start : r.end;
      const end = r.start <= r.end ? r.end : r.start;
      if (!lo || start < lo) lo = start;
      if (!hi || end > hi) hi = end;
    }
    this.#emit({ ...this.band(), rangeEnd: hi, rangeSegments: rows, rangeStart: lo });
  }

  /** Persist raw excluded rows on the band and expand the complete ones into the flat `excludedDates`. */
  #emitExcluded(rows: SegmentRow[]): void {
    const dates = new Set<string>();
    for (const row of rows) {
      const start = row.start.trim();
      const end = row.end.trim();
      if (start && end) for (const ymd of eachDayInclusiveYmd(start, end)) dates.add(ymd);
    }
    this.#emit({ ...this.band(), excludedDates: [...dates].sort(), excludedRanges: rows });
  }

  #collapseDatesIntoRanges(dates: string[]): SegmentRow[] {
    const sorted = [...new Set(dates.map(d => d.trim()).filter(Boolean))].sort();
    const rows: SegmentRow[] = [];
    let start = '';
    let end = '';
    for (const date of sorted) {
      if (end && this.#nextYmd(end) === date) {
        end = date;
      } else {
        if (start) rows.push({ end, start });
        start = date;
        end = date;
      }
    }
    if (start) rows.push({ end, start });
    return rows;
  }

  #nextYmd(date: string): string | null {
    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) return null;
    const next = new Date(year, month - 1, day + 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  }
}
