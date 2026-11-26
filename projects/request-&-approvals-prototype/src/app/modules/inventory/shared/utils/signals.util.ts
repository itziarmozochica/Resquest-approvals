import type { WritableSignal } from '@angular/core';

/**
 * Sets a signal only if the new value is different from the current one.
 * Prevents unnecessary change detection cycles and effect runs.
 * Delete this when you upgrade to Angular ≥17.1 (it ships setIfDifferent natively)
 */
export function setIfDifferent<T>(signal: WritableSignal<T>, value: T): void {
  if (areDifferent(signal(), value)) {
    signal.set(value);
  }
}

function areDifferent<T>(value1: T, value2: T): boolean {
  return JSON.stringify(value1) !== JSON.stringify(value2);
}
