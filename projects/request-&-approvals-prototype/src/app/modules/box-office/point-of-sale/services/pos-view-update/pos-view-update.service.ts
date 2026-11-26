import { ChangeDetectorRef, inject, Injectable, signal, type WritableSignal } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';

/**
 * Change-detection bridge for the business layer. The component registers its own
 * `ChangeDetectorRef` at construction; strategies call through this service at **exactly** the
 * required call sites, a mechanical 1:1 mapping. It disappears in the signals iteration.
 */
@Injectable()
export class PosViewUpdateService {
  readonly #datadogLogService = inject(DatadogLogService);
  #changeDetectorRef: ChangeDetectorRef | null = null;
  /** Keeps the unregistered-bridge warning to one log per instance instead of one per call site. */
  #hasWarnedUnregistered = false;
  /**
   * Bumped by every call site below, so a signal-based subtree can depend on "the legacy layer says
   * the view changed" — see the `viewVersion` note in `point-of-sale/AGENTS.md`.
   */
  readonly viewVersion: WritableSignal<number> = signal<number>(0);

  /** Wraps a `ChangeDetectorRef.detectChanges()` call site. */
  detectChanges(): void {
    this.#bumpViewVersion();
    if (!this.#assertRegistered('detectChanges')) {
      return;
    }
    this.#changeDetectorRef?.detectChanges();
  }

  /** Wraps a `ChangeDetectorRef.markForCheck()` call site. */
  markForCheck(): void {
    this.#bumpViewVersion();
    if (!this.#assertRegistered('markForCheck')) {
      return;
    }
    this.#changeDetectorRef?.markForCheck();
  }

  /**
   * Wires the host component's `ChangeDetectorRef`.
   *
   * Must happen **before** any strategy is constructed — see {@link injectPosViewUpdateService}, which
   * is the only intended caller.
   */
  register(changeDetectorRef: ChangeDetectorRef): void {
    this.#changeDetectorRef = changeDetectorRef;
  }

  /**
   * An unregistered bridge silently drops a change-detection call site, which shows up as a
   * stale view rather than an error — so make it visible instead of a no-op.
   */
  #assertRegistered(callSite: 'detectChanges' | 'markForCheck'): boolean {
    if (this.#changeDetectorRef) {
      return true;
    }
    if (!this.#hasWarnedUnregistered) {
      this.#hasWarnedUnregistered = true;
      this.#datadogLogService.logWarn('[PointOfSale] PosViewUpdateService used before register()', { callSite });
    }
    return false;
  }

  /** Independent of registration: a signal consumer must recompute even when no `ChangeDetectorRef` is wired. */
  #bumpViewVersion(): void {
    this.viewVersion.update((version: number) => version + 1);
  }
}

/**
 * Injects the bridge already wired to the host component's `ChangeDetectorRef`.
 *
 * Declare the field that calls this **above** the `TICKETING_STRATEGY` injection: field initialisers
 * run top-down, so registering here is what guarantees every strategy constructs against a registered
 * bridge (a constructor-body `register()` runs *after* all field initialisers, i.e. too late).
 */
export function injectPosViewUpdateService(): PosViewUpdateService {
  const viewUpdateService = inject(PosViewUpdateService);
  viewUpdateService.register(inject(ChangeDetectorRef));
  return viewUpdateService;
}
