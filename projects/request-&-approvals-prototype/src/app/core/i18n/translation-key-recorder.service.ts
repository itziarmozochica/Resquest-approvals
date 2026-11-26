import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, NgZone } from '@angular/core';

import { BatchFlushScheduler } from '../batch-flush-scheduler';
import { DatadogLogService } from '../error/datadog/logger/datadog-log.service';

@Injectable({ providedIn: 'root' })
export class TranslationKeyRecorderService {
  static readonly batchSize = 200;
  static readonly flushDelayMs = 30_000;
  static readonly logMessage = 'translation_keys';

  readonly #datadogLogService = inject(DatadogLogService);
  readonly #pendingKeys = new Set<string>();
  readonly #pendingMissingKeys = new Set<string>();
  readonly #recordedKeys = new Set<string>();
  readonly #recordedMissingKeys = new Set<string>();
  readonly #scheduler = new BatchFlushScheduler(inject(NgZone), inject(DOCUMENT), inject(DestroyRef), () => this.#flush());

  record(key: string): void {
    if (this.#recordedKeys.has(key)) {
      return;
    }

    this.#recordedKeys.add(key);
    this.#pendingKeys.add(key);
    this.#scheduler.schedule(TranslationKeyRecorderService.flushDelayMs);
  }

  recordMissing(key: string): void {
    if (this.#recordedMissingKeys.has(key)) {
      return;
    }

    this.#recordedMissingKeys.add(key);
    this.#pendingMissingKeys.add(key);
    this.#scheduler.schedule(TranslationKeyRecorderService.flushDelayMs);
  }

  #flush(): void {
    const keys = [...this.#pendingKeys];
    const missingKeys = [...this.#pendingMissingKeys];
    const { batchSize } = TranslationKeyRecorderService;

    this.#pendingKeys.clear();
    this.#pendingMissingKeys.clear();
    this.#scheduler.cancel();

    for (let start = 0; start < Math.max(keys.length, missingKeys.length); start += batchSize) {
      const end = start + batchSize;

      this.#datadogLogService.logInfo(TranslationKeyRecorderService.logMessage, {
        translation: { keys: keys.slice(start, end), missingKeys: missingKeys.slice(start, end) },
      });
    }
  }
}
