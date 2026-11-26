import { Component, inject, Input, OnInit } from '@angular/core';

import { Order } from '@fz-original/app/shared/models/order/order.model';
import { environment } from '@fz-original/environments/environment';

import { QrGeneratorService } from '../../services/qr-generator/qr-generator.service';

/**
 * Currently not getting used.
 *
 * @todo ask inmajp26
 */
@Component({
  selector: 'app-ticket-qr',
  standalone: false,
  templateUrl: './ticket-qr.component.html',
  styleUrls: ['./ticket-qr.component.scss'],
})
export class TicketQRComponent implements OnInit {
  #qrGeneratorService = inject(QrGeneratorService);
  code = '';
  @Input({ required: true }) order!: Order;
  @Input({ required: true }) partnerId!: number;

  generateUrl(order: Order): string {
    const data = 'external_order_id=' + order.externalId + '&created_at=' + order.createdAt;
    return `${environment.baseUrl}/download-qr-ticket/?partnerId=${this.partnerId}&data=` + btoa(data);
  }

  ngOnInit(): void {
    this.#qrGeneratorService.generateQr(this.generateUrl(this.order)).then((data: string) => (this.code = data));
  }
}
