import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import {
  activeNamedRangeForYmd,
  buildDayDetail,
  currencySymbol,
  DayDetail,
  effectiveIncludedYmds,
  namedRangeComplete,
  namedRangeIndexForYmd,
  priceForProductTier,
  sessionWindowsForYmd,
  ticketProductsForComposerDay,
  tiersForDay,
  timesForYmd,
} from '../../models/event-schedule-composer-v1.helpers';
import { EventScheduleComposerStateV1, ProductRow, ScheduleDemandTier } from '../../models/event-schedule-composer-v1.model';
import { IrScheduleDayDetailDialogComponent } from '../ir-schedule-day-detail-dialog/ir-schedule-day-detail-dialog.component';

interface DayTierLine {
  name: string;
  price: string;
  tier: string;
}

interface CalendarCell {
  bandIndex: number;
  bandName: string;
  day: number;
  doorsOpen: string;
  inMonth: boolean;
  open: boolean;
  sessions: string[];
  showEnd: string;
  showStart: string;
  tiers: DayTierLine[];
  ymd: string;
}

const MS_PER_DAY = 86_400_000;

/**
 * Read-only ("overview") calendar that renders a configured event schedule: per-day band colour,
 * doors/show times, session windows and per-product demand tiers. Driven entirely by the V1 helpers.
 * The editable drag-select calendar used while building a band lives in the wizard (later phase).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IrScheduleDayDetailDialogComponent],
  selector: 'app-ir-schedule-bulk-calendar',
  standalone: true,
  styleUrls: ['./ir-schedule-bulk-calendar.component.scss'],
  templateUrl: './ir-schedule-bulk-calendar.component.html',
})
export class IrScheduleBulkCalendarComponent {
  readonly composer = input.required<EventScheduleComposerStateV1>();
  readonly globalProducts = input<ProductRow[]>([]);
  readonly currency = input<string>('');

  /** Months to shift from the schedule's first included day (0 = the anchor month). */
  readonly monthOffset = signal<number>(0);

  /** YYYY-MM-DD of the day whose detail modal is open, or null. */
  readonly selectedYmd = signal<string | null>(null);

  readonly weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  readonly selectedDetail = computed<DayDetail | null>(() => {
    const ymd = this.selectedYmd();
    return ymd ? buildDayDetail(this.composer(), ymd, this.globalProducts(), this.currency()) : null;
  });

  private readonly anchor = computed<{ month: number; year: number }>(() => {
    const first = effectiveIncludedYmds(this.composer())[0];
    if (first) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(first);
      if (m) return { month: Number(m[2]) - 1, year: Number(m[1]) };
    }
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });

  private readonly view = computed<{ month: number; year: number }>(() => {
    const base = new Date(Date.UTC(this.anchor().year, this.anchor().month + this.monthOffset(), 1));
    return { month: base.getUTCMonth(), year: base.getUTCFullYear() };
  });

  readonly monthLabel = computed<string>(() => {
    const v = this.view();
    return new Date(Date.UTC(v.year, v.month, 1)).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC', year: 'numeric' });
  });

  readonly weeks = computed<CalendarCell[][]>(() => {
    const composer = this.composer();
    const products = this.globalProducts();
    const { month, year } = this.view();
    const firstOfMonth = new Date(Date.UTC(year, month, 1));
    const lead = (firstOfMonth.getUTCDay() + 6) % 7; // days since Monday
    const gridStart = Date.UTC(year, month, 1 - lead);
    const weeks: CalendarCell[][] = [];
    for (let w = 0; w < 6; w++) {
      const row: CalendarCell[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(gridStart + (w * 7 + d) * MS_PER_DAY);
        const ymd = this.#fmt(cellDate);
        row.push(this.#buildCell(ymd, cellDate.getUTCDate(), cellDate.getUTCMonth() === month, composer, products));
      }
      weeks.push(row);
    }
    return weeks;
  });

  nextMonth(): void {
    this.monthOffset.update(o => o + 1);
  }

  prevMonth(): void {
    this.monthOffset.update(o => o - 1);
  }

  openDay(ymd: string): void {
    this.selectedYmd.set(ymd);
  }

  closeDay(): void {
    this.selectedYmd.set(null);
  }

  #buildCell(ymd: string, day: number, inMonth: boolean, composer: EventScheduleComposerStateV1, products: ProductRow[]): CalendarCell {
    const active = activeNamedRangeForYmd(composer, ymd);
    // Only populate a day once its whole date range is 100% configured; legacy (no bands) keeps prior behaviour.
    const open =
      (active != null && namedRangeComplete(active, products)) ||
      (!composer.namedDateRanges?.length && effectiveIncludedYmds(composer).includes(ymd));
    const cell: CalendarCell = {
      bandIndex: -1,
      bandName: '',
      day,
      doorsOpen: '',
      inMonth,
      open,
      sessions: [],
      showEnd: '',
      showStart: '',
      tiers: [],
      ymd,
    };
    if (!open) return cell;
    cell.bandIndex = namedRangeIndexForYmd(composer, ymd);
    cell.bandName = active?.name?.trim() ?? '';
    const times = timesForYmd(composer, ymd);
    cell.doorsOpen = times.doorsOpen;
    cell.showStart = times.showStart;
    cell.showEnd = times.showEnd;
    cell.sessions = sessionWindowsForYmd(composer, ymd).map(s => `${s.start}-${s.end}`);
    const dayProducts = ticketProductsForComposerDay(composer, ymd, products);
    const tierMap = tiersForDay(
      ymd,
      composer,
      dayProducts.map(p => p.id),
    );
    const currency = currencySymbol(this.currency());
    cell.tiers = dayProducts
      .filter(p => tierMap[p.id] !== 'Closed')
      .map(p => {
        const tier = (tierMap[p.id] || 'Standard') as ScheduleDemandTier;
        const rawPrice = priceForProductTier(p, tier);
        return { name: p.name, price: rawPrice ? `${currency}${rawPrice}` : '', tier };
      });
    return cell;
  }

  #fmt(d: Date): string {
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const da = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  }
}
