import { inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Project } from '@fz-original/app/modules/project-management/models/project.model';
import { ProjectsService } from '@fz-original/app/modules/project-management/services/projects.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { IgntToastService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { defer, EMPTY, forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, filter, finalize, map, switchMap, tap } from 'rxjs/operators';

import { withBuiltInStepperTemplates } from '../models/built-in-stepper-templates';
import {
  InformationRequestEvaluationLoadErrorKey,
  informationRequestEvaluationLoadErrorKeyByCode,
  InformationRequestReviewAction,
  InformationRequestReviewErrorKey,
  informationRequestReviewErrorKeyByCode,
  informationRequestReviewI18nKey,
} from '../models/information-request-review.model';
import { InformationRequestStatus } from '../models/information-request-status.enum';
import { InformationRequest } from '../models/information-request.model';
import { templateKeyToBackfill, withTemplateSections } from '../utils/template-sections.util';
import { InformationRequestsService } from './information-requests.service';

@Injectable()
export class InformationRequestEvaluationFacade {
  readonly #informationRequestsService = inject(InformationRequestsService);
  readonly #partnerService = inject(PartnerService);
  readonly #projectsService = inject(ProjectsService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #toastService = inject(IgntToastService);
  readonly #translateService = inject(TranslateService);

  readonly #isLoading = signal<boolean>(true);
  readonly #isSubmitting = signal<boolean>(false);
  readonly #launchName = signal<string | null>(null);
  readonly #loadErrorKey = signal<InformationRequestEvaluationLoadErrorKey | null>(null);
  readonly #partnerId = signal<number | null>(null);
  readonly #request = signal<InformationRequest | null>(null);
  readonly #reviewErrorKey = signal<InformationRequestReviewErrorKey | null>(null);

  readonly isLoading = this.#isLoading.asReadonly();
  readonly isSubmitting = this.#isSubmitting.asReadonly();
  readonly launchName = this.#launchName.asReadonly();
  readonly loadErrorKey = this.#loadErrorKey.asReadonly();
  readonly partnerId = this.#partnerId.asReadonly();
  readonly request = this.#request.asReadonly();
  readonly reviewErrorKey = this.#reviewErrorKey.asReadonly();

  clearReviewError(): void {
    this.#reviewErrorKey.set(null);
  }

  load(launchId: string, requestId: string): Observable<void> {
    return this.#partnerService.observePartner().pipe(
      filter((partner): partner is Partner => partner !== null),
      switchMap(partner => this.#load$(partner.id, launchId, requestId)),
    );
  }

  review(action: InformationRequestReviewAction, reason: string): Observable<void> {
    return defer(() => {
      const ir = this.#request();
      const partnerId = this.#partnerId();
      if (!ir || partnerId === null || this.#isSubmitting()) {
        return EMPTY;
      }
      this.#isSubmitting.set(true);
      this.#reviewErrorKey.set(null);
      return this.#reviewCall$(action, partnerId, ir.id, reason).pipe(
        catchError(() => {
          this.#failReview(InformationRequestReviewErrorKey.Failed);
          return EMPTY;
        }),
        tap(response => {
          this.#projectsService.invalidate(partnerId);
          if (response.error) {
            this.#failReview(
              informationRequestReviewErrorKeyByCode[String(response.error.code)] ?? InformationRequestReviewErrorKey.Failed,
            );
            return;
          }
          this.#toastService.positive(
            this.#translateService.instant(`informationRequests.evaluation.success.${informationRequestReviewI18nKey[action]}`),
          );
          this.#openDetail(ir.id);
        }),
        map((): void => undefined),
      );
    });
  }

  #failReview(key: InformationRequestReviewErrorKey): void {
    this.#reviewErrorKey.set(key);
    this.#isSubmitting.set(false);
  }

  #failLoad(key: InformationRequestEvaluationLoadErrorKey): void {
    this.#loadErrorKey.set(key);
    this.#request.set(null);
  }

  #load$(partnerId: number, launchId: string, requestId: string): Observable<void> {
    this.#partnerId.set(partnerId);
    this.#isLoading.set(true);
    this.#loadErrorKey.set(null);
    this.#request.set(null);
    this.#launchName.set(null);
    this.#reviewErrorKey.set(null);
    this.#isSubmitting.set(false);
    return forkJoin({
      projects: this.#projects$(partnerId),
      response: this.#requestWithTemplateSections$(partnerId, launchId, requestId),
    }).pipe(
      catchError(() => {
        this.#failLoad(InformationRequestEvaluationLoadErrorKey.LoadFailed);
        return EMPTY;
      }),
      tap(({ projects, response }) => {
        if (response.error) {
          this.#failLoad(
            informationRequestEvaluationLoadErrorKeyByCode[String(response.error.code)] ??
              InformationRequestEvaluationLoadErrorKey.LoadFailed,
          );
          return;
        }
        if (!response.data) {
          this.#failLoad(InformationRequestEvaluationLoadErrorKey.NotFound);
          return;
        }
        if (response.data.status !== InformationRequestStatus.SUBMITTED) {
          this.#openDetail(response.data.id);
          return;
        }
        const ir = withBuiltInStepperTemplates(response.data);
        this.#request.set(ir);
        this.#launchName.set(projects?.find(project => project.id === ir.launchId)?.name ?? null);
      }),
      map((): void => undefined),
      finalize(() => this.#isLoading.set(false)),
    );
  }

  #openDetail(requestId: string): void {
    void this.#router.navigate([requestId], { relativeTo: this.#route.parent, replaceUrl: true });
  }

  #projects$(partnerId: number): Observable<Project[] | null> {
    return this.#projectsService.list(partnerId).pipe(
      map(response => (response.error ? null : response.data)),
      catchError(() => of(null)),
    );
  }

  #requestWithTemplateSections$(
    partnerId: number,
    launchId: string,
    requestId: string,
  ): Observable<BaseResponse<InformationRequest | null>> {
    return this.#informationRequestsService.get(partnerId, launchId, requestId).pipe(
      switchMap(response => {
        const ir = response.error ? null : response.data;
        const templateKey = templateKeyToBackfill(ir);
        if (!ir || templateKey === null) {
          return of(response);
        }
        return this.#informationRequestsService.listTemplates(partnerId).pipe(
          map(templatesResponse => {
            const result = withTemplateSections(ir, templateKey, templatesResponse.error ? null : templatesResponse.data);
            return result.template ? new BaseResponse(result.request, response.error) : response;
          }),
          catchError(() => of(response)),
        );
      }),
    );
  }

  #reviewCall$(
    action: InformationRequestReviewAction,
    partnerId: number,
    requestId: string,
    reason: string,
  ): Observable<BaseResponse<{ id: string } | null>> {
    switch (action) {
      case InformationRequestReviewAction.Approve:
        return this.#informationRequestsService.approve(partnerId, requestId);
      case InformationRequestReviewAction.Reject:
        return this.#informationRequestsService.reject(partnerId, requestId, reason);
      case InformationRequestReviewAction.RequestChanges:
        return this.#informationRequestsService.requestChanges(partnerId, requestId, reason);
      default:
        return throwError(() => new Error(`Unknown review action: ${String(action)}`));
    }
  }
}
