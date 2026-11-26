import { Injectable } from '@angular/core';

import { Order } from '@fz-original/app/shared/models/order/order.model';

@Injectable({
  providedIn: 'root',
})
export class GiftAidDetectionService {
  static readonly explodePipeSeparator = '|';
  static readonly giftAidCategory = 'gift aid';

  detectGiftAidNeeded(order: Order): boolean {
    if (order.cart === undefined || order.cart.sessionItemsByDatetime.size === 0) {
      return false;
    }
    for (const cartSessions of order.cart.sessionItemsByDatetime.values()) {
      for (const cartSession of cartSessions) {
        if (this.#isGiftAidSession(cartSession.sessionName)) {
          return true;
        }
      }
    }

    return false;
  }

  #isGiftAidSession(sessionName?: string): boolean {
    if (sessionName === undefined || sessionName.length === 0) {
      return false;
    }
    const parts: string[] = sessionName.split(GiftAidDetectionService.explodePipeSeparator).filter(part => part);
    if (parts.length < 2) {
      return false;
    }
    const category: string = parts[0].trim().toLowerCase();

    return category === GiftAidDetectionService.giftAidCategory;
  }
}
