import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { BaseResponse } from '../../../../shared/models/base-response';
import { LinkPaginationResponse } from '../../../../shared/models/link-pagination-response';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import { OrganizationDirectoryUserData, OrganizationDirectoryUserSummary } from '../models/organization-directory-user.model';
import { OrganizationRoleModulesPermissionsPayload } from '../models/organization-role-module-permissions.model';
import { OrganizationRole, OrganizationRoleData } from '../models/organization-role.model';
import { OrganizationUserSummary } from '../models/organization-user-summary.model';
import { OrganizationUserWhitelabelResource, WHITELABEL_CONTENT_MANAGER_ROLE } from '../models/organization-user-whitelabel-resource.model';
import { OrganizationUser, OrganizationUserData } from '../models/organization-user.model';
import { OrganizationRoleQuery } from './organization-role-query';
import { OrganizationRolesAdapter } from './organization-roles.adapter';
import { OrganizationUserDirectoryAdapter } from './organization-user-directory.adapter';
import { OrganizationUsersQuery } from './organization-users-query';
import { OrganizationUsersAdapter } from './organization-users.adapter';

@Injectable({
  providedIn: 'root',
})
export class OrganizationService {
  #httpClient = inject(HttpClient);
  #organizationRolesAdapter = inject(OrganizationRolesAdapter);
  #organizationUserDirectoryAdapter = inject(OrganizationUserDirectoryAdapter);
  #organizationUsersAdapter = inject(OrganizationUsersAdapter);

  createOrganizationUser(organizationId: number, organizationUser: OrganizationUser): Observable<BaseResponse<OrganizationUser | null>> {
    const path = this.#createOrganizationUserUrl(organizationId);

    return this.#httpClient
      .post<BaseResponse<{ user_id: number; api_key?: string | null; has_existing_api_key?: boolean } | number>>(
        path,
        {
          email: organizationUser.email,
          name: organizationUser.name,
          role_id: organizationUser.roleId,
          resource_access_type: organizationUser.resourceAccessType,
          venue_ids: organizationUser.placeIds,
          plan_ids: organizationUser.planIds,
        },
        { observe: 'response' },
      )
      .pipe(
        switchMap(
          (response: HttpResponse<BaseResponse<{ user_id: number; api_key?: string | null; has_existing_api_key?: boolean } | number>>) => {
            if (response.status === 201) {
              const data = response.body?.data;
              const isDataObject = data !== null && typeof data === 'object';
              const apiKey = isDataObject && 'api_key' in data ? (data.api_key ?? null) : null;
              const hasExistingApiKey = isDataObject && 'has_existing_api_key' in data ? data.has_existing_api_key === true : false;
              let userId = organizationUser.id;
              if (isDataObject && 'user_id' in data) {
                userId = data.user_id;
              } else if (typeof data === 'number') {
                userId = data;
              }
              const createdUser = new OrganizationUser(
                userId,
                organizationUser.name,
                organizationUser.email,
                organizationUser.status,
                organizationUser.roleId,
                organizationUser.resourceAccessType,
                organizationUser.placeIds,
                organizationUser.planIds,
                apiKey,
                hasExistingApiKey,
                organizationUser.whitelabelResources,
                organizationUser.type,
              );
              return of(new BaseResponse(createdUser, null));
            }
            let error = null;
            if (response.body?.error) {
              error = { code: response.body.error.code, message: 'errors.generic' };
            }
            return of(new BaseResponse(null, error));
          },
        ),
        catchError(error => {
          return ErrorResponseUtils.getErrorResponse<OrganizationUser | null>(error);
        }),
      );
  }

  createOrganizationUserWhitelabelResource(
    organizationId: number,
    userId: number,
    resource: OrganizationUserWhitelabelResource,
  ): Observable<BaseResponse<void>> {
    const path = this.#createOrganizationUserWhitelabelResourceUrl(organizationId, userId);

    return this.#httpClient
      .post(
        path,
        {
          whitelabel_id: resource.whitelabelId,
          whitelabel_role: resource.whitelabelRole || WHITELABEL_CONTENT_MANAGER_ROLE,
        },
        { observe: 'response' },
      )
      .pipe(
        switchMap((response: HttpResponse<unknown>) => {
          if (response.status === 200 || response.status === 201) {
            return of(new BaseResponse<void>(undefined, null));
          }
          return of(new BaseResponse<void>(undefined, { code: 'unknown', message: 'errors.generic' }));
        }),
        catchError(error => ErrorResponseUtils.getErrorResponse<void>(error)),
      );
  }

  deleteOrganizationUserWhitelabelResource(organizationId: number, userId: number, whitelabelId: string): Observable<BaseResponse<void>> {
    const path = this.#deleteOrganizationUserWhitelabelResourceUrl(organizationId, userId, whitelabelId);

    return this.#httpClient.delete(path, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<unknown>) => {
        if (response.status === 200 || response.status === 204) {
          return of(new BaseResponse<void>(undefined, null));
        }
        return of(new BaseResponse<void>(undefined, { code: 'unknown', message: 'errors.generic' }));
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<void>(error)),
    );
  }

  getOrganizationOwnedWhitelabels(organizationId: number): Observable<string[]> {
    const path = this.#getOrganizationOwnedWhitelabelsUrl(organizationId);

    return this.#httpClient.get<BaseResponse<{ whitelabel_ids: string[] } | null>>(path).pipe(
      map(result => result.data?.whitelabel_ids ?? []),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  deactivateOrganizationUser(organizationId: number, userId: number): Observable<BaseResponse<any>> {
    const path = this.#deactivateOrganizationUserUrl(organizationId, userId);

    return this.#httpClient.post(path, null, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<any>) => {
        if (response.status === 204) {
          return of(new BaseResponse({}, null));
        }
        let error = null;
        if (response.body.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return of(new BaseResponse(null, error));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<any>(error);
      }),
    );
  }

  disableOrganizationMfa(organizationId: number): Observable<BaseResponse<void>> {
    const path = this.#disableOrganizationMfaUrl(organizationId);

    return this.#httpClient.post<void>(path, null, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<void>) => {
        if (response.status === 200 || response.status === 204) {
          return of(new BaseResponse<void>(undefined, null));
        }
        return of(new BaseResponse<void>(undefined, { code: 'unknown', message: 'errors.generic' }));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<void>(error);
      }),
    );
  }

  enableOrganizationMfa(organizationId: number): Observable<BaseResponse<void>> {
    const path = this.#enableOrganizationMfaUrl(organizationId);

    return this.#httpClient.post<void>(path, null, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<void>) => {
        if (response.status === 200 || response.status === 204) {
          return of(new BaseResponse<void>(undefined, null));
        }
        return of(new BaseResponse<void>(undefined, { code: 'unknown', message: 'errors.generic' }));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<void>(error);
      }),
    );
  }

  getOrganizationMfaStatus(organizationId: number): Observable<BaseResponse<boolean | null>> {
    const path = this.#getOrganizationMfaStatusUrl(organizationId);

    return this.#httpClient.get<{ data: { mfa_required: boolean }; error: unknown }>(path).pipe(
      switchMap((response: { data: { mfa_required: boolean }; error: unknown }) => {
        return of(new BaseResponse<boolean>(response.data.mfa_required, null));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<boolean>(error);
      }),
    );
  }

  getOrganizationRoles(organizationId: number, queryParameters: OrganizationRoleQuery): Observable<OrganizationRole[]> {
    const path: string = this.#getOrganizationRolesUrl(organizationId);
    const params: HttpParams = this.#getOrganizationRolesParameters(queryParameters);
    return this.#httpClient.get<BaseResponse<OrganizationRoleData | null>>(path, { params }).pipe(
      map((result: BaseResponse<OrganizationRoleData | null>) => this.#organizationRolesAdapter.fromApi(result)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getRoleModulePermissions(organizationId: number, roleId: string): Observable<OrganizationRoleModulesPermissionsPayload> {
    const path = this.#getRoleModulePermissionsUrl(organizationId, roleId);
    return this.#httpClient.get<BaseResponse<OrganizationRoleModulesPermissionsPayload | null>>(path).pipe(
      map((result: BaseResponse<OrganizationRoleModulesPermissionsPayload | null>) => result.data ?? { modules: [] }),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  createOrganizationRole(
    organizationId: number,
    roleData: {
      label: string;
      description: string;
      isPublic: boolean;
    },
  ): Observable<void> {
    const path: string = this.#createOrganizationRoleUrl(organizationId);
    const payload = {
      label: roleData.label,
      description: roleData.description,
      is_public: roleData.isPublic,
    };
    return this.#httpClient
      .post<void>(path, payload)
      .pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  updateOrganizationRole(
    organizationId: number,
    roleId: string,
    roleData: {
      label: string;
      description: string;
      isPublic: boolean;
    },
  ): Observable<void> {
    const path = this.#updateOrganizationRoleUrl(organizationId);
    const payload = {
      description: roleData.description,
      is_public: roleData.isPublic,
      label: roleData.label,
      role_id: roleId,
    };
    return this.#httpClient
      .put<void>(path, payload)
      .pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  getOrganizationUsers(queryParameters: OrganizationUsersQuery): Observable<LinkPaginationResponse<OrganizationUserSummary | null>> {
    const path: string = this.#getOrganizationUsersUrl(queryParameters.organizationId);
    const params: HttpParams = this.#getOrganizationParameters(queryParameters);
    return this.#httpClient.get<BaseResponse<OrganizationUserData>>(path, { observe: 'response', params }).pipe(
      switchMap((result: HttpResponse<BaseResponse<OrganizationUserData>>) => {
        return of(this.#organizationUsersAdapter.fromApi(result) as LinkPaginationResponse<OrganizationUserSummary>);
      }),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<OrganizationUserSummary>(error)),
    );
  }

  getOrganizationUserDirectory(
    queryParameters: OrganizationUsersQuery,
  ): Observable<LinkPaginationResponse<OrganizationDirectoryUserSummary | null>> {
    const path: string = this.#getOrganizationUserDirectoryUrl(queryParameters.organizationId);
    const params: HttpParams = this.#getOrganizationUserDirectoryParameters(queryParameters);
    return this.#httpClient.get<BaseResponse<OrganizationDirectoryUserData>>(path, { observe: 'response', params }).pipe(
      switchMap((result: HttpResponse<BaseResponse<OrganizationDirectoryUserData>>) => {
        return of(this.#organizationUserDirectoryAdapter.fromApi(result) as LinkPaginationResponse<OrganizationDirectoryUserSummary>);
      }),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<OrganizationDirectoryUserSummary>(error)),
    );
  }

  reactivateOrganizationUser(organizationId: number, userId: number): Observable<BaseResponse<any>> {
    const path = this.#reactivateOrganizationUserUrl(organizationId, userId);

    return this.#httpClient.post(path, null, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<any>) => {
        if (response.status === 204) {
          return of(new BaseResponse({}, null));
        }
        let error = null;
        if (response.body.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return of(new BaseResponse(null, error));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<any>(error);
      }),
    );
  }

  resetOrganizationUserMfa(organizationId: number, userId: number): Observable<BaseResponse<any>> {
    const path = this.#resetOrganizationUserMfaUrl(organizationId, userId);

    return this.#httpClient.delete(path, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<any>) => {
        if (response.status === 200 || response.status === 204) {
          return of(new BaseResponse({}, null));
        }
        let error = null;
        if (response.body?.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return of(new BaseResponse(null, error));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<any>(error);
      }),
    );
  }

  resetOrganizationUserPassword(username: string): Observable<BaseResponse<any>> {
    const path = this.#resetOrganizationUserPasswordUrl();

    return this.#httpClient.post(path, { username: username }, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<any>) => {
        if (response.status === 200) {
          return of(new BaseResponse({}, null));
        }
        let error = null;
        if (response.body.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return of(new BaseResponse(null, error));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<any>(error);
      }),
    );
  }

  updateOrganizationUser(organizationId: number, organizationUser: OrganizationUser): Observable<BaseResponse<OrganizationUser | null>> {
    const path = this.#updateOrganizationUserUrl(organizationId, organizationUser.id);

    const body: Record<string, unknown> = {
      plan_ids: organizationUser.planIds,
      resource_access_type: organizationUser.resourceAccessType,
      role_id: organizationUser.roleId,
      venue_ids: organizationUser.placeIds,
    };
    const trimmedName = organizationUser.name?.trim();
    if (trimmedName) {
      body['name'] = trimmedName;
    }

    return this.#httpClient.put<BaseResponse<number>>(path, body, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<BaseResponse<number>>) => {
        if (response.status === 204) {
          return of(new BaseResponse(organizationUser, null));
        }
        let error = null;
        if (response.body?.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return of(new BaseResponse<OrganizationUser | null>(null, error));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<OrganizationUser | null>(error);
      }),
    );
  }

  deactivateOrganizationRole(organizationId: number, roleId: string): Observable<BaseResponse<void | null>> {
    const path: string = this.#removeOrganizationRolesUrl(organizationId);
    const payload = { role_id: roleId };

    return this.#httpClient.delete<void>(path, { body: payload, observe: 'response' }).pipe(
      switchMap((response: HttpResponse<void>) => {
        if (response.status === 204 || response.status === 200) {
          return of(new BaseResponse<void>(undefined, null));
        }
        return of(new BaseResponse<void | null>(null, { code: 'UNKNOWN_ERROR', message: 'errors.generic' }));
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<void | null>(error)),
    );
  }

  updateRoleModulePermissions(
    organizationId: number,
    roleId: string,
    moduleName: string,
    grantPermissions: string[],
    revokePermissions: string[],
  ): Observable<void> {
    const path = this.#updateRoleModulePermissionsUrl(organizationId, roleId, moduleName);
    const payload = {
      grant_permissions: grantPermissions,
      revoke_permissions: revokePermissions,
    };
    return this.#httpClient
      .patch<void>(path, payload)
      .pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  #createOrganizationUserUrl(organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/users`;
  }

  #deactivateOrganizationUserUrl(organizationId: number, userId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/users/${userId}/deactivate`;
  }

  #disableOrganizationMfaUrl(organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/mfa/disable`;
  }

  #enableOrganizationMfaUrl(organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/mfa/enable`;
  }

  #getOrganizationMfaStatusUrl(organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/mfa`;
  }

  #getOrganizationParameters(parameters: OrganizationUsersQuery): HttpParams {
    let params = new HttpParams();
    params = params.set('items_per_page', parameters.itemsPerPage ? parameters.itemsPerPage.toString() : 25);
    params = params.set('page', parameters.page ? parameters.page.toString() : 1);
    if (parameters.search) {
      params = params.set('search', parameters.search);
    }
    if (parameters.status) {
      params = params.set('status_in_organization', parameters.status);
    }
    if (parameters.roleIds) {
      parameters.roleIds.map(roleId => {
        params = params.append('role_ids', roleId);
      });
    }
    return params;
  }

  #getOrganizationRolesParameters(parameters: OrganizationRoleQuery): HttpParams {
    let params = new HttpParams();

    if (parameters.roleId) {
      params = params.set('id', parameters.roleId);
    }

    if (parameters.label) {
      params = params.set('label', parameters.label);
    }

    if (parameters.includeHidden !== undefined) {
      params = params.set('include_hidden', parameters.includeHidden);
    }

    if (parameters.includeActiveUsersCount !== undefined) {
      params = params.set('include_active_users_count', parameters.includeActiveUsersCount);
    }
    return params;
  }

  #getOrganizationRolesUrl(organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/roles`;
  }

  #getRoleModulePermissionsUrl(organizationId: number, roleId: string): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/roles/${roleId}/modules/permissions`;
  }

  #createOrganizationRoleUrl(organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/role`;
  }

  #getOrganizationUsersUrl(organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/users`;
  }

  #getOrganizationUserDirectoryUrl(organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/user-directory`;
  }

  #getOrganizationUserDirectoryParameters(parameters: OrganizationUsersQuery): HttpParams {
    let params = new HttpParams();
    params = params.set('items_per_page', parameters.itemsPerPage ? parameters.itemsPerPage.toString() : 25);
    params = params.set('page', parameters.page ? parameters.page.toString() : 1);
    if (parameters.search) {
      params = params.set('search', parameters.search);
    }
    return params;
  }

  #reactivateOrganizationUserUrl(organizationId: number, userId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/users/${userId}/reactivate`;
  }

  #resetOrganizationUserMfaUrl(organizationId: number, userId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/users/${userId}/mfa`;
  }

  #resetOrganizationUserPasswordUrl(): string {
    return `${environment.apiIamBaseUrl}/1.0/users/request-password`;
  }

  #updateOrganizationUserUrl(organizationId: number, userId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/users/${userId}`;
  }

  #removeOrganizationRolesUrl(organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/role`;
  }

  #updateRoleModulePermissionsUrl(organizationId: number, roleId: string, moduleName: string): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/roles/${roleId}/modules/${moduleName}`;
  }

  #updateOrganizationRoleUrl(organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/role`;
  }

  #createOrganizationUserWhitelabelResourceUrl(organizationId: number, userId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/users/${userId}/whitelabel-resources`;
  }

  #deleteOrganizationUserWhitelabelResourceUrl(organizationId: number, userId: number, whitelabelId: string): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/users/${userId}/whitelabel-resources/${whitelabelId}`;
  }

  #getOrganizationOwnedWhitelabelsUrl(organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/owned-whitelabels`;
  }
}
