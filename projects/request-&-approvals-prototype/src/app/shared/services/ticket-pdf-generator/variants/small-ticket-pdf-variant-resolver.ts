import { inject, Injectable } from '@angular/core';

import { PrinterOrder } from '../../../models/order/printer-order.model';
import { PIC_NIC_PARTNER_ID } from '../../partner/partner.service';
import { DefaultSmallTicketPdfVariant } from './default-small-ticket-pdf-variant';
import { PRIMAVERA_SOUND_PORTO_2026_PLAN_IDS, PrimaveraSmallTicketPdfVariant } from './primavera-small-ticket-pdf-variant';
import { SmallTicketPdfVariant } from './small-ticket-pdf-variant';

@Injectable({
  providedIn: 'root',
})
export class SmallTicketPdfVariantResolver {
  readonly #defaultVariant = inject(DefaultSmallTicketPdfVariant);
  readonly #primaveraVariant = inject(PrimaveraSmallTicketPdfVariant);

  resolve(partnerId: number, order: PrinterOrder): SmallTicketPdfVariant {
    if (partnerId === PIC_NIC_PARTNER_ID && PRIMAVERA_SOUND_PORTO_2026_PLAN_IDS.includes(order.plan.id)) {
      return this.#primaveraVariant;
    }
    return this.#defaultVariant;
  }
}
