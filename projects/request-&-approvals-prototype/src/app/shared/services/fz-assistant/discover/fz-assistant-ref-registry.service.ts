import { Injectable } from '@angular/core';

import {
  FZ_ASSISTANT_REF_ATTRIBUTE,
  FzAssistantRefEntry,
  FzAssistantRefRegistry,
  FzAssistantRefResolution,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-discover.model';

/**
 * How many retired refs stay answerable as `target_stale`.
 *
 * Generous on purpose: the cost of forgetting one is a `target_not_found` on a ref the agent is unlikely
 * to still be holding, and the cost of a cap far below the element cap would be losing the current screen.
 */
const STALE_REF_LIMIT = 2_000;

@Injectable({
  providedIn: 'root',
})
export class FzAssistantRefRegistryService implements FzAssistantRefRegistry {
  readonly #refs = new Map<string, FzAssistantRefEntry>();

  /**
   * Refs whose node is gone. Kept because eviction would otherwise turn a second attempt at the same
   * ref into `target_not_found` - telling the agent it invented a ref it read from a `view_context`,
   * when the truth is unchanged: the node was there and is not any more.
   *
   * Bounded, because every ref that leaves the registry lands here and each navigation retires a whole
   * screen's worth: a tab left open all day would otherwise accumulate them for the session. The useful
   * window is the last few `view_context`s the agent actually saw, and dropping an older one is safe -
   * the answer falls back to `missing`, which is what it was before any of this existed.
   */
  readonly #staleRefs = new Set<string>();

  clear(): void {
    this.#refs.clear();
    this.#staleRefs.clear();
  }

  clearElement(element: Element): void {
    const ref = readStampedRef(element);
    if (ref === undefined) {
      return;
    }

    const entry = this.#refs.get(ref);
    if (entry !== undefined && entry.element !== element) {
      return;
    }

    this.#forget(ref);
  }

  clearSubtree(root: Element): void {
    const stamped = root.querySelectorAll(`[${FZ_ASSISTANT_REF_ATTRIBUTE}]`);
    for (let index = 0; index < stamped.length; index++) {
      const element = stamped.item(index);
      if (element === null) {
        continue;
      }

      this.clearElement(element);
    }

    this.clearElement(root);
    this.#pruneDisconnected();
  }

  delete(ref: string): void {
    this.#forget(ref);
  }

  stamp(element: Element): string {
    const stampedRef = readStampedRef(element);
    const owner = stampedRef !== undefined ? this.#refs.get(stampedRef) : undefined;
    if (stampedRef !== undefined && owner !== undefined && owner.element === element) {
      this.#staleRefs.delete(stampedRef);
      this.#refs.set(stampedRef, { element });
      return stampedRef;
    }

    // The old attribute value is not resurrected here - a fresh ref is minted, so the previous one
    // stays stale. Only the reuse path above, where the element keeps its ref, makes one live again.
    this.#clearMappingsForElement(element);
    const ref = crypto.randomUUID();
    element.setAttribute(FZ_ASSISTANT_REF_ATTRIBUTE, ref);
    this.#refs.set(ref, { element });

    return ref;
  }

  /**
   * The single resolution both halt codes come from, so no caller has to order two lookups to tell
   * them apart. Eviction still happens - Act is never handed a detached element to mutate - but the
   * ref is remembered as stale so the answer stays the same however many times it is asked.
   */
  resolve(ref: string): FzAssistantRefResolution {
    const entry = this.get(ref);
    if (entry !== undefined) {
      return { entry, status: 'found' };
    }

    return this.#staleRefs.has(ref) ? { status: 'stale' } : { status: 'missing' };
  }

  get(ref: string): FzAssistantRefEntry | undefined {
    const entry = this.#refs.get(ref);
    if (entry === undefined) {
      return undefined;
    }

    // Study §3.6: node destroyed → target_stale. Never hand Act a detached element to mutate; evict
    // and return undefined so resolution fails closed. Callers should prefer `resolve`, which turns
    // that eviction into the `stale` answer rather than leaving it to be inferred from call order.
    if (!entry.element.isConnected) {
      this.#forget(ref);
      return undefined;
    }

    return entry;
  }

  set(ref: string, entry: FzAssistantRefEntry): void {
    // A ref that resolves again is no longer stale, or a re-attached node would keep reporting as gone.
    this.#staleRefs.delete(ref);
    this.#refs.set(ref, entry);
  }

  #clearMappingsForElement(element: Element): void {
    for (const [existingRef, entry] of this.#refs) {
      if (entry.element === element) {
        this.#forget(existingRef);
      }
    }
  }

  /**
   * Drop a mapping and remember that it existed.
   *
   * Every path out of the registry goes through here, because the agent cannot tell them apart: a node
   * destroyed by `get()`, a host torn down through `clearSubtree`, a widget unregistered through
   * `delete` - in each case a ref the agent read from a `view_context` stops resolving, and the honest
   * answer is `target_stale`. Only a full `clear()` forgets that a ref ever existed.
   */
  #forget(ref: string): void {
    if (!this.#refs.delete(ref)) {
      return;
    }

    this.#staleRefs.add(ref);

    // A `Set` iterates in insertion order, so the first entry is the oldest.
    if (this.#staleRefs.size > STALE_REF_LIMIT) {
      const oldest = this.#staleRefs.values().next();
      if (oldest.done !== true) {
        this.#staleRefs.delete(oldest.value);
      }
    }
  }

  #pruneDisconnected(): void {
    for (const [ref, entry] of this.#refs) {
      if (!entry.element.isConnected) {
        this.#forget(ref);
      }
    }
  }
}

function readStampedRef(element: Element): string | undefined {
  const value = element.getAttribute(FZ_ASSISTANT_REF_ATTRIBUTE);
  if (value === null) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
