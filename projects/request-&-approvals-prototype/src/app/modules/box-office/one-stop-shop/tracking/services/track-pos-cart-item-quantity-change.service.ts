import { inject, Injectable } from '@angular/core';

import { TicketType } from '@fz-original/app/shared/models/ticket-type/ticket-type.model';
import { ProductSessionsSummaryService } from '@fz-original/app/shared/services/product-sessions-summary/product-sessions-summary.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';

import {
  posCartItemQuantityChange,
  type PosCartAction,
  type PosCartSource,
  type PosCartTileType,
} from '../events/pos-cart-item-quantity-change.event';

export interface TrackPosCartItemQuantityChangeOpts {
  newCount: number;
  planId: number;
  previousCount: number;
  productTypes: TicketType[];
  sessionId: number | string;
  source: PosCartSource;
  ticketTypes: TicketType[];
}

@Injectable()
export class TrackPosCartItemQuantityChangeService {
  readonly #fzTrackingService = inject(FzTrackingService);
  readonly #productSessionsSummaryService = inject(ProductSessionsSummaryService);

  track(opts: TrackPosCartItemQuantityChangeOpts): void {
    const sessionIdNum = typeof opts.sessionId === 'string' ? Number(opts.sessionId) : opts.sessionId;

    const ticketType = opts.ticketTypes.find(t => t.sessionId === sessionIdNum);
    const productType = opts.productTypes.find(p => p.sessionId === sessionIdNum);
    const productSession = !ticketType && !productType ? this.#productSessionsSummaryService.getSessionDataBySessionId(sessionIdNum) : null;

    let tileType: PosCartTileType;
    let sessiontypeId: number | null = null;
    let price: number | null = null;

    if (productType || productSession) {
      tileType = 'product';
      sessiontypeId = productType?.id ?? productSession?.session_type?.id ?? null;
      price = productType?.price?.amount ?? productSession?.price?.amount ?? null;
    } else if (ticketType?.isAddon) {
      tileType = 'add-on';
      sessiontypeId = ticketType.id ?? null;
      price = ticketType.price?.amount ?? null;
    } else {
      tileType = 'ticket';
      sessiontypeId = ticketType?.id ?? null;
      price = ticketType?.price?.amount ?? null;
    }

    const action: PosCartAction = opts.newCount > opts.previousCount ? 'add_item' : 'remove_item';
    const quantity = Math.abs(opts.newCount - opts.previousCount);

    this.#fzTrackingService.track(
      posCartItemQuantityChange({
        action,
        planId: opts.planId,
        price,
        quantity,
        sessiontypeId,
        source: opts.source,
        tileType,
      }),
    );
  }
}
