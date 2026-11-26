import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

const MS_PER_DAY = 86_400_000;

interface DayCell {
  ymd: string;
  day: number;
  inMonth: boolean;
  disabled: boolean;
  isStart: boolean;
  selected: boolean;
  allowed: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-ir-date-range-calendar',
  standalone: true,
  styleUrls: ['./ir-date-range-calendar.component.scss'],
  templateUrl: './ir-date-range-calendar.component.html',
})
export class IrDateRangeCalendarComponent {
  readonly minYmd = input<string>('');
  readonly disabledYmds = input<readonly string[]>([]);
  readonly allowedYmds = input<readonly string[]>([]);
  readonly selectedYmds = input<readonly string[]>([]);

  readonly rangeSelected = output<{ start: string; end: string }>();

  readonly pendingStart = signal<string | null>(null);
  readonly #viewOverride = signal<{ month: number; year: number } | null>(null);

  readonly weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  readonly #disabledSet = computed<Set<string>>(() => new Set(this.disabledYmds()));
  readonly #allowedSet = computed<Set<string>>(() => new Set(this.allowedYmds()));
  readonly #selectedSet = computed<Set<string>>(() => new Set(this.selectedYmds()));
  readonly hasAllowList = computed<boolean>(() => this.#allowedSet().size > 0);

  readonly #anchor = computed<{ month: number; year: number }>(() => {
    const candidates = [...this.selectedYmds(), ...this.allowedYmds()].filter(v => /^\d{4}-\d{2}-\d{2}$/.test(v)).sort();
    const anchorYmd = candidates[0] ?? this.minYmd();
    const match = anchorYmd ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchorYmd) : null;
    if (match) {
      return { month: Number(match[2]) - 1, year: Number(match[1]) };
    }
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });

  readonly #view = computed<{ month: number; year: number }>(() => this.#viewOverride() ?? this.#anchor());

  readonly monthLabel = computed<string>(() => {
    const view = this.#view();
    return new Date(Date.UTC(view.year, view.month, 1)).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC', year: 'numeric' });
  });

  readonly weeks = computed<DayCell[][]>(() => {
    const { month, year } = this.#view();
    const disabled = this.#disabledSet();
    const allowed = this.#allowedSet();
    const selected = this.#selectedSet();
    const hasAllowList = allowed.size > 0;
    const min = this.minYmd();
    const start = this.pendingStart();
    const firstOfMonth = new Date(Date.UTC(year, month, 1));
    const lead = (firstOfMonth.getUTCDay() + 6) % 7;
    const gridStart = Date.UTC(year, month, 1 - lead);
    const weeks: DayCell[][] = [];
    for (let w = 0; w < 6; w++) {
      const row: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(gridStart + (w * 7 + d) * MS_PER_DAY);
        const ymd = this.#fmt(cellDate);
        const inMonth = cellDate.getUTCMonth() === month;
        const isPast = min !== '' && ymd < min;
        const isDisabled = !inMonth || isPast || disabled.has(ymd) || (hasAllowList && !allowed.has(ymd));
        row.push({
          ymd,
          day: cellDate.getUTCDate(),
          inMonth,
          disabled: isDisabled,
          isStart: start !== null && ymd === start,
          selected: inMonth && selected.has(ymd),
          allowed: inMonth && hasAllowList && allowed.has(ymd) && !isDisabled,
        });
      }
      weeks.push(row);
    }
    return weeks;
  });

  nextMonth(): void {
    this.#viewOverride.set(this.#shiftView(1));
  }

  prevMonth(): void {
    this.#viewOverride.set(this.#shiftView(-1));
  }

  #shiftView(delta: number): { month: number; year: number } {
    const view = this.#view();
    const base = new Date(Date.UTC(view.year, view.month + delta, 1));
    return { month: base.getUTCMonth(), year: base.getUTCFullYear() };
  }

  pick(cell: DayCell): void {
    if (cell.disabled) {
      return;
    }
    const pending = this.pendingStart();
    if (pending === null || cell.ymd < pending) {
      this.pendingStart.set(cell.ymd);
      return;
    }
    if (this.#rangeHasDisabled(pending, cell.ymd)) {
      this.pendingStart.set(cell.ymd);
      return;
    }
    this.pendingStart.set(null);
    this.rangeSelected.emit({ start: pending, end: cell.ymd });
  }

  #rangeHasDisabled(startYmd: string, endYmd: string): boolean {
    const disabled = this.#disabledSet();
    const allowed = this.#allowedSet();
    const hasAllowList = allowed.size > 0;
    const min = this.minYmd();
    let cursor = this.#parse(startYmd);
    const end = this.#parse(endYmd);
    while (cursor <= end) {
      const ymd = this.#fmt(new Date(cursor));
      if ((min !== '' && ymd < min) || disabled.has(ymd) || (hasAllowList && !allowed.has(ymd))) {
        return true;
      }
      cursor += MS_PER_DAY;
    }
    return false;
  }

  #parse(ymd: string): number {
    const [y, m, d] = ymd.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  }

  #fmt(date: Date): string {
    const y = date.getUTCFullYear();
    const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
    const da = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  }
}
