import { InjectionToken } from '@angular/core';

/**
 * Abstract storage contract used across the app for persisting values.
 *
 * Implementations MUST be defensive: every method is expected to swallow runtime failures
 * (e.g. Firefox `NS_ERROR_FAILURE` when storage is blocked, Safari quota=0 in private mode)
 * and return the documented safe default rather than throwing.
 *
 * Serialisation rules (implemented by every concrete `StoragePort`):
 *
 * - **Write**: a `string` value is stored verbatim (so DevTools shows it without surrounding
 *   quotes); any other value is run through `JSON.stringify` before being written.
 * - **Read**: the raw stored string is run through `JSON.parse`; if parsing fails the raw
 *   string is returned. The caller annotates the expected type via the generic parameter
 *   (`storage.get<number>('userId')`). The cast is a contract — the storage cannot enforce
 *   that the stored value actually matches `T`, so the consumer is responsible for handling
 *   type drift (e.g. when comparing `'8874'` vs `8874` after a schema change).
 *
 * Inject via the `STORAGE_SERVICE` token to keep consumers decoupled from any concrete impl,
 * so we can swap to `MemoryStorageService`, `SessionStorageService`, etc. without touching
 * call-sites.
 */
export interface StoragePort {
  /** Wipe every entry. Safe no-op when storage is blocked. */
  clear: () => void;

  /**
   * Read the value stored at `key`.
   * Returns `null` when the key is missing or storage is blocked.
   * The result is `JSON.parse`d when possible; non-JSON strings are returned as-is.
   * Annotate the expected shape via `T` (defaults to `string`).
   */
  get: <T = string>(key: string) => T | null;

  /** Snapshot of current keys. Empty array when storage is blocked. */
  keys: () => string[];

  /** Delete the entry at `key`. Safe no-op when storage is blocked. */
  remove: (key: string) => void;

  /**
   * Persist `value` at `key`.
   * Strings are stored verbatim; every other type is `JSON.stringify`d.
   * Safe no-op when storage is blocked or quota is exceeded.
   */
  set: <T>(key: string, value: T) => void;
}

/**
 * In-memory `StoragePort` used as the token's tree-shakable default.
 *
 * This lives in `@fz/storage` so the token is *always resolvable* without an explicit
 * provider — the same guarantee the previous `providedIn: 'root'` token gave before the
 * port was promoted out of `src/app/*`. The library cannot depend on the browser-backed
 * `LocalStorageService` (that would re-introduce the `src/app/*` coupling this move removed,
 * R2), so the default is a dependency-free in-memory store that is safe in every
 * environment (browser, jsdom, Node/SSR for the b2b-iam client).
 *
 * Real apps override this in their root injector — FeverZone's `AppModule` provides
 * `{ provide: STORAGE_SERVICE, useExisting: LocalStorageService }`, so this default is only
 * ever the *fallback* (used by tests and any consumer that hasn't wired a concrete impl).
 * It honours the same serialisation contract documented on `StoragePort`.
 */
class InMemoryStoragePort implements StoragePort {
  readonly #store = new Map<string, string>();

  clear(): void {
    this.#store.clear();
  }

  get<T = string>(key: string): T | null {
    const raw = this.#store.get(key);
    if (raw === undefined) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Non-JSON strings (written verbatim by `set`) are returned as-is.
      return raw as unknown as T;
    }
  }

  keys(): string[] {
    return [...this.#store.keys()];
  }

  remove(key: string): void {
    this.#store.delete(key);
  }

  set<T>(key: string, value: T): void {
    this.#store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
}

/**
 * Injection token for the application-wide storage service.
 *
 * Ships a tree-shakable in-memory default (`InMemoryStoragePort`) so the token is always
 * resolvable. Register the concrete implementation in `AppModule` to override it
 * (FeverZone default: `LocalStorageService`):
 * `{ provide: STORAGE_SERVICE, useExisting: LocalStorageService }`.
 */
export const STORAGE_SERVICE = new InjectionToken<StoragePort>('STORAGE_SERVICE', {
  providedIn: 'root',
  factory: () => new InMemoryStoragePort(),
});
