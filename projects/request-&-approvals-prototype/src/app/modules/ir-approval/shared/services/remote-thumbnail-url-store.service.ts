import { Injectable, signal } from '@angular/core';

import { RemoteThumbnailEntry } from '../models/file-thumbnail.model';
import { urlPath } from '../utils/thumbnail-url.util';

@Injectable({ providedIn: 'root' })
export class RemoteThumbnailUrlStore {
  static readonly maxEntries = 500;
  static readonly maxPinAgeMs = 50 * 60 * 1000;

  readonly #entryByPath = signal<ReadonlyMap<string, RemoteThumbnailEntry>>(new Map());

  lookup(freshUrl: string): string | null {
    const entry = this.#currentEntry(urlPath(freshUrl));
    if (entry === undefined) {
      return freshUrl;
    }
    if (!entry.isFailed) {
      return entry.url;
    }
    return entry.url === freshUrl || entry.hasRetried ? null : freshUrl;
  }

  markFailed(url: string): void {
    const path = urlPath(url);
    const entry = this.#currentEntry(path);
    if (entry === undefined || entry.url === url) {
      this.#store(path, { hasRetried: entry?.hasRetried ?? false, isFailed: true, pinnedAt: Date.now(), url });
      return;
    }
    if (entry.isFailed && !entry.hasRetried) {
      this.#store(path, { hasRetried: true, isFailed: true, pinnedAt: Date.now(), url });
    }
  }

  markLoaded(url: string): void {
    const path = urlPath(url);
    const entry = this.#currentEntry(path);
    if (entry !== undefined && !entry.isFailed && entry.url === url) {
      this.#store(path, entry);
      return;
    }
    if (entry === undefined || entry.url === url || (entry.isFailed && !entry.hasRetried)) {
      this.#store(path, { hasRetried: false, isFailed: false, pinnedAt: Date.now(), url });
    }
  }

  #currentEntry(path: string): RemoteThumbnailEntry | undefined {
    const entry = this.#entryByPath().get(path);
    if (entry === undefined || entry.isFailed) {
      return entry;
    }
    return Date.now() - entry.pinnedAt < RemoteThumbnailUrlStore.maxPinAgeMs ? entry : undefined;
  }

  #store(path: string, entry: RemoteThumbnailEntry): void {
    const next = new Map(this.#entryByPath());
    next.delete(path);
    next.set(path, entry);
    while (next.size > RemoteThumbnailUrlStore.maxEntries) {
      const oldest = next.keys().next();
      if (oldest.done === true) {
        break;
      }
      next.delete(oldest.value);
    }
    this.#entryByPath.set(next);
  }
}
