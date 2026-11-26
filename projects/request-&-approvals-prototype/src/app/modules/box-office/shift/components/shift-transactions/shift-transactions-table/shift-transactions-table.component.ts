import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ShiftTransaction, ShiftTransactionAction } from '../../../models/shift-transaction';

@Component({
  selector: 'app-shift-transactions-table',
  standalone: false,
  templateUrl: './shift-transactions-table.component.html',
  styleUrls: ['./shift-transactions-table.component.scss'],
})
export class ShiftTransactionsTableComponent {
  #expandedRows = new Set<number>();
  @Output() selectedTransaction = new EventEmitter<number>();
  @Input() showsTicketCount = true;

  transactionActions = ShiftTransactionAction;
  @Input() transactions!: ShiftTransaction[];

  hasMultipleOrders(transaction: ShiftTransaction): boolean {
    return transaction.orders.length > 1;
  }

  isExpanded(index: number): boolean {
    return this.#expandedRows.has(index);
  }

  onOrderRowClick(orderId: number, event: Event): void {
    event.stopPropagation();
    this.selectedTransaction.emit(orderId);
  }

  onRowClick(transaction: ShiftTransaction, index: number): void {
    if (this.hasMultipleOrders(transaction)) {
      this.toggleRow(index, new Event('click'));
    } else {
      this.selectedTransaction.emit(transaction.orders[0].orderId);
    }
  }

  toggleRow(index: number, event: Event): void {
    event.stopPropagation();
    if (this.#expandedRows.has(index)) {
      this.#expandedRows.delete(index);
    } else {
      this.#expandedRows.add(index);
    }
  }

  trackByFn(_: number, transaction: ShiftTransaction): string {
    return transaction.orders.map(o => o.orderId).join('-') + transaction.action;
  }

  trackByOrderFn(_: number, order: { orderId: number }): number {
    return order.orderId;
  }
}
