import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { LinkPaginationResponse } from '../../../models/link-pagination-response';
import { OrganizationSummary, OrganizationSummaryData } from '../../../models/organization/organization-summary.model';
import { Organization } from '../../../models/organization/organization.model';

@Injectable({
  providedIn: 'root',
})
export class UserOrganizationAdapter implements AdapterInterface<LinkPaginationResponse<OrganizationSummary>> {
  fromApi(response: HttpResponse<BaseResponse<OrganizationSummaryData>>): LinkPaginationResponse<OrganizationSummary> {
    const body: BaseResponse<OrganizationSummaryData> | null = response.body;
    return new LinkPaginationResponse<OrganizationSummary>(
      response.headers.get('Link'),
      this.getData(body?.data),
      this.getError(body?.error),
    );
  }

  private getData(data: OrganizationSummaryData | null | undefined): OrganizationSummary | null {
    let organizationSummary: OrganizationSummary | null = null;
    if (data != null && data.organizations !== undefined) {
      const total = data.count;
      const organizations: Organization[] = data.organizations.map(organization => {
        return new Organization(
          organization.id,
          organization.name,
          organization.country_code,
          organization.city_code,
          organization.type,
          organization.deleted_at,
          organization.user_role_in_organization ?? null,
          organization.category,
          organization.partner_organization_ids,
        );
      });
      organizationSummary = new OrganizationSummary(total, organizations, data.other_operating_platforms ?? []);
    }
    return organizationSummary;
  }

  private getError(data: BaseErrorResponse | null | undefined) {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }
}
