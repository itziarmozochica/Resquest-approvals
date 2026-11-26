import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { LinkPaginationResponse } from '../../../../shared/models/link-pagination-response';
import { OrganizationUserSummary } from '../models/organization-user-summary.model';
import { OrganizationUserWhitelabelResource } from '../models/organization-user-whitelabel-resource.model';
import { OrganizationUser, OrganizationUserData } from '../models/organization-user.model';

@Injectable({
  providedIn: 'root',
})
export class OrganizationUsersAdapter implements AdapterInterface<LinkPaginationResponse<OrganizationUserSummary>> {
  fromApi(response: HttpResponse<BaseResponse<OrganizationUserData>>): LinkPaginationResponse<OrganizationUserSummary> {
    const body = response.body;
    return new LinkPaginationResponse<OrganizationUserSummary>(
      response.headers.get('Link'),
      this.getData(body?.data),
      this.getError(body?.error),
    );
  }

  private getError(data: BaseErrorResponse | null) {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(data: OrganizationUserData | null | undefined): OrganizationUserSummary | null {
    let organizationUsersSummary: OrganizationUserSummary | null = null;
    if (data != null && data.users) {
      const total: number = data.count;
      const users: OrganizationUser[] = data.users.map(user => {
        const whitelabelResources = (user.whitelabel_resources ?? []).map(
          resource => new OrganizationUserWhitelabelResource(resource.whitelabel_id, resource.whitelabel_role),
        );
        return new OrganizationUser(
          user.id,
          user.name,
          user.email,
          user.status_in_organization,
          user.role_id,
          user.resource_access_type,
          user.venue_ids,
          user.plan_ids,
          undefined,
          undefined,
          whitelabelResources,
          user.type,
          user.joined_at ?? null,
        );
      });
      organizationUsersSummary = new OrganizationUserSummary(total, users);
    }
    return organizationUsersSummary;
  }
}
