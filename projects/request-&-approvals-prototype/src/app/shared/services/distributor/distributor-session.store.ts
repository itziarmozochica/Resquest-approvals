import { computed, effect, inject, Injectable, Injector, signal, Signal, untracked } from '@angular/core';

import type { DistributorPartnerConfig } from '@fz/b2b-iam';
import { defer, Observable, of } from 'rxjs';

import { DISTRIBUTOR_SESSION_CAPABLE } from './distributor-session-capable.token';
import { DistributorSessionState } from './distributor-session-state.enum';

/** Bounds every wait on {@link DistributorSessionStore.whenResolved}, so a dead bootstrap cannot strand a navigation. */
export const DISTRIBUTOR_SESSION_RESOLVE_TIMEOUT_MS = 10_000;

@Injectable({ providedIn: 'root' })
export class DistributorSessionStore {
  readonly #injector = inject(Injector);
  readonly #partnerConfigs = signal<readonly DistributorPartnerConfig[]>([]);
  readonly #selectedPartnerConfig = signal<DistributorPartnerConfig | null>(null);
  readonly #organizationId = signal<number | null>(null);
  readonly #sessionGeneration = signal(0);
  /**
   * Unknown only where a distributor session is possible at all. An application that does not
   * register `provideBusinessInitialization()` has no path that would ever resolve it, so leaving
   * it Unknown there strands every gate keyed on it - which is what stalled kiosk ticketing.
   */
  readonly #sessionState = signal(
    inject(DISTRIBUTOR_SESSION_CAPABLE, { optional: true }) === true
      ? DistributorSessionState.Unknown
      : DistributorSessionState.NotADistributor,
  );

  readonly partnerConfigs = this.#partnerConfigs.asReadonly();

  readonly selectedPartnerConfig = this.#selectedPartnerConfig.asReadonly();

  readonly organizationId = this.#organizationId.asReadonly();

  readonly sessionGeneration = this.#sessionGeneration.asReadonly();

  /**
   * Prefer this over {@link isDistributorSession} anywhere a *no* would grant something: the boolean
   * cannot tell a settled "ordinary business" from "we have not asked yet".
   */
  readonly sessionState: Signal<DistributorSessionState> = this.#sessionState.asReadonly();

  readonly isDistributorSession: Signal<boolean> = computed(() => this.#sessionState() === DistributorSessionState.Distributor);

  clear(): void {
    this.#partnerConfigs.set([]);
    this.#selectedPartnerConfig.set(null);
    this.#organizationId.set(null);
    this.#sessionGeneration.update(generation => generation + 1);
    // Unknown, not NotADistributor: this runs *before* the new organization is fetched.
    this.#sessionState.set(DistributorSessionState.Unknown);
  }

  /** Resolves the session as an ordinary one. Call this on every path that does not set partners. */
  markNotADistributor(): void {
    this.#partnerConfigs.set([]);
    this.#selectedPartnerConfig.set(null);
    this.#organizationId.set(null);
    this.#sessionGeneration.update(generation => generation + 1);
    this.#sessionState.set(DistributorSessionState.NotADistributor);
  }

  setPartnerConfigs(partnerConfigs: readonly DistributorPartnerConfig[], organizationId: number | null = null): void {
    this.#partnerConfigs.set(partnerConfigs);
    this.#organizationId.set(organizationId);
    this.#sessionState.set(DistributorSessionState.Distributor);
  }

  setSelectedPartnerConfig(config: DistributorPartnerConfig | null): void {
    this.#selectedPartnerConfig.set(config);
  }

  /** Emits once bootstrap has resolved the session, read fresh on every subscribe. */
  whenResolved(): Observable<DistributorSessionState> {
    return defer(() => {
      const sessionState = untracked(this.#sessionState);
      if (sessionState !== DistributorSessionState.Unknown) {
        return of(sessionState);
      }

      return new Observable<DistributorSessionState>(subscriber => {
        const watcher = effect(
          () => {
            const current = this.#sessionState();
            if (current !== DistributorSessionState.Unknown) {
              subscriber.next(current);
              subscriber.complete();
            }
          },
          { injector: this.#injector },
        );

        return () => watcher.destroy();
      });
    });
  }
}
