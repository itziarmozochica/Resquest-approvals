import { inject, Injectable, OnDestroy } from '@angular/core';

import { from, Observable, of, Subject, Subscription, throwError } from 'rxjs';
import { catchError, concatMap, filter, last, map, switchMap, tap } from 'rxjs/operators';

import { PriceViewerStatus } from '../models/price-viewer-status.model';
import { PriceViewerWriterResult } from '../models/price-viewer-writer-result.model';
import { PriceViewerLoggerService } from '../price-viewer-logger.service';
import { PriceViewerPrinterService } from '../price-viewer-printer.service.abstract';
import { BixolonBdc2000ConnectionManagerService } from './bixolon-bdc-2000-connection-manager.service';
import { COMMAND_CLEAR, MAX_LENGTH_LINE } from './bixolon-bdc-2000-encoder.constants';
import { BixolonBdc2000EncoderService } from './bixolon-bdc-2000-encoder.service';
import { PortNotWritableError } from './port-not-writable.error';

@Injectable({
  providedIn: 'root',
})
export class BixolonBdc2000PrinterService extends PriceViewerPrinterService implements OnDestroy {
  #command$: Subject<{ type: 'clear' | 'print'; data?: unknown }> = new Subject();
  #commandSubscriber: Subscription;
  #encoderService = inject(BixolonBdc2000EncoderService);
  #logger = inject(PriceViewerLoggerService);
  #portConnection = inject(BixolonBdc2000ConnectionManagerService);

  constructor() {
    super();
    this.#commandSubscriber = this.#setupCommandSubscriber();
  }

  clear(): void {
    this.#command$.next({ type: 'clear' });
  }

  connect(force: boolean = false): Observable<PriceViewerStatus> {
    return this.#portConnection.connect(force);
  }

  lastStatus(): PriceViewerStatus {
    return this.#portConnection.lastStatus();
  }

  ngOnDestroy(): void {
    this.#commandSubscriber.unsubscribe();
  }

  print(label: string, total: string, currency: string): void {
    this.clear();
    this.#command$.next({ type: 'print', data: [label, total, currency] });
  }

  status(): Observable<PriceViewerStatus> {
    return this.#portConnection.status();
  }

  #getBuffers(label: string, total: string, currency: string): (Uint8Array | Uint8Array[] | ArrayBuffer | ArrayBuffer[])[] {
    if (label.length < MAX_LENGTH_LINE) {
      const missing = MAX_LENGTH_LINE - label.length;
      for (let i = 0; i < missing; i++) {
        label += ' ';
      }
    }
    if (label.length > MAX_LENGTH_LINE) {
      label = label.slice(0, MAX_LENGTH_LINE);
    }
    const totalWithCurrency = `${total} ${currency}`;
    return [this.#encoderService.encode(label), new Uint8Array(new TextEncoder().encode(totalWithCurrency).buffer)];
  }

  #setupCommandSubscriber(): Subscription {
    return this.#command$
      .asObservable()
      .pipe(
        switchMap(({ type, data }) => {
          this.#logger.info(`Arrive to execute: ${type}`);
          if (type == 'clear') {
            return of(this.#portConnection.lastStatus()).pipe(
              filter(status => status == PriceViewerStatus.CONNECTED || status == PriceViewerStatus.WRITING),
              switchMap(() => this.#portConnection.write(COMMAND_CLEAR)),
              map(_ => PriceViewerWriterResult.DONE),
              catchError(error => {
                this.#logger.warn(`Clear command error: ${error}`);
                return of(PriceViewerWriterResult.ERROR);
              }),
            );
          }
          const writeObservable = from([1]).pipe(
            tap(() => this.#portConnection.updateStatus(PriceViewerStatus.WRITING)),
            switchMap(() => {
              const [label, total, currency] = data as Array<string>;
              const [firstLine, secondLine] = this.#getBuffers(label, total, currency);
              return from(firstLine as Uint8Array[]).pipe(
                concatMap(buffer => this.#portConnection.write(buffer)),
                last(),
                switchMap(() => this.#portConnection.write(secondLine as Uint8Array)),
                map(() => PriceViewerWriterResult.DONE),
                catchError(error => {
                  this.#logger.warn(`Write command error: ${error}`);
                  return of(PriceViewerWriterResult.ERROR);
                }),
              );
            }),
            tap(status => {
              if (status == PriceViewerWriterResult.DONE) {
                const [label, total, currency] = data as Array<string>;
                this.#logger.info(`Successfully writed ${label} - ${total} ${currency}`);
              }
            }),
            catchError(error => {
              this.#logger.warn(`Error on write: ${error}`);
              return of(PriceViewerWriterResult.ERROR);
            }),
          );
          const status = this.#portConnection.lastStatus();
          if (
            [
              PriceViewerStatus.CONNECTING,
              PriceViewerStatus.DISCONNECTED,
              PriceViewerStatus.CANT_OPEN_CONNECTION,
              PriceViewerStatus.PORT_NOT_SELECTED,
            ].indexOf(status) !== -1
          ) {
            this.#logger.info(`We will try to connect first, then write the message, current status: ${status}`);
            return this.connect().pipe(
              switchMap(status => {
                if (status != PriceViewerStatus.CONNECTED) {
                  this.#logger.info(`We can't write the message due to connect status: ${status}`);
                  return throwError(() => new PortNotWritableError());
                }
                return of(status);
              }),
              switchMap(() => this.#portConnection.write(COMMAND_CLEAR)),
              switchMap(() => writeObservable),
              catchError(() => {
                return of(PriceViewerWriterResult.ERROR);
              }),
            );
          }
          return writeObservable;
        }),
        catchError(() => {
          return of(PriceViewerWriterResult.ERROR);
        }),
        tap(status => {
          if (status == PriceViewerWriterResult.DONE) {
            this.#portConnection.updateStatus(PriceViewerStatus.CONNECTED);
          } else {
            this.#portConnection.markAsDisconnected();
          }
        }),
      )
      .subscribe();
  }
}
