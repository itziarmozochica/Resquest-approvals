import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

import type { StoragePort } from '@fz/storage';

import { DatadogLogService } from '../../../core/error/datadog/logger/datadog-log.service';

export type StorageOperation = 'enumerate' | 'read' | 'remove' | 'write';

/**
 * Default `StoragePort` implementation backed by `window.localStorage`.
 *
 * Firefox raises `NS_ERROR_FAILURE` (and Safari historical builds raise `QuotaExceededError`)
 * when the origin storage is blocked or quota-zero — Enhanced Tracking Protection in strict
 * mode, private browsing with full block, `dom.storage.enabled=false`, sandboxed iframes,
 * partitioned storage. Every method here catches those failures, logs to Datadog and returns
 * a safe default so the application keeps running.
 *
 * Use the `STORAGE_SERVICE` token to inject this — see `@fz/storage`. Direct injection
 * of the class is allowed but couples the consumer to this implementation; prefer the token.
 *
 * See FEVERZONE-1B0 for the incident that motivated this service.
 */
@Injectable({
  providedIn: 'root',
})
export class LocalStorageService implements StoragePort {
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #platformId = inject(PLATFORM_ID);
  readonly #storage: Storage | null = this.#resolveStorage();

  clear(): void {
    if (!this.#storage) {
      return;
    }
    try {
      this.#storage.clear();
    } catch (error: unknown) {
      this.#logFailure('remove', '*', error);
    }
  }

  get<T = string>(key: string): T | null {
    if (!this.#storage) {
      return null;
    }
    let raw: string | null;
    try {
      raw = this.#storage.getItem(key);
    } catch (error: unknown) {
      this.#logFailure('read', key, error);
      return null;
    }
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Stored value is a plain string written via the legacy raw-`setItem` path or by
      // `set('key', 'value')` (which intentionally skips JSON serialisation for strings).
      return raw as unknown as T;
    }
  }

  keys(): string[] {
    if (!this.#storage) {
      return [];
    }
    try {
      return Object.keys(this.#storage);
    } catch (error: unknown) {
      this.#logFailure('enumerate', '*', error);
      return [];
    }
  }

  remove(key: string): void {
    if (!this.#storage) {
      return;
    }
    try {
      this.#storage.removeItem(key);
    } catch (error: unknown) {
      this.#logFailure('remove', key, error);
    }
  }

  set<T>(key: string, value: T): void {
    if (!this.#storage) {
      return;
    }
    const serialised = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      this.#storage.setItem(key, serialised);
    } catch (error: unknown) {
      this.#logFailure('write', key, error);
    }
  }

  #logFailure(operation: StorageOperation, key: string, error: unknown): void {
    const errorName = (error as { name?: string })?.name;
    const errorMessage = (error as { message?: string })?.message;
    this.#datadogLogService.logWarn('localStorage access blocked', {
      errorMessage: errorMessage ?? String(error),
      errorName: errorName ?? 'UnknownError',
      key,
      operation,
    });
  }

  #resolveStorage(): Storage | null {
    if (!isPlatformBrowser(this.#platformId)) {
      return null;
    }
    try {
      return localStorage;
    } catch (error: unknown) {
      this.#logFailure('read', '*', error);
      return null;
    }
  }
}
