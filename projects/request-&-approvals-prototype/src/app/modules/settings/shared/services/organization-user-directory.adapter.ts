import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { LinkPaginationResponse } from '../../../../shared/models/link-pagination-response';
import {
  OrganizationDirectoryUser,
  OrganizationDirectoryUserData,
  OrganizationDirectoryUserSummary,
} from '../models/organization-directory-user.model';

@Injectable({
  providedIn: 'root',
})
export class OrganizationUserDirectoryAdapter implements AdapterInterface<LinkPaginationResponse<OrganizationDirectoryUserSummary>> {
  fromApi(response: HttpResponse<BaseResponse<OrganizationDirectoryUserData>>): LinkPaginationResponse<OrganizationDirectoryUserSummary> {
    const body = response.body;
    return new LinkPaginationResponse<OrganizationDirectoryUserSummary>(
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

  private getData(data: OrganizationDirectoryUserData | null | undefined): OrganizationDirectoryUserSummary | null {
    if (data == null || !data.users) {
      return null;
    }

    const users: OrganizationDirectoryUser[] = data.users.map(user => new OrganizationDirectoryUser(user.id, user.name, user.email));

    return new OrganizationDirectoryUserSummary(data.count, users);
  }
}
