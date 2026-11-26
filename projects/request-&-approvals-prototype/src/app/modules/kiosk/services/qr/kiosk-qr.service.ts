import { Injectable } from '@angular/core';

import QRCode from 'qrcode';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { Order } from './../../../../shared/models/order/order.model';
import { QRData } from './kiosk-qr.model';
import { QRService } from './qr';

@Injectable({
  providedIn: 'root',
})
export class KioskQRService implements QRService {
  generateQr(data: QRData): Observable<string> {
    const { order, partnerId, onsiteSetupId } = data;
    const url = this.#generateQrUrl(order, partnerId, onsiteSetupId);

    return from(QRCode.toDataURL(url)).pipe(map((qrCode: string) => qrCode));
  }

  #generateQrUrl(order: Order, partnerId: number, onsiteSetupId?: string): string {
    const data = 'external_order_id=' + order.externalId + '&created_at=' + order.createdAt + '&cart_id=' + (order.cart?.id ?? '');
    const params = new URLSearchParams({ partnerId: String(partnerId), data: btoa(data) });
    if (onsiteSetupId !== undefined) {
      params.set('onsiteSetupId', onsiteSetupId);
    }
    return `${environment.baseUrl}/download-qr-ticket/?${params.toString()}`;
  }
}
