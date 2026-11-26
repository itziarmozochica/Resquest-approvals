import { computed, Injectable, signal } from '@angular/core';

import { ApprovalItemCommentCount, ApprovalItemCommentCounts } from '../models/approval-item-comment.model';

@Injectable()
export class ApprovalItemCommentCountsService {
  readonly #server = signal<ApprovalItemCommentCounts>({ counts: {}, revision: 0 });
  readonly #local = signal<Readonly<Record<string, ApprovalItemCommentCount>>>({});
  #revision = 0;

  readonly counts = computed<Readonly<Record<string, number>>>(() => {
    const server = this.#server();
    const newerLocal = Object.entries(this.#local())
      .filter(([, local]) => local.revision > server.revision)
      .map(([itemId, local]): [string, number] => [itemId, local.count]);
    return { ...server.counts, ...Object.fromEntries(newerLocal) };
  });

  accept(counts: Readonly<Record<string, number>>, revision: number): void {
    if (revision <= this.#server().revision) {
      return;
    }
    this.#server.set({ counts: { ...counts }, revision });
  }

  reset(): void {
    this.#server.set({ counts: {}, revision: this.#revision });
    this.#local.set({});
  }

  set(itemId: string, count: number): void {
    this.#revision++;
    const revision = this.#revision;
    this.#local.update(local => ({ ...local, [itemId]: { count, revision } }));
  }

  startRefresh(): number {
    this.#revision++;
    return this.#revision;
  }
}
