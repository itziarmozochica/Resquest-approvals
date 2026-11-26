import { getCurrencySymbol } from '@angular/common';
import { AfterViewInit, Component, EventEmitter, inject, Input, Output } from '@angular/core';

import { CashDrawerOpenMessage } from '@fz-original/app/shared/services/webview-messenger/models/cash-drawer-open-message';
import { WebviewMessengerService } from '@fz-original/app/shared/services/webview-messenger/webview-messenger.service';

import { trackById } from '../../../../../../shared/utils/track-by';
import { maxShiftCashAmount } from '../../../models/start-shift-query';

export type EndShiftModalResponse = { closeFiscalDay: boolean; finalAmount: number } | null;

@Component({
  selector: 'app-end-shift-modal',
  standalone: false,
  styleUrls: ['./end-shift-modal.component.scss'],
  templateUrl: './end-shift-modal.component.html',
})
export class EndShiftModalComponent implements AfterViewInit {
  #webviewMessenger = inject(WebviewMessengerService);

  cancel(): void {
    this.response.emit(null);
  }
  @Input() shouldShowCashManagement = true;
  @Input() showCloseFiscalDayOption = false;
  @Output() response = new EventEmitter<EndShiftModalResponse>();

  closeFiscalDay = false;
  currencySymbol: string | null = null;
  inputCurrency = '';
  finalAmount = 0;
  maxCashAmount = maxShiftCashAmount;
  trackCashByFn = trackById;

  @Input() set currency(value: string) {
    this.inputCurrency = value;
    this.currencySymbol = this.inputCurrency ? getCurrencySymbol(this.inputCurrency, 'narrow') : null;
  }

  end(): void {
    this.response.emit({
      closeFiscalDay: this.closeFiscalDay,
      finalAmount: this.finalAmount ?? 0,
    });
  }

  handleEnterKey(event: KeyboardEvent): void {
    event.preventDefault();
    this.end();
  }

  ngAfterViewInit() {
    this.#webviewMessenger.sendWebViewMessage(new CashDrawerOpenMessage());
  }
}
