import { computed, signal, Signal, WritableSignal } from '@angular/core';

export class TicketSelectionState {
  readonly #selectableKeys: WritableSignal<Set<string>> = signal<Set<string>>(new Set());
  readonly #selectedKeys: WritableSignal<Set<string>> = signal<Set<string>>(new Set());

  readonly selectableKeys: Signal<Set<string>> = this.#selectableKeys;
  readonly selectedKeys: Signal<Set<string>> = this.#selectedKeys;

  readonly isAllSelected: Signal<boolean> = computed(() => {
    const selectable = this.#selectableKeys();
    if (selectable.size === 0) {
      return false;
    }
    const selected = this.#selectedKeys();
    for (const key of selectable) {
      if (!selected.has(key)) {
        return false;
      }
    }
    return true;
  });

  readonly isNoneSelected: Signal<boolean> = computed(() => {
    return this.#selectedKeys().size === 0;
  });

  readonly isIndeterminate: Signal<boolean> = computed(() => {
    const selected = this.#selectedKeys();
    const selectable = this.#selectableKeys();
    return selected.size > 0 && selected.size < selectable.size;
  });

  readonly selectedCount: Signal<number> = computed(() => {
    return this.#selectedKeys().size;
  });

  constructor(initialKeys?: string[]) {
    if (initialKeys) {
      this.setSelectableKeys(initialKeys);
    }
  }

  selectAll(): void {
    this.#selectedKeys.set(new Set(this.#selectableKeys()));
  }

  deselectAll(): void {
    this.#selectedKeys.set(new Set());
  }

  toggleAll(): void {
    if (this.isAllSelected()) {
      this.deselectAll();
    } else {
      this.selectAll();
    }
  }

  select(key: string): void {
    if (!this.#selectableKeys().has(key)) {
      return;
    }
    this.#selectedKeys.update(set => {
      const next = new Set(set);
      next.add(key);
      return next;
    });
  }

  deselect(key: string): void {
    this.#selectedKeys.update(set => {
      const next = new Set(set);
      next.delete(key);
      return next;
    });
  }

  toggle(key: string): void {
    if (this.isSelected(key)) {
      this.deselect(key);
    } else {
      this.select(key);
    }
  }

  isSelected(key: string): boolean {
    return this.#selectedKeys().has(key);
  }

  selectSubset(keys: string[]): void {
    this.#selectedKeys.update(set => {
      const next = new Set(set);
      for (const key of keys) {
        if (this.#selectableKeys().has(key)) {
          next.add(key);
        }
      }
      return next;
    });
  }

  deselectSubset(keys: string[]): void {
    this.#selectedKeys.update(set => {
      const next = new Set(set);
      for (const key of keys) {
        next.delete(key);
      }
      return next;
    });
  }

  isSubsetAllSelected(keys: string[]): boolean {
    const selectableInSubset = keys.filter(k => this.#selectableKeys().has(k));
    if (selectableInSubset.length === 0) {
      return false;
    }
    const selected = this.#selectedKeys();
    return selectableInSubset.every(k => selected.has(k));
  }

  subsetSelectedCount(keys: string[]): number {
    const selected = this.selectedKeys();
    return keys.filter(k => this.selectableKeys().has(k) && selected.has(k)).length;
  }

  subsetSelectableCount(keys: string[]): number {
    return keys.filter(k => this.selectableKeys().has(k)).length;
  }

  isSubsetIndeterminate(keys: string[]): boolean {
    const selectableInSubset = keys.filter(k => this.#selectableKeys().has(k));
    if (selectableInSubset.length === 0) {
      return false;
    }
    const selected = this.#selectedKeys();
    const selectedInSubset = selectableInSubset.filter(k => selected.has(k));
    return selectedInSubset.length > 0 && selectedInSubset.length < selectableInSubset.length;
  }

  setSelectableKeys(keys: string[]): void {
    const newSelectable = new Set(keys);
    const previousSelectable = this.#selectableKeys();
    this.#selectableKeys.set(newSelectable);
    this.#selectedKeys.update(set => {
      const next = new Set<string>();
      for (const key of set) {
        if (newSelectable.has(key)) {
          next.add(key);
        }
      }
      if (next.size === 0) {
        const selectableChanged =
          previousSelectable.size !== newSelectable.size || [...newSelectable].some(k => !previousSelectable.has(k));
        if (selectableChanged) {
          return new Set(newSelectable);
        }
        return next;
      }
      return next;
    });
  }
}
