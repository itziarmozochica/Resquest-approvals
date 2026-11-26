import { inject, Injectable } from '@angular/core';

import { defer, Observable, of } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';

import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { PartnerExternalIdsService } from '../partner/partner-external-ids.service';
import { Permissions } from '../user/permissions';
import { UserService } from '../user/user.service';

@Injectable({
  providedIn: 'root',
})
export class ReportingAccessService {
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerExternalIdsService = inject(PartnerExternalIdsService);
  readonly #userService = inject(UserService);

  canAccess$(): Observable<boolean> {
    return this.#canAccess$(false);
  }

  canAccessDashboard$(): Observable<boolean> {
    const mergeDashboard360Enabled =
      this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.MERGE_DASHBOARD_360_ANALYTICS, team: 'data' }) ?? false;

    return this.#canAccess$(mergeDashboard360Enabled);
  }

  #canAccess$(skipExternalIds: boolean): Observable<boolean> {
    const killSwitchEnabled =
      this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.SHOW_REPORTING_MODULE, team: 'data' }) ?? false;

    if (!killSwitchEnabled) {
      return of(false);
    }

    return defer(() => this.#userService.getPermissionsInOrganization()).pipe(
      mergeMap(() => {
        if (!this.#userService.hasPermission(Permissions.CAN_VIEW_REPORTS)) {
          return of(false);
        }

        if (skipExternalIds) {
          return of(true);
        }

        return this.#partnerExternalIdsService.isExternalPartner(this.#userService.partnerId);
      }),
      catchError(() => of(false)),
    );
  }
}
