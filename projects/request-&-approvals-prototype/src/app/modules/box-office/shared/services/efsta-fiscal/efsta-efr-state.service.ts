import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { catchError, map, Observable, of, timeout } from 'rxjs';

import { environment } from '../../../../../../environments/environment';
import { isPlainObject, parseEfrPrintState } from './efr-print-state-parser.util';
import {
  buildLogKey,
  DEVICE_LINK_ERROR_LOG_KEY_PREFIX,
  EfrStateLogThrottle,
  TOLERATED_LOG_KEY_PREFIX,
  UNREADABLE_LOG_KEY_PREFIX,
} from './efr-state-log-throttle.service';
import { resolveEfrWireDialect } from './efr-wire-dialect.util';
import { EfrStateObserved, EfrStateReadout, EfrStateUnreadable, EfrWireDialect } from './models/efr-state-readout.model';
import { FiscalPrinterStateSource } from './models/fiscal-country-profile.model';

const EFR_TIMEOUT_MS = 30_000;
const EFR_STATE_RN = 'def';

@Injectable({
  providedIn: 'root',
})
export class EfstaEfrStateService {
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #http = inject(HttpClient);
  readonly #logThrottle = inject(EfrStateLogThrottle);

  getPrinterState(source: FiscalPrinterStateSource): Observable<EfrStateReadout> {
    const url = `${environment.efstaEfrBaseUrl}/peri/print/state?RN=${EFR_STATE_RN}`;
    const dialect = resolveEfrWireDialect(source);

    return this.#http.get<unknown>(url).pipe(
      timeout(EFR_TIMEOUT_MS),
      map((body: unknown) => this.#toReadout(body, dialect)),
      catchError((error: unknown) => {
        this.#datadogLogService.logError(`EFSTA fiscal state failed`, {
          error,
        });
        return of<EfrStateReadout>({ kind: 'unreachable', source });
      }),
    );
  }

  #toReadout(body: unknown, dialect: EfrWireDialect): EfrStateReadout {
    const readout = parseEfrPrintState(body, dialect);

    if (readout.kind === 'unreadable') {
      this.#logUnreadable(readout, body);
      return readout;
    }

    this.#logThrottle.clearUnreadable();
    if (readout.kind !== 'observed') {
      return readout;
    }

    if (readout.ignoredFields.length > 0) {
      this.#logToleratedViolation(readout, body);
    }

    const deviceLinkError = readDeviceLinkError(body);
    if (deviceLinkError.length === 0) {
      return readout;
    }

    this.#logDeviceLinkError(readout, deviceLinkError);

    return { ...readout, state: { ...readout.state, printerWork: false } };
  }

  #logDeviceLinkError(readout: EfrStateObserved, errorCode: string): void {
    const key = buildLogKey(DEVICE_LINK_ERROR_LOG_KEY_PREFIX, [errorCode]);

    if (!this.#logThrottle.tryAcquireLogSlot(key)) {
      return;
    }

    this.#datadogLogService.logError('EFR reported a device link error', {
      dialect: readout.source,
      errorCode,
    });
  }

  #logUnreadable(readout: EfrStateUnreadable, body: unknown): void {
    const key = buildLogKey(UNREADABLE_LOG_KEY_PREFIX, [
      readout.reason,
      readout.bodyKeyCount,
      hashString(readBodyKeys(body).join(',')),
      readout.blockingViolations.join(','),
    ]);

    if (!this.#logThrottle.tryAcquireLogSlot(key)) {
      return;
    }

    this.#datadogLogService.logError('EFR state unreadable', {
      blockingViolations: readout.blockingViolations,
      bodyKeyCount: readout.bodyKeyCount,
      bodyKeys: readout.bodyKeys,
      dialect: readout.source,
      ignoredFields: readout.ignoredFields,
      missingSignals: readout.missingSignals,
      reason: readout.reason,
    });
  }

  #logToleratedViolation(readout: EfrStateObserved, body: unknown): void {
    const key = buildLogKey(TOLERATED_LOG_KEY_PREFIX, [readout.ignoredFields.join(',')]);

    if (!this.#logThrottle.tryAcquireLogSlot(key)) {
      return;
    }

    this.#datadogLogService.logInfo('EFR state tolerated field type violation', {
      bodyKeyCount: readBodyKeys(body).length,
      dialect: readout.source,
      ignoredFields: readout.ignoredFields,
    });
  }
}

function readDeviceLinkError(body: unknown): string {
  if (!isPlainObject(body)) {
    return '';
  }
  // Safe after the isPlainObject guard: only a plain object exposes wire keys worth reading.
  const errorCode = (body as Record<string, unknown>)['ErrorCode'];
  return typeof errorCode === 'string' ? errorCode.trim() : '';
}

function readBodyKeys(body: unknown): readonly string[] {
  // Safe after the isPlainObject guard: only a plain object exposes wire keys worth counting.
  return isPlainObject(body) ? Object.keys(body as Record<string, unknown>) : [];
}

function hashString(value: string): number {
  let hash = 5381;
  for (const character of value) {
    hash = (hash * 33 + character.charCodeAt(0)) | 0;
  }
  return hash;
}
