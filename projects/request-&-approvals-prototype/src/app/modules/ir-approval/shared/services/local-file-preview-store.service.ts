import { Injectable, signal } from '@angular/core';

const MAX_ENTRIES = 40;

@Injectable({ providedIn: 'root' })
export class LocalFilePreviewStore {
  readonly #urlByKey = signal<ReadonlyMap<string, string>>(new Map());

  createFor(file: File): string | undefined {
    return file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
  }

  get(key: string): string | undefined {
    return key ? this.#urlByKey().get(key) : undefined;
  }

  register(key: string, url: string | undefined): void {
    if (!key || !url || this.#urlByKey().get(key) === url) {
      return;
    }
    const next = new Map(this.#urlByKey());
    this.revoke(next.get(key));
    next.set(key, url);
    while (next.size > MAX_ENTRIES) {
      const oldest = next.keys().next();
      if (oldest.done) {
        break;
      }
      this.revoke(next.get(oldest.value));
      next.delete(oldest.value);
    }
    this.#urlByKey.set(next);
  }

  release(key: string): void {
    const url = this.#urlByKey().get(key);
    if (url === undefined) {
      return;
    }
    const next = new Map(this.#urlByKey());
    next.delete(key);
    this.#urlByKey.set(next);
    this.revoke(url);
  }

  revoke(url: string | undefined): void {
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}
