import { computed, effect, inject, Injectable, linkedSignal, Signal, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { EMPTY } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { userMfaPolicyStatus, UserMfaStatus } from '../../models/user/user-mfa.model';
import { UserSecuritySnapshot } from '../../models/user/user-security.model';
import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { UserService } from './user.service';

type UserSecurityStatusSource = {
  readonly featuresEnabled: boolean;
  readonly userId: number | null;
};

type UserSecurityState = {
  readonly mfa: UserMfaStatus | null;
  readonly ssoEnabled: boolean;
};

const emptySecurityState: UserSecurityState = {
  mfa: null,
  ssoEnabled: false,
};

@Injectable({
  providedIn: 'root',
})
export class UserMfaStatusService {
  readonly #authentication = inject(AuthenticationService);
  readonly #optimizely = inject(OptimizelyService);
  readonly #userService = inject(UserService);

  // Re-read on every Optimizely user-data emission: the flag is null until `setUserId` runs, which can be after this service exists.
  readonly featuresEnabled: Signal<boolean> = toSignal(
    this.#optimizely.observeUserData().pipe(
      map(
        (): boolean =>
          this.#optimizely.isFeatureEnabled({
            optimizelyFeatureKey: FeatureFlags.SHOW_USER_MFA_FEATURES,
            team: 'b2b',
          }) === true,
      ),
    ),
    { initialValue: false },
  );

  /** Logged-in user id only (`number | null`); not the full user model. */
  readonly #userId: Signal<number | null> = toSignal(this.#authentication.observeUser(), { initialValue: null });

  /**
   * MFA + SSO snapshot owned by this service, not by the user cache.
   * Reloaded via {@link UserService.getUserSecurityFromMe} so enrollment can refresh
   * security without emitting on user$ (that would look like a user change and risk
   * cascading side effects).
   * Resets when the logged-in user or MFA feature flag changes.
   */
  readonly #securityState: WritableSignal<UserSecurityState> = linkedSignal<UserSecurityStatusSource, UserSecurityState>({
    source: (): UserSecurityStatusSource => ({
      featuresEnabled: this.featuresEnabled(),
      userId: this.#userId(),
    }),
    computation: (): UserSecurityState => emptySecurityState,
  });

  readonly status: Signal<UserMfaStatus | null> = computed((): UserMfaStatus | null => {
    const featuresEnabled: boolean = this.featuresEnabled();
    const securityState: UserSecurityState = this.#securityState();

    if (!featuresEnabled) {
      return null;
    }

    return securityState.mfa;
  });

  readonly ssoEnabled: Signal<boolean> = computed((): boolean => {
    const featuresEnabled: boolean = this.featuresEnabled();
    const securityState: UserSecurityState = this.#securityState();

    if (!featuresEnabled) {
      return false;
    }

    return securityState.ssoEnabled;
  });

  readonly enforcedAt: Signal<string | null> = computed((): string | null => {
    const status: UserMfaStatus | null = this.status();
    return status?.policy.enforcedAt ?? null;
  });

  /** True when MFA features are on and the user must enroll (`grace_period` or `required`). False when SSO is enabled. */
  readonly isSetupRequired: Signal<boolean> = computed((): boolean => {
    const ssoEnabled: boolean = this.ssoEnabled();
    const status: UserMfaStatus | null = this.status();

    if (ssoEnabled) {
      return false;
    }

    if (status === null) {
      return false;
    }

    if (status.enrolled || status.excluded) {
      return false;
    }

    const policyStatus: UserMfaStatus['policy']['status'] = status.policy.status;
    return policyStatus === userMfaPolicyStatus.gracePeriod || policyStatus === userMfaPolicyStatus.required;
  });

  constructor() {
    effect(() => {
      const featuresEnabled: boolean = this.featuresEnabled();
      const userId: number | null = this.#userId();

      if (featuresEnabled && userId !== null) {
        this.reload();
      }
    });
  }

  reload(): void {
    this.#userService
      .getUserSecurityFromMe()
      .pipe(catchError(() => EMPTY))
      .subscribe((snapshot: UserSecuritySnapshot): void => {
        this.#securityState.set({
          mfa: snapshot.mfa,
          ssoEnabled: snapshot.ssoEnabled,
        });
      });
  }
}
