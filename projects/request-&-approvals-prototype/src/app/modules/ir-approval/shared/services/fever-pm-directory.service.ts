import { inject, Injectable } from '@angular/core';

import { OrganizationUserStatusEnum } from '@fz-original/app/modules/settings/shared/models/organization-user-status.enum';
import { OrganizationUserSummary } from '@fz-original/app/modules/settings/shared/models/organization-user-summary.model';
import { OrganizationUser } from '@fz-original/app/modules/settings/shared/models/organization-user.model';
import { OrganizationService } from '@fz-original/app/modules/settings/shared/services/organization.service';
import { LinkPaginationResponse } from '@fz-original/app/shared/models/link-pagination-response';
import { AlertDirectoryRow } from '@fz-original/app/shared/services/alert-directory/alert-directory.model';
import { AlertDirectoryService } from '@fz-original/app/shared/services/alert-directory/alert-directory.service';
import { EMPTY, Observable, of } from 'rxjs';
import { expand, map, reduce, switchMap } from 'rxjs/operators';

import { FeverDirectoryRows } from '../models/fever-directory.model';
import { isFeverEmail } from '../utils/fever-email.util';

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

@Injectable({ providedIn: 'root' })
export class FeverPmDirectoryService {
  readonly #organizationService = inject(OrganizationService);
  readonly #directoryService = inject(AlertDirectoryService);

  loadDirectoryRows(organizationId: number, partnerId: number): Observable<FeverDirectoryRows> {
    return this.#fetchActiveUsers(organizationId).pipe(
      switchMap(rows => {
        const allRows = [...rows.pmRows, ...rows.partnerRows];
        if (allRows.length === 0) {
          return of(rows);
        }
        return this.#directoryService
          .resolveSlackIds(
            partnerId,
            allRows.map(row => row.emailNorm),
          )
          .pipe(
            map(response => {
              const slackIds = response.data ?? {};
              const enrich = (row: AlertDirectoryRow): AlertDirectoryRow => ({
                ...row,
                slackUserId: row.slackUserId ?? slackIds[row.emailNorm] ?? null,
              });
              return { pmRows: rows.pmRows.map(enrich), partnerRows: rows.partnerRows.map(enrich) };
            }),
          );
      }),
    );
  }

  #fetchActiveUsers(organizationId: number): Observable<FeverDirectoryRows> {
    return this.#page(organizationId, 1).pipe(
      expand((response, index) => {
        const fetched = (index + 1) * PAGE_SIZE;
        const total = response.data?.total ?? 0;
        const nextPage = index + 2;
        return fetched >= total || nextPage > MAX_PAGES ? EMPTY : this.#page(organizationId, nextPage);
      }),
      reduce((users: OrganizationUser[], response) => users.concat(response.data?.users ?? []), []),
      map(users => this.#toRows(users)),
    );
  }

  #page(organizationId: number, page: number): Observable<LinkPaginationResponse<OrganizationUserSummary | null>> {
    return this.#organizationService.getOrganizationUsers({
      organizationId,
      status: OrganizationUserStatusEnum.ACTIVE,
      page,
      itemsPerPage: PAGE_SIZE,
    });
  }

  #toRows(users: OrganizationUser[]): FeverDirectoryRows {
    const seen = new Set<string>();
    const pmRows: AlertDirectoryRow[] = [];
    const partnerRows: AlertDirectoryRow[] = [];
    for (const user of users) {
      const display = (user.email ?? '').trim();
      const norm = display.toLowerCase();
      if (!norm.includes('@') || !user.isActive() || seen.has(norm)) {
        continue;
      }
      seen.add(norm);
      const row: AlertDirectoryRow = { emailNorm: norm, emailDisplay: display, slackUserId: null, hubUserId: null };
      (isFeverEmail(norm) ? pmRows : partnerRows).push(row);
    }
    return { pmRows, partnerRows };
  }
}
