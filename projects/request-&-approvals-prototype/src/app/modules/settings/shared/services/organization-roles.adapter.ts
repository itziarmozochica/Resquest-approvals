import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseResponse } from '../../../../shared/models/base-response';
import { OrganizationRole, OrganizationRoleData } from '../models/organization-role.model';

@Injectable({
  providedIn: 'root',
})
export class OrganizationRolesAdapter implements AdapterInterface<OrganizationRole[]> {
  fromApi(response: BaseResponse<OrganizationRoleData | null>): OrganizationRole[] {
    return this.#getData(response.data);
  }

  #getData(data: OrganizationRoleData | null): OrganizationRole[] {
    if (data == null || !data.roles) {
      return [];
    }
    return data.roles.map(role => {
      return new OrganizationRole(role.id, role.label, role.is_public, role.active_users_count, role.is_custom_role, role.description);
    });
  }
}
