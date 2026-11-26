import { Injectable } from '@angular/core';

const THROTTLE_WINDOW_MS = 60_000;
const MAX_THROTTLE_ENTRIES = 32;

export const UNREADABLE_LOG_KEY_PREFIX = 'unreadable';
export const TOLERATED_LOG_KEY_PREFIX = 'tolerated';
export const DEVICE_LINK_ERROR_LOG_KEY_PREFIX = 'device-link-error';

export function buildLogKey(prefix: string, parts: readonly (number | string)[]): string {
  return [prefix, ...parts].join('|');
}

@Injectable({
  providedIn: 'root',
})
export class EfrStateLogThrottle {
  readonly #expiresAtByKey = new Map<string, number>();

  clearUnreadable(): void {
    const unreadablePrefix = `${UNREADABLE_LOG_KEY_PREFIX}|`;
    for (const key of [...this.#expiresAtByKey.keys()]) {
      if (key.startsWith(unreadablePrefix)) {
        this.#expiresAtByKey.delete(key);
      }
    }
  }

  tryAcquireLogSlot(key: string): boolean {
    const now = Date.now();
    const expiresAt = this.#expiresAtByKey.get(key);

    if (expiresAt !== undefined && expiresAt > now) {
      return false;
    }

    this.#expiresAtByKey.delete(key);
    this.#evictOldestWhenFull();
    this.#expiresAtByKey.set(key, now + THROTTLE_WINDOW_MS);

    return true;
  }

  #evictOldestWhenFull(): void {
    if (this.#expiresAtByKey.size < MAX_THROTTLE_ENTRIES) {
      return;
    }
    const oldestKey = this.#expiresAtByKey.keys().next().value;
    if (oldestKey !== undefined) {
      this.#expiresAtByKey.delete(oldestKey);
    }
  }
}
