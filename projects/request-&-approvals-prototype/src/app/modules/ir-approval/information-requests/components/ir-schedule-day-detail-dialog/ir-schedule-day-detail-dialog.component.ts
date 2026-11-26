import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { currencySymbol, DayDetail } from '../../models/event-schedule-composer-v1.helpers';

/**
 * Read-only modal showing everything configured for one calendar day: its sessions and, per product,
 * the demand price type (Standard/Peak/Valley) and the price that applies. Purely presentational.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close.emit()' },
  imports: [TranslateModule],
  selector: 'app-ir-schedule-day-detail-dialog',
  standalone: true,
  styleUrls: ['./ir-schedule-day-detail-dialog.component.scss'],
  templateUrl: './ir-schedule-day-detail-dialog.component.html',
})
export class IrScheduleDayDetailDialogComponent {
  readonly detail = input.required<DayDetail>();
  readonly close = output<void>();

  /** Formats a raw product price with the day's currency, or a dash when no price is set. */
  priceLabel(price: string): string {
    const value = String(price ?? '').trim();
    return value ? `${currencySymbol(this.detail().currency)}${value}` : '—';
  }
}
