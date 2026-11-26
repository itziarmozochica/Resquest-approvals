import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { environment } from '@fz-original/environments/environment';
import { Observable, of, throwError, TimeoutError, timer } from 'rxjs';
import { catchError, retry, switchMap } from 'rxjs/operators';

import {
  AiTranslationRequest,
  AiTranslationResult,
  GetPlanAiTranslationOrderResponse,
  StartPlanAiTranslationResponse,
} from '../../models/ai-translation.model';
import {
  mapAiTranslationFields,
  parseAiSessionTypeTranslations,
  parseTranslatedContent,
  requestedAiTranslationFieldKeys,
} from '../../utils/ai-translation-fields.util';

@Injectable({
  providedIn: 'root',
})
export class PartnersAiTranslationAdapter {
  static readonly firstPollDelayMs = 2_000;
  static readonly getTimeoutMs = 15_000;
  static readonly maxNotFoundPolls = 3;
  static readonly maxWaitMs = 240_000;
  static readonly pollIntervalMs = 2_000;
  static readonly startTimeoutMs = 45_000;
  static readonly transportRetryCount = 2;
  static readonly transportRetryDelaysMs: readonly number[] = [300, 900];

  readonly #http = inject(HttpClient);

  translate(request: AiTranslationRequest): Observable<AiTranslationResult> {
    const startedAt = Date.now();
    return this.#startJob(request).pipe(
      switchMap((startResponse: StartPlanAiTranslationResponse) =>
        this.#pollUntilTerminal(request, startResponse.translationOrderId, startedAt, 0, PartnersAiTranslationAdapter.firstPollDelayMs),
      ),
    );
  }

  #collectionUrl(partnerId: number, planId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/ai-translations`;
  }

  #getOrder(
    partnerId: number,
    planId: number,
    translationOrderId: string,
    notFoundCount: number,
  ): Observable<GetPlanAiTranslationOrderResponse | 'not-found'> {
    return this.#http
      .get<GetPlanAiTranslationOrderResponse>(
        this.#orderUrl(partnerId, planId, translationOrderId),
        this.#requestOptions(PartnersAiTranslationAdapter.getTimeoutMs),
      )
      .pipe(
        this.#transportRetry(),
        catchError((error: unknown) => {
          if (this.#isNotFound(error) && notFoundCount < PartnersAiTranslationAdapter.maxNotFoundPolls) {
            return of('not-found' as const);
          }
          return throwError(() => this.#toFailure(error));
        }),
      );
  }

  #isNonTerminal(status: string): boolean {
    return status !== 'completed' && status !== 'failed';
  }

  #isNotFound(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === HttpStatusCode.NotFound;
  }

  #isTransientHttpError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return false;
    }
    return (
      error.status === 0 ||
      error.status === HttpStatusCode.BadGateway ||
      error.status === HttpStatusCode.ServiceUnavailable ||
      error.status === HttpStatusCode.GatewayTimeout
    );
  }

  #orderUrl(partnerId: number, planId: number, translationOrderId: string): string {
    return `${this.#collectionUrl(partnerId, planId)}/${translationOrderId}`;
  }

  #pollUntilTerminal(
    request: AiTranslationRequest,
    translationOrderId: string,
    startedAt: number,
    notFoundCount: number,
    delayMs: number,
  ): Observable<AiTranslationResult> {
    return timer(delayMs).pipe(
      switchMap(() => this.#getOrder(request.partnerId, request.planId, translationOrderId, notFoundCount)),
      switchMap((order: GetPlanAiTranslationOrderResponse | 'not-found') => {
        if (order === 'not-found' || this.#isNonTerminal(order.status)) {
          if (Date.now() - startedAt >= PartnersAiTranslationAdapter.maxWaitMs) {
            return throwError(() => new Error('timeout: AI translation timed out'));
          }
          return this.#pollUntilTerminal(
            request,
            translationOrderId,
            startedAt,
            order === 'not-found' ? notFoundCount + 1 : 0,
            PartnersAiTranslationAdapter.pollIntervalMs,
          );
        }
        if (order.status === 'failed') {
          return throwError(() => new Error(`failed: ${order.errorMessage ?? 'AI translation failed'}`));
        }
        const translatedText = order.translatedText;
        if (translatedText === undefined || translatedText.length === 0) {
          return throwError(() => new Error('invalid-payload: Completed translation is empty'));
        }
        const translatedContent = parseTranslatedContent(translatedText);
        const fields =
          translatedContent === null ? null : mapAiTranslationFields(translatedContent, requestedAiTranslationFieldKeys(request.fields));
        const sessionTypes =
          translatedContent === null ? null : parseAiSessionTypeTranslations(translatedContent.session_types, request.sessionTypes);
        if (fields === null || sessionTypes === null || (Object.keys(fields).length === 0 && sessionTypes.length === 0)) {
          return throwError(() => new Error('invalid-payload: Completed translation does not have the expected format'));
        }
        return of({
          fields,
          model: order.model ?? '',
          sessionTypes,
          translationOrderId: order.translationOrderId,
        });
      }),
    );
  }

  #requestOptions(timeoutMs: number): { context: HttpContext; headers: HttpHeaders } {
    return {
      context: this.#skipGenericRetry(),
      headers: new HttpHeaders({ timeout: String(timeoutMs) }),
    };
  }

  #skipGenericRetry(): HttpContext {
    return new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true);
  }

  #startJob(request: AiTranslationRequest): Observable<StartPlanAiTranslationResponse> {
    return this.#http
      .post<StartPlanAiTranslationResponse>(
        this.#collectionUrl(request.partnerId, request.planId),
        {
          fields: request.fields,
          ...(request.sessionTypes.length > 0 ? { sessionTypes: request.sessionTypes } : {}),
          sourceLocale: request.sourceLocale,
          targetLocale: request.targetLocale,
        },
        this.#requestOptions(PartnersAiTranslationAdapter.startTimeoutMs),
      )
      .pipe(catchError((error: unknown) => throwError(() => this.#toFailure(error))));
  }

  #toFailure(error: unknown): Error {
    if (error instanceof HttpErrorResponse) {
      return new Error(`transport: ${this.#transportMessage(error)}`);
    }
    if (error instanceof TimeoutError) {
      return new Error('transport: AI translation request timed out');
    }
    return new Error('transport: AI translation request failed');
  }

  #transportMessage(error: HttpErrorResponse): string {
    const body: unknown = error.error;
    if (body !== null && typeof body === 'object') {
      const detail = (body as { detail?: unknown }).detail; // narrowing an index probe
      if (typeof detail === 'string' && detail.length > 0) {
        return detail;
      }
    }
    if (typeof error.message === 'string' && error.message.length > 0) {
      return error.message;
    }
    return 'AI translation request failed';
  }

  #transportRetry<T>(): (source$: Observable<T>) => Observable<T> {
    return (source$: Observable<T>) =>
      source$.pipe(
        retry({
          count: PartnersAiTranslationAdapter.transportRetryCount,
          delay: (error: unknown, retryCount: number) => {
            if (!(error instanceof TimeoutError) && !this.#isTransientHttpError(error)) {
              return throwError(() => error);
            }
            const delayMs =
              PartnersAiTranslationAdapter.transportRetryDelaysMs[retryCount - 1] ??
              PartnersAiTranslationAdapter.transportRetryDelaysMs[PartnersAiTranslationAdapter.transportRetryDelaysMs.length - 1];
            return timer(delayMs);
          },
        }),
      );
  }
}
