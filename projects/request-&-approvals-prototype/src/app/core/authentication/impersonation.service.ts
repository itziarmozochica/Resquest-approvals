import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable, Signal } from '@angular/core';

import { STORAGE_SERVICE } from '@fz/storage';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { BaseErrorResponse, BaseResponse } from '../../shared/models/base-response';
import { BusinessAsOrganizationFlagService } from '../../shared/services/distributor/business-as-organization-flag.service';
import { PartnerService } from '../../shared/services/partner/partner.service';
import { UserService } from '../../shared/services/user/user.service';
import { ErrorResponseUtils } from '../../shared/utils/error-response.utils';
import { AuthenticationService } from './authentication.service';
import { ImpersonationMetadataService } from './impersonation-metadata.service';

interface ImpersonationStartData {
  impersonationSessionId: string;
  token: string;
  userId: number;
}

interface ImpersonationStopData {
  token: string;
  userId: number;
}

interface ImpersonationStartResponseData {
  impersonation_session_id: string;
  token: string;
}

interface ImpersonationStopResponseData {
  token: string;
  user_id?: number;
  userId?: number;
}

interface StopImpersonationOptions {
  allowMissingActiveSession: boolean;
  requestBody: { impersonated_session_id: string } | Record<string, never>;
  shouldReload: boolean;
  silentlyPersistSession: boolean;
}

export const activeImpersonationSessionAlreadyExists = 'ACTIVE_IMPERSONATION_SESSION_ALREADY_EXISTS';
const noActiveImpersonationSessionForActor = 'NO_ACTIVE_IMPERSONATION_SESSION_FOR_ACTOR';

@Injectable({
  providedIn: 'root',
})
export class ImpersonationService {
  readonly #authenticationService = inject(AuthenticationService);
  readonly #httpClient = inject(HttpClient);
  readonly #impersonationMetadataService = inject(ImpersonationMetadataService);
  readonly #businessAsOrganizationFlag = inject(BusinessAsOrganizationFlagService);
  readonly #partnerService = inject(PartnerService);
  readonly #storage = inject(STORAGE_SERVICE);
  readonly #userService = inject(UserService);
  readonly impersonatedUserName: Signal<string> = this.#impersonationMetadataService.impersonatedUserName;
  readonly impersonatedUserRole: Signal<string> = this.#impersonationMetadataService.impersonatedUserRole;
  readonly impersonationSessionId: Signal<string> = this.#impersonationMetadataService.impersonationSessionId;
  readonly isImpersonating: Signal<boolean> = this.#impersonationMetadataService.isImpersonating;

  start(userId: number, userName: string, reason: string, userRole = ''): Observable<BaseResponse<ImpersonationStartData | null>> {
    return this.#startImpersonation(userId, userName, reason, userRole);
  }

  stop(): Observable<BaseResponse<ImpersonationStopData | null>> {
    return this.#stopImpersonation({
      allowMissingActiveSession: true,
      requestBody: this.#getStopBody(),
      shouldReload: true,
      silentlyPersistSession: false,
    });
  }

  stopWithoutReload(): Observable<BaseResponse<ImpersonationStopData | null>> {
    return this.#stopImpersonation({
      allowMissingActiveSession: true,
      requestBody: this.#getStopBody(),
      shouldReload: false,
      silentlyPersistSession: false,
    });
  }

  switchImpersonation(
    userId: number,
    userName: string,
    reason: string,
    userRole = '',
  ): Observable<BaseResponse<ImpersonationStartData | null>> {
    return this.#stopImpersonation({
      allowMissingActiveSession: true,
      requestBody: {},
      shouldReload: false,
      silentlyPersistSession: true,
    }).pipe(
      switchMap(stopResponse => {
        if (stopResponse.error) {
          return of(new BaseResponse<ImpersonationStartData | null>(null, stopResponse.error));
        }

        return this.#startImpersonation(userId, userName, reason, userRole);
      }),
    );
  }

  #clearImpersonatedUserCache(): void {
    this.#storage.remove('userName');
    this.#storage.remove(UserService.userKey);
    this.#storage.remove(UserService.organizationCountKey);
  }

  #clearImpersonationMetadata(): void {
    this.#impersonationMetadataService.clear();
  }

  #clearImpersonationMetadataAndReload(): void {
    this.#clearImpersonationMetadata();

    if (window.location.pathname === AuthenticationService.defaultRedirectUrl) {
      window.location.reload();
      return;
    }

    window.location.href = AuthenticationService.defaultRedirectUrl;
  }

  #getStartUrl(): string {
    return `${environment.apiIamBaseUrl}/1.0/impersonation/start`;
  }

  #getStopBody(): { impersonated_session_id: string } | Record<string, never> {
    const impersonationSessionId = this.#impersonationMetadataService.impersonationSessionId();

    if (impersonationSessionId == null || impersonationSessionId.length === 0) {
      return {};
    }

    return {
      impersonated_session_id: impersonationSessionId,
    };
  }

  #getStopUrl(): string {
    return `${environment.apiIamBaseUrl}/1.0/impersonation/stop`;
  }

  #getUserIdFromToken(token: string): number | null {
    try {
      const [, payload] = token.split('.');

      if (payload == null) {
        return null;
      }

      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4), '=');
      const decodedPayload = JSON.parse(atob(paddedPayload)) as { user_id?: number };

      return decodedPayload.user_id ?? null;
    } catch {
      return null;
    }
  }

  #mapStartError(error: BaseErrorResponse | null | undefined): BaseErrorResponse | null {
    if (!error) {
      return null;
    }

    if (error.code === activeImpersonationSessionAlreadyExists) {
      return {
        ...error,
        message: 'userManagement.impersonation.activeSessionExists',
      };
    }

    return error;
  }

  #mapStartResponse(data: ImpersonationStartResponseData, userId: number): ImpersonationStartData {
    return {
      impersonationSessionId: data.impersonation_session_id,
      token: data.token,
      userId,
    };
  }

  #mapStopResponse(data: ImpersonationStopResponseData): ImpersonationStopData {
    const userId = data.user_id ?? data.userId ?? this.#getUserIdFromToken(data.token);

    if (userId == null) {
      throw new Error('User ID is required to stop impersonation');
    }

    return {
      token: data.token,
      userId,
    };
  }

  #persistImpersonationMetadata(impersonationSessionId: string, userName: string, userRole: string): void {
    this.#impersonationMetadataService.persist(userName, userRole, impersonationSessionId);
  }

  #persistRestoredSession(token: string, userId: number): void {
    this.#clearImpersonatedUserCache();
    this.#authenticationService.applyToken(token, userId);
  }

  #persistRestoredSessionSilently(token: string, userId: number): void {
    this.#clearImpersonatedUserCache();
    this.#authenticationService.applyTokenSilently(token, userId);
  }

  #refreshOrganizationCount(userId: number): Observable<unknown> {
    return this.#userService
      .getOrganizations({
        itemsPerPage: 1,
        operatingPlatform: 'feverzone',
        page: 1,
        showBookingAgents: this.#businessAsOrganizationFlag.isEnabledGlobally(),
        showDeleted: false,
        userId,
      })
      .pipe(catchError(() => of(null)));
  }

  #startImpersonation(
    userId: number,
    userName: string,
    reason: string,
    userRole: string,
  ): Observable<BaseResponse<ImpersonationStartData | null>> {
    const organizationId = this.#partnerService.getPartner()?.id;
    const startRequest$ =
      organizationId == null
        ? throwError(() => new Error('Organization ID is required to start impersonation'))
        : this.#httpClient
            .post<
              BaseResponse<ImpersonationStartResponseData>
            >(this.#getStartUrl(), { impersonated_user_id: userId, organization_id: organizationId, reason }, { observe: 'response' })
            .pipe(
              switchMap((response: HttpResponse<BaseResponse<ImpersonationStartResponseData>>) => {
                if (response.ok && response.body?.data) {
                  const impersonationData = this.#mapStartResponse(response.body.data, userId);
                  return of(new BaseResponse(impersonationData, null));
                }

                if (response.body?.error) {
                  return of(new BaseResponse<ImpersonationStartData | null>(null, this.#mapStartError(response.body.error)));
                }

                return of(new BaseResponse<ImpersonationStartData | null>(null, { code: 'unknown', message: 'errors.generic' }));
              }),
            );

    return startRequest$.pipe(
      switchMap(response => {
        if (!response.data) {
          return of(response);
        }

        this.#authenticationService.applyToken(response.data.token, response.data.userId);
        this.#persistImpersonationMetadata(response.data.impersonationSessionId, userName, userRole);
        window.location.href = AuthenticationService.defaultRedirectUrl;

        return of(response);
      }),
      catchError(error => {
        return of(
          new BaseResponse<ImpersonationStartData | null>(null, this.#mapStartError(ErrorResponseUtils.getErrorResponseError(error))),
        );
      }),
    );
  }

  #stopImpersonation(options: StopImpersonationOptions): Observable<BaseResponse<ImpersonationStopData | null>> {
    return this.#httpClient
      .post<BaseResponse<ImpersonationStopResponseData>>(this.#getStopUrl(), options.requestBody, { observe: 'response' })
      .pipe(
        switchMap((response: HttpResponse<BaseResponse<ImpersonationStopResponseData>>) => {
          if (response.ok && response.body?.data) {
            const impersonationData = this.#mapStopResponse(response.body.data);

            if (options.silentlyPersistSession) {
              this.#persistRestoredSessionSilently(impersonationData.token, impersonationData.userId);
            } else {
              this.#persistRestoredSession(impersonationData.token, impersonationData.userId);
            }

            if (options.shouldReload) {
              return this.#refreshOrganizationCount(impersonationData.userId).pipe(
                switchMap(() => {
                  this.#clearImpersonationMetadataAndReload();
                  return of(new BaseResponse(impersonationData, null));
                }),
              );
            }

            this.#clearImpersonationMetadata();
            return of(new BaseResponse(impersonationData, null));
          }

          if (response.body?.error) {
            return of(new BaseResponse<ImpersonationStopData | null>(null, response.body.error));
          }

          return of(new BaseResponse<ImpersonationStopData | null>(null, { code: 'unknown', message: 'errors.generic' }));
        }),
        catchError(error => {
          const errorResponse = ErrorResponseUtils.getErrorResponseError(error);

          if (errorResponse.code === noActiveImpersonationSessionForActor && options.allowMissingActiveSession) {
            if (options.shouldReload) {
              this.#clearImpersonationMetadataAndReload();
            } else {
              this.#clearImpersonationMetadata();
            }

            return of(new BaseResponse<ImpersonationStopData | null>(null, null));
          }

          return of(new BaseResponse<ImpersonationStopData | null>(null, errorResponse));
        }),
      );
  }
}
