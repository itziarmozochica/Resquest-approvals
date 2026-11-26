import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, Injector, NgZone } from '@angular/core';

import { environment } from '../../../../../environments/environment';
import { getServerTimeOffsetMs } from '../../../../../environments/runtime/server-clock';
import { DualScreenData } from '../../../../app/models/dual-screen-data.model';
import { Partner } from '../../../../shared/models/partner/partner.model';
import { User } from '../../../../shared/models/user/user.model';
import { DualScreenStorageService } from '../../../../shared/services/dual-screen/dual-screen-storage.service';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { UserService } from '../../../../shared/services/user/user.service';
import { BatchFlushScheduler } from '../../../batch-flush-scheduler';

export enum DatadogLogLevel {
  Info = 'INFO',
  Warn = 'WARN',
  Error = 'ERROR',
}

export const datadogLogBaseUrl = 'https://http-intake.logs.datadoghq.com/v1/input/';
export const datadogLogBatchDelayMs = 3000;
export const datadogLogMaxBatchSize = 20;
export const datadogLogKeepaliveBodyLimitBytes = 60_000;

interface DatadogLogContext {
  dualScreenData: DualScreenData | null;
  partner: Partner | null;
  user: User | null;
}

interface QueuedDatadogLog {
  attempts: number;
  line: string;
}

@Injectable({
  providedIn: 'root',
})
export class DatadogLogService {
  private datadogApiUrl = `${datadogLogBaseUrl}${environment.datadog.clientToken}`;

  #queue: QueuedDatadogLog[] = [];
  #scheduler: BatchFlushScheduler | null = null;

  constructor(private injector: Injector) {}

  logInfo(message: string, payload?: { [key: string]: any }): void {
    this.sendLog(message, DatadogLogLevel.Info, payload);
  }

  logWarn(message: string, payload?: { [key: string]: any }): void {
    this.sendLog(message, DatadogLogLevel.Warn, payload);
  }

  logError(message: string, payload?: { [key: string]: any }): void {
    this.sendLog(message, DatadogLogLevel.Error, payload);
  }

  sendLog(message: string, status?: DatadogLogLevel, payload?: { [key: string]: any }): void {
    if (!environment.datadog.log.enabled) {
      return;
    }
    const level = status ?? DatadogLogLevel.Info;
    this.#queue = [...this.#queue, { attempts: 0, line: this.#serializeEntry(message, level, payload) }];
    const flushNow = level === DatadogLogLevel.Error || this.#queue.length >= datadogLogMaxBatchSize;
    this.#getScheduler().schedule(flushNow ? 0 : datadogLogBatchDelayMs);
  }

  getBody(message: string, status?: DatadogLogLevel, payload?: { [key: string]: any }): any {
    return this.#buildBody(message, status, payload, this.#readContext());
  }

  #buildBody(
    message: string,
    status: DatadogLogLevel | undefined,
    payload: Record<string, unknown> | undefined,
    { dualScreenData, partner, user }: DatadogLogContext,
  ): Record<string, unknown> {
    const version = environment.datadog.commitHash.substring(0, 7);

    return {
      message,
      status: status ?? DatadogLogLevel.Info,
      partner,
      user,
      version,
      env: environment.datadog.environment,
      allowedTracingUrls: [new URL(environment.baseUrl).origin],
      ddsource: 'browser',
      service: environment.datadog.service,
      applicationId: environment.datadog.applicationId,
      site: environment.datadog.site,
      ...(dualScreenData
        ? {
            'dual-screen': {
              versionApp: dualScreenData.versionApp,
              deviceName: dualScreenData.deviceName,
              hasNFC: dualScreenData.hasNFC,
              androidId: dualScreenData.androidId,
            },
          }
        : {}),
      ...payload,
    };
  }

  #readContext(): DatadogLogContext {
    try {
      return {
        dualScreenData: this.injector.get(DualScreenStorageService).getData(),
        partner: this.injector.get(PartnerService).getPartner(),
        user: this.injector.get(UserService).getUser(),
      };
    } catch {
      return { dualScreenData: null, partner: null, user: null };
    }
  }

  #serializeEntry(message: string, status: DatadogLogLevel, payload: Record<string, unknown> | undefined): string {
    const context = this.#readContext();
    const loggedAt = Date.now();
    const serverTimeOffsetMs = getServerTimeOffsetMs();
    const timing = serverTimeOffsetMs === null ? { loggedAt } : { date: loggedAt - serverTimeOffsetMs, loggedAt };
    try {
      return JSON.stringify(this.#buildBody(message, status, { ...timing, ...payload }, context));
    } catch (error: unknown) {
      return JSON.stringify(this.#buildBody(message, status, { ...timing, payloadSerializationError: String(error) }, context));
    }
  }

  #getScheduler(): BatchFlushScheduler {
    this.#scheduler ??= new BatchFlushScheduler(
      this.injector.get(NgZone),
      this.injector.get(DOCUMENT),
      this.injector.get(DestroyRef),
      (isPageExit: boolean) => this.#flush(isPageExit),
    );
    return this.#scheduler;
  }

  #flush(isPageExit: boolean): void {
    if (this.#queue.length === 0) {
      return;
    }
    const entries = this.#queue;
    this.#queue = [];
    const body = entries.map((entry: QueuedDatadogLog) => entry.line).join('\n');
    const keepalive = isPageExit && new TextEncoder().encode(body).length <= datadogLogKeepaliveBodyLimitBytes;
    let request: Promise<Response>;
    try {
      request = fetch(this.datadogApiUrl, { body, keepalive, method: 'POST' });
    } catch (error: unknown) {
      this.#handleSendFailure(entries, error);
      return;
    }
    request
      .then((response: Response) => {
        if (response.ok) {
          return;
        }
        if (response.status >= 500) {
          this.#handleSendFailure(entries, response.status);
          return;
        }
        console.error('Error sending log to Datadog: ', response.status);
      })
      .catch((error: unknown) => {
        this.#handleSendFailure(entries, error);
      });
  }

  #handleSendFailure(entries: QueuedDatadogLog[], reason: unknown): void {
    console.error('Error sending log to Datadog: ', reason);
    const retried = entries
      .filter((entry: QueuedDatadogLog) => entry.attempts === 0)
      .map((entry: QueuedDatadogLog) => ({ ...entry, attempts: 1 }));
    if (retried.length === 0) {
      return;
    }
    this.#queue = [...retried, ...this.#queue];
    this.#getScheduler().schedule(datadogLogBatchDelayMs);
  }
}
