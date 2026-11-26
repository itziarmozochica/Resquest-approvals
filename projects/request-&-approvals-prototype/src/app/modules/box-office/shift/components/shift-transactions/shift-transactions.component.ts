import { Component, inject, Input, OnChanges } from '@angular/core';
import { Router } from '@angular/router';

import { EMPTY, Observable, ReplaySubject } from 'rxjs';
import { catchError, distinctUntilChanged, finalize, map, tap } from 'rxjs/operators';

import { Shift, ShiftStatus } from '../../../shared/models/shifts.model';
import { ShiftTransaction } from '../../models/shift-transaction';
import { ShiftTransactionsQuery } from '../../models/shift-transactions-query';
import { GetShiftTransactionsResponse } from '../../services/shift-abstract-factory/shared/shift-transactions.adapter';
import { ShiftAbstractFactoryService } from '../../services/shift-abstract-factory/shift-abstract-factory.service';

const ITEMS_PER_PAGE = 10;
export enum State {
  error = 'error',
  noResults = 'noResults',
  notReady = 'notReady',
  withResults = 'withResults',
}

@Component({
  selector: 'app-shift-transactions',
  standalone: false,
  templateUrl: './shift-transactions.component.html',
  styleUrls: ['./shift-transactions.component.scss'],
})
export class ShiftTransactionsComponent implements OnChanges {
  #router = inject(Router);
  #shiftProviderFactory = inject(ShiftAbstractFactoryService);
  private transactionsRequestIndex = 0;

  activatePagination: Observable<boolean>;
  currentState = State.notReady;
  hasMorePages = true;
  isLoading = false;
  pageRequestCallback = (page: number): Observable<boolean> => this.#getTranctionsPageRequest({ page, itemsPerPage: ITEMS_PER_PAGE });
  ready = new ReplaySubject<boolean>(1);
  @Input() shift!: Pick<Shift, 'oboVenueId' | 'id' | 'b2bUser' | 'createdAt' | 'closedAt'>;

  @Input() shiftStatus!: ShiftStatus;

  @Input() showsTicketCount = true;
  stateEnum = State;

  @Input() timezone!: string;

  transactions: Array<ShiftTransaction> = [];

  constructor() {
    this.activatePagination = this.ready.pipe(distinctUntilChanged());
  }

  ngOnChanges(): void {
    const ready = Boolean(this.shift);
    const state = ready ? State.withResults : State.notReady;
    this.currentState = state;
    this.ready.next(ready);
  }

  trackByFn(_: number, transaction: ShiftTransaction): string {
    return transaction.orders.map(o => o.orderId).join('-') + transaction.action;
  }

  viewTransaction(transactionId: number): void {
    const queryParams = {
      type: 'order',
      id: transactionId,
    };
    this.#router.navigate(['/validation'], { queryParams });
  }

  #getTranctionsPageRequest(query: ShiftTransactionsQuery): Observable<boolean> {
    const requestIndex = ++this.transactionsRequestIndex;
    this.isLoading = true;
    return this.#shiftProviderFactory
      .getShiftTransactionsProvider()
      .getTransactions(this.shift.oboVenueId, this.shift.id, query)
      .pipe(
        catchError(() => {
          this.currentState = State.error;
          return EMPTY;
        }),
        tap(response => {
          this.#handleNewTransactionsPage(response);
          this.currentState = this.transactions.length === 0 ? State.noResults : State.withResults;
        }),
        finalize(() => {
          if (requestIndex === this.transactionsRequestIndex) {
            this.isLoading = false;
          }
        }),
        map(response => {
          this.hasMorePages = Boolean(response.getNextPaginationPage());
          return this.hasMorePages;
        }),
      );
  }

  #handleNewTransactionsPage(response: GetShiftTransactionsResponse) {
    this.transactions = [...this.transactions, ...(response.data || [])];
  }
}
