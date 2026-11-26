import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PlanLaunchCodeService {
  readonly #http = inject(HttpClient);

  setLaunchCode(partnerId: number, planId: number, launchCode: string | null): Observable<void> {
    return this.#http.put<void>(this.#getLaunchCodeUrl(partnerId, planId), { launch_code: launchCode });
  }

  #getLaunchCodeUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/launch-code/`;
  }
}
