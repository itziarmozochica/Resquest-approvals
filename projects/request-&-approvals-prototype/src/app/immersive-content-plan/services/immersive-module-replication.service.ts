import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SKIP_FORBIDDEN_TOAST } from '@fz-original/app/shared/interceptors/skip-forbidden-toast.token';
import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { environment } from '@fz-original/environments/environment';
import type { Observable } from 'rxjs';

import type { ReplicationRequestBody, ReplicationResponse } from '../models/immersive-module-replication.model';

@Injectable()
export class ImmersiveModuleReplicationService {
  readonly #http = inject(HttpClient);

  replicateModule(partnerId: number, moduleId: string, body: ReplicationRequestBody): Observable<ReplicationResponse> {
    // A 403 is a per-module outcome the dialog reports itself, and the upstream patches every plan
    // before answering, so a generic replay would re-run the whole batch.
    const context = new HttpContext().set(SKIP_FORBIDDEN_TOAST, true).set(SKIP_RETRY_INTERCEPTOR, true);
    return this.#http.patch<ReplicationResponse>(
      `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/planview-layout/modules/${encodeURIComponent(moduleId)}`,
      body,
      { context },
    );
  }
}
