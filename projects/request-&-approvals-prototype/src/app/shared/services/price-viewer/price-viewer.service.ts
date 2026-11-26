import { Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { OnsiteSetup, PriceViewerEnum } from '../.../../../../../app/modules/box-office/shared/models/onsite-setup';
import { TicketType } from '../../models/ticket-type/ticket-type.model';
import { fixedDecimals } from '../../utils/number.util';
import { BixolonBdc2000PrinterService } from './bixolon-bdc-2000/bixolon-bdc-2000-printer.service';
import { PriceViewerStatus } from './models/price-viewer-status.model';

@Injectable({
  providedIn: 'root',
})
export class PriceViewerPrinterServiceManager {
  constructor(
    private translateService: TranslateService,
    private viewer: BixolonBdc2000PrinterService,
  ) {}

  clear(onsiteSetup: OnsiteSetup): void {
    if (!this.shouldUsePriceViewer(onsiteSetup)) {
      return;
    }

    this.viewer.clear();
  }

  connect(force: boolean = false): Observable<PriceViewerStatus> {
    return this.viewer.connect(force);
  }

  lastStatus(): PriceViewerStatus {
    return this.viewer.lastStatus();
  }

  showItem(onsiteSetup: OnsiteSetup, ticketType: TicketType, currency: string, quantity: number, amount: number): void {
    if (!this.shouldUsePriceViewer(onsiteSetup)) {
      return;
    }

    let label: string | undefined = ticketType.ticketReceiptLabel ? ticketType.ticketReceiptLabel : ticketType.getDisplayName(false);
    const clean_label: string | undefined = label?.split('|').pop() ?? label;

    label = `${quantity} x ` + clean_label;

    this.show(label, currency, fixedDecimals(amount * quantity, 2).toString());
  }

  showTotal(onsiteSetup: OnsiteSetup, currency: string, total: number): void {
    if (!this.shouldUsePriceViewer(onsiteSetup)) {
      return;
    }

    this.show(this.translateService.instant('boxOffice.cart.total').toUpperCase(), currency, fixedDecimals(total, 2).toString());
  }

  status(): Observable<PriceViewerStatus> {
    return this.viewer.status();
  }

  private show(label: string, currency: string, amount: string): void {
    this.viewer.print(label, amount, currency);
  }

  private shouldUsePriceViewer(onsiteSetup?: OnsiteSetup): boolean {
    return onsiteSetup?.price_viewer === PriceViewerEnum.bixolodon_bdc_2000;
  }
}
