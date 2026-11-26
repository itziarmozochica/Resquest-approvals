import { getCurrencySymbol } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';

import { CashDrawerOpenMessage } from '@fz-original/app/shared/services/webview-messenger/models/cash-drawer-open-message';
import { WebviewMessengerService } from '@fz-original/app/shared/services/webview-messenger/webview-messenger.service';

import { SelectOption } from '../../../../../../shared/layout/filters/select/select.interface';
import { trackById } from '../../../../../../shared/utils/track-by';
import { CashRegister } from '../../../../shared/models/cash-register';
import { maxShiftCashAmount, StartShiftQuery } from '../../../models/start-shift-query';

export type StartShiftModalResponse = Pick<StartShiftQuery, 'cashRegisterId' | 'initialAmount'> | null;

@Component({
  selector: 'app-start-shift-modal',
  standalone: false,
  templateUrl: './start-shift-modal.component.html',
  styleUrls: ['./start-shift-modal.component.scss'],
})
export class StartShiftModalComponent implements OnInit {
  #webviewMessenger = inject(WebviewMessengerService);

  @Input() set currency(value: string | null | undefined) {
    this.inputCurrency = value ?? null;
    this.currencySymbol = value ? getCurrencySymbol(value, 'narrow') : null;
  }

  @Input() set cashRegisters(cashRegisters: CashRegister[] | null | undefined) {
    this.cashRegisterOptions = cashRegisters?.map(({ id, name }) => ({ id, title: name })) ?? [];
    if (this.cashRegisterOptions.length === 1) {
      this.selectedCashRegister = this.cashRegisterOptions[0] ?? null;
    }
  }

  @Input() shouldShowCashManagement = true;

  @Output() response = new EventEmitter<StartShiftModalResponse>();

  inputCurrency: string | null = null;
  cashRegisterOptions: SelectOption[] = [];
  selectedCashRegister: SelectOption | null = null;
  initialAmount = 0;
  currencySymbol: string | null = null;
  maxCashAmount = maxShiftCashAmount;

  trackCashByFn = trackById;

  get isStartDisabled(): boolean {
    return !this.selectedCashRegister;
  }

  handleEnterKey(event: KeyboardEvent): void {
    if (!this.isStartDisabled) {
      event.preventDefault();
      this.start();
    }
  }

  start(): void {
    this.response.emit({
      cashRegisterId: this.selectedCashRegister?.id,
      initialAmount: this.initialAmount ?? 0,
    });
  }

  cancel(): void {
    this.response.emit(null);
  }

  ngOnInit(): void {
    this.#webviewMessenger.sendWebViewMessage(new CashDrawerOpenMessage());
  }
}
