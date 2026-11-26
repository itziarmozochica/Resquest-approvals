import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TransferIntent } from '@fz-original/app/shared/models/cart/transfer-intent.model';
import { AccessTicketWithCode } from '@fz-original/app/shared/models/order/access-ticket.model';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogContentComponent, IgntDialogHeaderComponent, IgntDialogRef } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { TicketDetailComponent } from '../ticket-detail/ticket-detail.component';

export interface TicketDetailSidePanelData {
  isEntryPass: boolean;
  orderId: number | null;
  sessionTimezone: string | null;
  ticket: AccessTicketWithCode;
  ticketIndex: number | null;
  transferIntent: TransferIntent | null;
  onTicketUpdated: () => void;
}

export type TicketDetailSidePanelResult = 'updated';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntDialogContentComponent, IgntDialogHeaderComponent, TicketDetailComponent, TranslateModule],
  selector: 'app-ticket-detail-side-panel',
  standalone: true,
  templateUrl: './ticket-detail-side-panel.component.html',
})
export class TicketDetailSidePanelComponent {
  readonly #data = inject<TicketDetailSidePanelData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<TicketDetailSidePanelResult>>(IGNT_DIALOG_REF);

  protected readonly isEntryPass = this.#data.isEntryPass;
  protected readonly orderId = this.#data.orderId;
  protected readonly sessionTimezone = this.#data.sessionTimezone;
  protected readonly ticket = this.#data.ticket;
  protected readonly ticketIndex = this.#data.ticketIndex;
  protected readonly transferIntent = this.#data.transferIntent;

  protected onTicketUpdated(): void {
    this.#data.onTicketUpdated();
    this.#dialogRef.close('updated');
  }
}
