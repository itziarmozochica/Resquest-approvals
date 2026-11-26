import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { TransferIntent } from '../../../../../models/cart/transfer-intent.model';
import { TicketHistoryItem } from './ticket-history-item';
import { TicketHistoryItemComponent } from './ticket-history-item/ticket-history-item.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TicketHistoryItemComponent],
  selector: 'app-ticket-history',
  standalone: true,
  styleUrl: './ticket-history.component.scss',
  templateUrl: './ticket-history.component.html',
})
export class TicketHistoryComponent {
  history = input.required<TicketHistoryItem[]>();
  sessionTimezone = input<string | null>(null);
  transferIntent = input<TransferIntent | null>(null);

  ticketUpdated = output<void>();
}
