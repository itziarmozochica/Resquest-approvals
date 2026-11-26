import { inject, Injectable } from '@angular/core';

import { from, Observable, of, Subject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

import { PriceViewerStatus } from '../models/price-viewer-status.model';
import { PriceViewerLoggerService } from '../price-viewer-logger.service';
import { VENDOR_ID } from './bixolon-bdc-2000-encoder.constants';
import { CantOpenPortConnectionError } from './cant-open-port-connection.error';
import { NotPortSelectedError } from './not-port-selected.error';
import { PortNotWritableError } from './port-not-writable.error';

const RETRY_PROMPT_TIME = 60 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class BixolonBdc2000ConnectionManagerService {
  #connectionPromise: Promise<PriceViewerStatus> | null = null;
  #disconnected = new Subject<void>();
  #logger = inject(PriceViewerLoggerService);
  #status$ = new Subject<PriceViewerStatus>();
  currentStatus: PriceViewerStatus = PriceViewerStatus.DISCONNECTED;
  port: SerialPort | null = null;
  status$: Observable<PriceViewerStatus> = this.#status$.asObservable();
  writer: WritableStreamDefaultWriter | null = null;

  constructor() {
    this.#disconnected
      .pipe(
        tap(() => {
          this.port = null;
          this.writer = null;
          this.updateStatus(PriceViewerStatus.DISCONNECTED);
        }),
        switchMap(() => this.connect()),
      )
      .subscribe();
  }

  connect(forcePrompt: boolean = false): Observable<PriceViewerStatus> {
    return from(this.#connect(forcePrompt)).pipe(
      tap(status => {
        this.updateStatus(status);
      }),
      catchError(error => {
        let status: PriceViewerStatus;
        if (error instanceof CantOpenPortConnectionError || error instanceof PortNotWritableError) {
          status = PriceViewerStatus.CANT_OPEN_CONNECTION;
        } else if (error instanceof NotPortSelectedError) {
          status = PriceViewerStatus.PORT_NOT_SELECTED;
        } else {
          status = PriceViewerStatus.DISCONNECTED;
        }
        this.updateStatus(status);
        return of(status);
      }),
    );
  }

  lastStatus(): PriceViewerStatus {
    return this.currentStatus;
  }

  markAsDisconnected(): void {
    this.#disconnected.next();
  }

  status(): Observable<PriceViewerStatus> {
    return this.status$;
  }

  updateStatus(newStatus: PriceViewerStatus): void {
    this.#logger.info(`Status changed to: ${newStatus}`);
    this.currentStatus = newStatus;
    this.#status$.next(newStatus);
  }

  write(buffer: Uint8Array): Observable<void> {
    if (this.writer === null) {
      return of(void 0);
    }
    return from(this.writer.write(buffer));
  }

  async #connect(forcePrompt: boolean = false) {
    if (this.#connectionPromise) {
      return await this.#connectionPromise;
    }
    this.#connectionPromise = (async () => {
      if (this.currentStatus === PriceViewerStatus.CONNECTED) {
        return PriceViewerStatus.CONNECTED;
      }
      this.updateStatus(PriceViewerStatus.CONNECTING);
      if (this.port === null) {
        await this.#setPort(forcePrompt);
      }
      if (this.writer === null) {
        await this.#setWriter();
      }
      this.updateStatus(PriceViewerStatus.CONNECTED);
      return PriceViewerStatus.CONNECTED;
    })();
    try {
      return await this.#connectionPromise;
    } finally {
      this.#connectionPromise = null;
    }
  }

  async #getOrRequestPort(forcePrompt: boolean) {
    const ports = await navigator.serial.getPorts();
    const filteredPorts = ports.filter(port => port.getInfo().usbVendorId == VENDOR_ID);
    if (filteredPorts.length >= 1) {
      this.#logger.info('Port found');
      return filteredPorts[0];
    }
    this.#logger.info('Not port previously selected, we are going to request port');
    return await this.#requestPort(forcePrompt);
  }

  async #requestPort(forcePrompt: boolean) {
    let shouldPrompt = false;
    const promptTime = localStorage.getItem('userPromptedForPort');
    if (promptTime) {
      if (Date.now() - parseInt(promptTime) >= RETRY_PROMPT_TIME) {
        shouldPrompt = true;
      }
    } else {
      shouldPrompt = true;
    }
    if (shouldPrompt || forcePrompt) {
      try {
        const port = await navigator.serial.requestPort({ filters: [{ usbVendorId: VENDOR_ID }] });
        if (!port) {
          this.#logger.warn('Not port selected on requestPort');
          throw new NotPortSelectedError();
        }
        return port;
      } catch (e) {
        this.#logger.warn('Not port selected on requestPort');
        throw new NotPortSelectedError();
      } finally {
        localStorage.setItem('userPromptedForPort', Date.now().toString());
      }
    }

    throw new NotPortSelectedError();
  }

  async #setPort(forcePrompt: boolean) {
    this.port = await this.#getOrRequestPort(forcePrompt);
    try {
      await this.port.open({ baudRate: 9600 });
    } catch (e) {
      this.#logger.warn(`Failed to open port connection: ${e} - ${this.port.getInfo()}`);
      this.port = null;
      throw new CantOpenPortConnectionError((e as Error).toString());
    }
    this.port.addEventListener('disconnect', () => {
      this.#logger.info('Port disconnected');
      this.#disconnected.next();
    });
  }

  async #setWriter() {
    if (this.port === null) {
      throw new PortNotWritableError();
    }
    if (this.port.writable === null) {
      throw new PortNotWritableError();
    }
    this.writer = this.port.writable.getWriter();
    this.writer.closed
      .then(() => {
        this.#logger.info('Writer closed');
        this.#disconnected.next();
      })
      .catch(error => {
        this.#logger.warn(`Error on writer closed: ${error}`);
        this.#disconnected.next();
      });
  }
}
