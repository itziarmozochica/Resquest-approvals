import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { AccessTicket } from '@fz-original/app/shared/models/order/access-ticket.model';
import { CodeType } from '@fz-original/app/shared/models/order/code-type.model';
import {
  IGNT_DIALOG_DATA,
  IgntButtonComponent,
  IgntDialogCloseDirective,
  IgntDialogContentComponent,
  IgntDialogFooterComponent,
  IgntDialogHeaderComponent,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { ModifiedOrderModeEnum } from '../../models/oss-modified-order-mode.model';
import { OssModifiedOrderModalDialogData } from './oss-modified-order-modal-dialog-data.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntButtonComponent,
    IgntDialogCloseDirective,
    IgntDialogContentComponent,
    IgntDialogFooterComponent,
    IgntDialogHeaderComponent,
    IgntIconComponent,
    SharedComponentsModule,
    TranslateModule,
  ],
  selector: 'app-oss-modified-order-modal',
  styleUrl: './oss-modified-order-modal.component.scss',
  templateUrl: './oss-modified-order-modal.component.html',
})
export class OssModifiedOrderModalComponent {
  readonly #data = inject<OssModifiedOrderModalDialogData>(IGNT_DIALOG_DATA);

  protected readonly CodeType = CodeType;
  protected readonly order = this.#data.order;
  protected readonly orderNumber = computed(() => this.order()?.externalId ?? String(this.order()?.id ?? '?'));

  protected readonly tickets = computed(() => {
    const accessTickets = this.order()?.accessTickets;
    return accessTickets ? Array.from(accessTickets.values()) : [];
  });

  protected readonly showQrAndSeats = computed(() => this.#data.mode() === ModifiedOrderModeEnum.UpgradeSeating);

  protected readonly orderCart = computed(() =>
    this.#data.mode() === ModifiedOrderModeEnum.ModifyOrder ? (this.order()?.cart ?? null) : null,
  );

  protected readonly sessionsWithTickets = computed(() => {
    const list = this.tickets();
    const bySession = new Map<string, AccessTicket[]>();
    for (const t of list) {
      const name = t.sessionName ?? '';
      if (!bySession.has(name)) bySession.set(name, []);
      bySession.get(name)!.push(t);
    }
    return Array.from(bySession.entries())
      .map(([sessionName, tickets]) => ({
        sessionName,
        units: tickets.length,
        tickets,
      }))
      .filter(group => group.units > 0);
  });
}
