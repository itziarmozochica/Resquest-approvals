import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

import { SendBookingAnswersEvent } from '@fz-original/app/core/tracking/core/events/send-booking-answers';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import type { DistributorTarget } from '@fz/reservations';
import { connectable, EMPTY, forkJoin, Observable, of, OperatorFunction, pipe, ReplaySubject, Subscription, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { BaseResponse } from '../models/base-response';
import { Order } from '../models/order/order.model';
import { FeatureFlags } from '../optimizely/feature-flags';
import { OptimizelyService } from '../optimizely/optimizely.service';
import { DistributorRouteService, scopedOrganizationHeader } from '../services/distributor/distributor-route.service';
import { DISTRIBUTOR_PARTNER_NOT_SELECTED } from '../services/distributor/distributor-target.service';
import { PartnerService } from '../services/partner/partner.service';
import { ErrorResponseUtils } from '../utils/error-response.utils';
import { adaptBookingQuestionResponse, adaptBookingQuestionWithAnswersResponse } from './adapters/adapt-booking-questions-response';
import { adaptCartBookingQuestionsAnswers } from './adapters/adapt-cart-booking-questions-answers';
import { adaptToBookingQuestionAnswerPayload } from './adapters/adapt-to-booking-question-answer-payload';
import { adaptToTicketAnswer } from './adapters/adapt-to-ticket-answer';
import { mergeBookingAnswersErrors } from './adapters/booking-answers-error.adapter';
import { normalizeSelectionBookingQuestionResponse } from './adapters/normalize-selection-booking-question-response';
import { CartBookingQuestionsCacheService } from './cart-booking-questions-cache.service';
import {
  BookingQuestion,
  BookingQuestionAnswers,
  BookingQuestionOrderDetails,
  BookingQuestionsFormData,
  BookingQuestionTicketDetails,
  BookingQuestionWhen,
  BookingQuestionWithAnswers,
  CartBookingQuestionsAnswers,
  OrderBookingQuestions,
} from './models';
import { BookingAnswerPayload } from './models/booking-answer-payload';
import { BookingQuestionsAnswersPayload } from './models/responses/booking-questions-answers.payload';
import {
  B2bAnswersGroupEnvelopeResponse,
  B2bBookingQuestionsEnvelopeResponse,
  BookingQuestionsWithAnswersResponse,
} from './models/responses/booking-questions.response';
import { CartBookingQuestionsAnswersResponseDTO } from './models/responses/cart-booking-questions-answers.response';
import { BookingQuestionsFormGroupService } from './modules/form-group/form-group.service';
import { getBookingQuestionMergeKey, mergeBookingQuestionsPrioritizingMandatory } from './utils/merge-booking-questions.util';

interface PrefetchedCartQuestions {
  readonly cartId: string;
  readonly connection: Subscription;
  readonly questions$: Observable<BookingQuestion[]>;
}

@Injectable({
  providedIn: 'root',
})
export class BookingQuestionsService {
  #apiPartnersUrl = `${environment.apiBaseUrl}`;

  readonly #bookingQuestionsFormGroupService = inject(BookingQuestionsFormGroupService);
  readonly #cartQuestionsCache = inject(CartBookingQuestionsCacheService);
  readonly #http = inject(HttpClient);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #trackingService = inject(TrackingService);
  readonly #distributorRoute = inject(DistributorRouteService);
  #prefetchedQuestions: PrefetchedCartQuestions | null = null;

  /** Drops the prefetched questions and their in-flight request. */
  clearPrefetchedQuestions(): void {
    this.#prefetchedQuestions?.connection.unsubscribe();
    this.#prefetchedQuestions = null;
  }

  getFormData(
    bookingQuestions: BookingQuestion[],
    numOfTickets: number,
    ticketDetails?: BookingQuestionTicketDetails[],
    orderDetails?: BookingQuestionOrderDetails,
  ): BookingQuestionsFormData {
    return this.#bookingQuestionsFormGroupService.mapToFormData(bookingQuestions, numOfTickets, ticketDetails, orderDetails);
  }

  getFormGroup(data: BookingQuestionsFormData): UntypedFormGroup {
    return this.#bookingQuestionsFormGroupService.createFormGroup(data);
  }

  /**
   * Answers from the questions held for the cart (read with the prepare) or prefetched for it when there are some,
   * and requests them otherwise or when that prefetch failed. fever2 answers the post-booking questions the same way
   * before and after the booking: the customer on the cart only removes pre-booking questions the profile already answers.
   */
  getPostBookingQuestions(cartId: string, visibleInFeverZone: boolean | null = null): Observable<BookingQuestion[]> {
    return this.#getPrefetchedOrRequestedQuestions(cartId, 'post_booking', visibleInFeverZone);
  }

  getPostBookingQuestionsForOrders(orders: Order[]): Observable<OrderBookingQuestions[]> {
    const ordersWithCart = orders.filter(order => order.cart?.id !== undefined);

    if (ordersWithCart.length === 0) {
      return of([]);
    }

    const uniqueCartIds = [...new Set(ordersWithCart.map(order => order.cart!.id!))];

    return forkJoin(
      uniqueCartIds.map(cartId =>
        this.getPostBookingQuestions(cartId, true).pipe(
          map(questions => ({
            cartId,
            questions,
          })),
        ),
      ),
    ).pipe(
      map(questionsByCart => {
        const questionsByCartId = new Map(questionsByCart.map(({ cartId, questions }) => [cartId, questions]));

        return ordersWithCart.map(order => ({
          order,
          questions: this.#filterPostBookingQuestionsForOrder(questionsByCartId.get(order.cart!.id!) ?? [], order),
        }));
      }),
    );
  }

  /** Answers from the questions held or prefetched for the cart when there are some, and requests them otherwise or when that prefetch failed. */
  getPreBookingQuestions(cartId: string, visibleInFeverZone: boolean | null = null): Observable<BookingQuestion[]> {
    return this.#getPrefetchedOrRequestedQuestions(cartId, 'pre_booking', visibleInFeverZone);
  }

  /**
   * Requests every question of the cart (pre and post booking, any visibility) ahead of the steps that
   * show them, replacing questions prefetched before. Both steps read them for that cart. The response
   * replays to every reader until the next prefetch or `clearPrefetchedQuestions()`.
   */
  prefetchQuestions(cartId: string): void {
    this.clearPrefetchedQuestions();
    const questions$ = connectable(this.getQuestions(cartId), {
      connector: () => new ReplaySubject<BookingQuestion[]>(1),
      resetOnDisconnect: false,
    });
    this.#prefetchedQuestions = { cartId, connection: questions$.connect(), questions$ };
  }

  /**
   * FRM Review catalog for a proposed selection (sessions may not yet be on the source cart).
   * POST /b2b/3.0/partners/{partnerId}/booking-questions/questions/?channel_id=…
   * The partner is the plans' owner; a distributor names itself in the scoped header instead of the path.
   */
  getQuestionsForSelections(
    selection: { mainPlanIds: number[]; sessionIds: number[]; channelId: string },
    bookingQuestionWhen: BookingQuestionWhen = 'pre_booking',
    visibleInFeverZone: boolean | null = true,
  ): Observable<BookingQuestion[]> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#distributorRoute.pairTarget();
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});
    const partnerId = target !== null ? target.targetOrganizationId : this.#partnerService.getPartner()?.id;
    const params = new HttpParams().set('channel_id', selection.channelId);
    return this.#http
      .post<B2bBookingQuestionsEnvelopeResponse>(
        `${this.#apiPartnersUrl}/3.0/partners/${partnerId}/booking-questions/questions/`,
        {
          main_plan_ids: selection.mainPlanIds,
          session_ids: selection.sessionIds,
        },
        { headers, params },
      )
      .pipe(
        map(response => {
          const items = response?.data;
          return items && Array.isArray(items)
            ? items.map(item => adaptBookingQuestionResponse(normalizeSelectionBookingQuestionResponse(item)))
            : [];
        }),
        this.#filterAndMaybeDeduplicateQuestions(bookingQuestionWhen, visibleInFeverZone),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  getQuestions(cartId: string): Observable<BookingQuestion[]> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#distributorRoute.pairTarget();
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});
    return this.#http.get<B2bBookingQuestionsEnvelopeResponse>(`${this.#buildPartnerQuestionsUrl(cartId, target)}/`, { headers }).pipe(
      map(response => {
        const items = response?.data;
        return items && Array.isArray(items) ? items.map(item => adaptBookingQuestionResponse(item)) : [];
      }),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getAnswersForCart(cartId: string): Observable<CartBookingQuestionsAnswers> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#distributorRoute.pairTarget();
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});
    return this.#http.get<CartBookingQuestionsAnswersResponseDTO>(`${this.#buildPartnerAnswersUrl(cartId, target)}/`, { headers }).pipe(
      map(response => adaptCartBookingQuestionsAnswers(response)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getQuestionsWithAnswers(cartId: string): Observable<BookingQuestionWithAnswers[]> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }

    if (this.#distributorRoute.pairTarget() !== null) {
      // No combined questions+answers route for a distributor session: join the two cart-scoped
      // reads client-side instead of stubbing every question as unanswered.
      return forkJoin([this.getQuestions(cartId), this.getAnswersForCart(cartId)]).pipe(
        map(([questions, answers]) => this.#mergeQuestionsWithAnswers(questions, answers)),
      );
    }

    return this.#http
      .get<BookingQuestionsWithAnswersResponse[]>(`${this.#buildLegacyPartnerUrl(cartId)}/`)
      .pipe(map(response => response.map(item => adaptBookingQuestionWithAnswersResponse(item))));
  }

  sendPostBookingAnswers(
    orderId: number,
    formGroup: UntypedFormGroup,
    formData: BookingQuestionsFormData,
    channel?: string,
  ): Observable<BaseResponse<string | null>> {
    const answers = this.#bookingQuestionsFormGroupService.mapToAnswers(formGroup, formData);
    return this.#sendBookingAnswers(orderId, formData.ticketDetails?.length || 0, answers, 'post_booking', channel, formData);
  }

  sendPostBookingAnswersForOrders(
    ordersWithQuestions: OrderBookingQuestions[],
    formGroup: UntypedFormGroup,
    formData: BookingQuestionsFormData,
    channel?: string,
  ): Observable<BaseResponse<string | null>> {
    const answerByQuestions = this.#bookingQuestionsFormGroupService.mapToAnswers(formGroup, formData);
    const validOrdersWithQuestions = ordersWithQuestions.filter(
      orderWithQuestions => orderWithQuestions.order.id !== undefined && orderWithQuestions.questions.length > 0,
    );

    if (validOrdersWithQuestions.length === 0) {
      return of(new BaseResponse<string | null>('', null));
    }

    return forkJoin(
      validOrdersWithQuestions.map(orderWithQuestions => {
        const orderQuestions = this.#filterPostBookingQuestionsForOrder(orderWithQuestions.questions, orderWithQuestions.order);
        const orderQuestionKeys = new Set(orderQuestions.map(question => getBookingQuestionMergeKey(question)));
        const matchesOrderQuestion = (question: BookingQuestion): boolean => orderQuestionKeys.has(getBookingQuestionMergeKey(question));
        const ticketIndexesWithAnswers = answerByQuestions.perTicket.flatMap((items, index) =>
          items.some(item => matchesOrderQuestion(item.question)) ? [index] : [],
        );
        const filteredAnswers = {
          perOrder: answerByQuestions.perOrder.filter(item => matchesOrderQuestion(item.question)),
          perTicket: ticketIndexesWithAnswers.map(index => answerByQuestions.perTicket[index]),
        };
        const filteredFormData = {
          ...formData,
          perOrder: formData.perOrder.filter(matchesOrderQuestion),
          perTicket: ticketIndexesWithAnswers.map(index => formData.perTicket[index]),
          ticketDetails: ticketIndexesWithAnswers.flatMap(index =>
            formData.ticketDetails?.[index] ? [formData.ticketDetails[index]] : [],
          ),
        };

        return this.#sendBookingAnswers(
          orderWithQuestions.order.id!,
          filteredFormData.ticketDetails?.length || 0,
          filteredAnswers,
          'post_booking',
          channel,
          filteredFormData,
        );
      }),
    ).pipe(
      map(responses => {
        // Join every order's rejection so all the rejected fields are flagged at once, not one order per Continue.
        const errors = responses.flatMap(response => (response.error != null ? [response.error] : []));
        return errors.length > 0
          ? new BaseResponse<string | null>(null, mergeBookingAnswersErrors(errors))
          : new BaseResponse<string | null>('', null);
      }),
    );
  }

  sendPreBookingAnswers(
    cartId: string,
    formGroup: UntypedFormGroup,
    formData: BookingQuestionsFormData,
    channel?: string,
  ): Observable<BaseResponse<string | null>> {
    const answers = this.#bookingQuestionsFormGroupService.mapToAnswers(formGroup, formData);
    return this.#sendBookingAnswers(cartId, formData.ticketDetails?.length || 0, answers, 'pre_booking', channel, formData);
  }

  /**
   * POST an already-built pre-booking payload to a cart. Kept separate from `#sendBookingAnswers`
   * (rather than refactoring it) so the create / checkout / post-booking paths stay untouched.
   */
  sendPreBookingAnswersPayload(
    cartId: string,
    ticketCount: number,
    payload: BookingQuestionsAnswersPayload,
    channel?: string,
  ): Observable<BaseResponse<string | null>> {
    const data = { ticket_count: ticketCount, ...payload };

    if (data.answers_per_order.length === 0 && data.answers_per_ticket.length === 0) {
      return of(new BaseResponse<string | null>('', null));
    }

    if (this.#distributorRoute.isBlocked()) {
      return this.#noPartnerChosen();
    }

    const fd = new FormData();
    fd.append('data', JSON.stringify(data));

    return this.#postCartAnswers(cartId, fd).pipe(
      tap(() => this.#sendMixPanelAnswersEvent(cartId, 'pre_booking', data, channel)),
      map(answersGroupId => new BaseResponse<string | null>(answersGroupId, null)),
      // Keep fever2's `user_error`: the reschedule flow shows it when the answers group is rejected.
      catchError(error =>
        of(
          new BaseResponse<string | null>(null, {
            ...ErrorResponseUtils.getErrorResponseError(error),
            userError: error?.error?.error?.user_error ?? undefined,
          }),
        ),
      ),
    );
  }

  #buildPartnerQuestionsUrl(cartId: string, target: DistributorTarget | null): string {
    if (target !== null) {
      return `${this.#apiPartnersUrl}/3.0/carts/${cartId}/booking-questions/questions`;
    }
    return `${this.#apiPartnersUrl}/3.0/partners/${this.#partnerService.getPartner()?.id}/carts/${cartId}/booking-questions/questions`;
  }

  // No scoped counterpart: `GET .../booking-questions/answers/` is only served under `3.0/partners/{p}`.
  #buildPartnerAnswersUrl(cartId: string, target: DistributorTarget | null): string {
    if (target !== null) {
      return `${this.#apiPartnersUrl}/3.0/carts/${cartId}/booking-questions/answers`;
    }
    return `${this.#apiPartnersUrl}/3.0/partners/${this.#partnerService.getPartner()?.id}/carts/${cartId}/booking-questions/answers`;
  }

  #buildBookingQuestionsAnswersPayload(
    answers: BookingQuestionAnswers,
    formData?: BookingQuestionsFormData,
  ): BookingQuestionsAnswersPayload {
    const answerPerOrderFiltered = answers.perOrder.filter(item => item.answer.value !== null);

    const answersPerOrder = answerPerOrderFiltered.map(item => adaptToBookingQuestionAnswerPayload(item.question, item.answer));
    const deduplicatedAnswersPerOrder = this.#deduplicateAnswersByQuestionId(answersPerOrder);

    return {
      answers_per_order: deduplicatedAnswersPerOrder,
      answers_per_ticket: this.#buildAnswersPerTicket(answers.perTicket, formData),
    };
  }

  #buildAnswersPerTicket(
    perTicket: BookingQuestionAnswers['perTicket'],
    formData?: BookingQuestionsFormData,
  ): BookingQuestionsAnswersPayload['answers_per_ticket'] {
    return perTicket
      .map((items, ticketIndex) => {
        const ticketSessionTypeId = formData?.ticketDetails?.[ticketIndex]?.sessionType?.id;
        return items
          .filter(({ answer }) => this.#hasAnswerValue(answer.value))
          .map(({ question, answer }) =>
            adaptToTicketAnswer({ ...question, sessionTypeId: question.sessionTypeId ?? ticketSessionTypeId }, answer),
          );
      })
      .filter(ticketAnswers => ticketAnswers.length > 0);
  }

  #hasAnswerValue(value: unknown): boolean {
    if (value === null || value === undefined || value === '') {
      return false;
    }

    if (Array.isArray(value)) {
      return value.some(item => item !== null && item !== undefined && item !== '');
    }

    return true;
  }

  #buildPostBookingOrderAnswersPayload(
    payload: BookingQuestionsAnswersPayload,
  ): Pick<BookingQuestionsAnswersPayload, 'answers_per_order' | 'answers_per_ticket'> {
    return {
      answers_per_order: payload.answers_per_order,
      answers_per_ticket: payload.answers_per_ticket,
    };
  }

  #deduplicateAnswersByQuestionId(answers: BookingAnswerPayload[]): BookingAnswerPayload[] {
    const answerMap = new Map<string, BookingAnswerPayload>();

    for (const answer of answers) {
      if (!answerMap.has(answer.question_id)) {
        answerMap.set(answer.question_id, answer);
      }
    }

    return Array.from(answerMap.values());
  }

  /**
   * `BookingQuestionWithAnswers.answers` is a flat `string[]`, while the cart-scoped read splits answers
   * per order and per ticket index. Every value for a question is collected into that one array: the only
   * consumer (`shouldReaskMandatoryBookingQuestions`) just needs to know whether a mandatory question has
   * any answer at all, not which ticket it came from.
   */
  #mergeQuestionsWithAnswers(questions: BookingQuestion[], answers: CartBookingQuestionsAnswers): BookingQuestionWithAnswers[] {
    const valuesByQuestionId = new Map<string, string[]>();
    [...answers.answersPerOrder, ...Object.values(answers.answersByTicketIndex).flat()].forEach(snapshot => {
      valuesByQuestionId.set(snapshot.questionId, [...(valuesByQuestionId.get(snapshot.questionId) ?? []), ...snapshot.values]);
    });
    return questions.map(question => ({ ...question, answers: valuesByQuestionId.get(question.id) ?? [] }));
  }

  #buildOrderPartnerUrl(orderId: number): string {
    return `${this.#apiPartnersUrl}/partners/${this.#partnerService.getPartner()?.id}/orders/${orderId}/booking-questions`;
  }

  #patchOrderAnswers(orderId: number, fd: FormData): Observable<string> {
    const target = this.#distributorRoute.pairTarget();
    if (target !== null) {
      return this.#http
        .patch<{ answers_group_id?: string }>(`${this.#apiPartnersUrl}/3.0/orders/${orderId}/booking-questions/answers/`, fd, {
          headers: new HttpHeaders(scopedOrganizationHeader(target)),
        })
        .pipe(map(response => response?.answers_group_id ?? ''));
    }
    return this.#http
      .patch<{ answers_group_id?: string }>(`${this.#buildOrderPartnerUrl(orderId)}/answers/`, fd)
      .pipe(map(response => response?.answers_group_id ?? ''));
  }

  #postCartAnswers(cartId: string, fd: FormData): Observable<string> {
    const target = this.#distributorRoute.pairTarget();
    if (target !== null) {
      return this.#http
        .post<B2bAnswersGroupEnvelopeResponse>(`${this.#apiPartnersUrl}/3.0/carts/${cartId}/booking-questions/answers/`, fd, {
          headers: new HttpHeaders(scopedOrganizationHeader(target)),
        })
        .pipe(map(response => response?.data?.answers_group_id ?? ''));
    }
    return this.#http
      .post<{ answers_group_id?: string }>(`${this.#buildLegacyPartnerUrl(cartId)}/answers/`, fd)
      .pipe(map(response => response?.answers_group_id ?? ''));
  }

  #buildLegacyPartnerUrl(cartId: string): string {
    return `${this.#apiPartnersUrl}/partners/${this.#partnerService.getPartner()?.id}/carts/${cartId}/booking-questions`;
  }

  #noPartnerChosen(): Observable<BaseResponse<string | null>> {
    return of(new BaseResponse<string | null>(null, { code: DISTRIBUTOR_PARTNER_NOT_SELECTED, message: 'errors.generic' }));
  }

  #filterAndMaybeDeduplicateQuestions(
    bookingQuestionWhen: BookingQuestionWhen,
    visibleInFeverZone: boolean | null,
  ): OperatorFunction<BookingQuestion[], BookingQuestion[]> {
    return pipe(
      map(questions =>
        questions.filter(
          question =>
            question.when === bookingQuestionWhen && (visibleInFeverZone === null || question.visibleInFeverZone === visibleInFeverZone),
        ),
      ),
      map(questions => {
        const isMultiplanEnabled = this.#optimizelyService.isFeatureEnabled(FeatureFlags.BOX_OFFICE_MULTIPLAN_FLOW);
        const shouldDeduplicate = bookingQuestionWhen === 'pre_booking' && isMultiplanEnabled === true;
        return shouldDeduplicate ? this.#deduplicateQuestionsByIdPrioritizingMandatory(questions) : questions;
      }),
    );
  }

  #getPrefetchedOrRequestedQuestions(
    cartId: string,
    bookingQuestionWhen: BookingQuestionWhen,
    visibleInFeverZone: boolean | null,
  ): Observable<BookingQuestion[]> {
    const held = this.#cartQuestionsCache.get(cartId);
    if (held !== null) {
      return of(held).pipe(this.#filterAndMaybeDeduplicateQuestions(bookingQuestionWhen, visibleInFeverZone));
    }
    const request = (): Observable<BookingQuestion[]> => this.#getBookingQuestionsByType(cartId, bookingQuestionWhen, visibleInFeverZone);
    const prefetched$ = this.#prefetchedQuestionsFor(cartId);
    if (prefetched$ === null) {
      return request();
    }
    return prefetched$.pipe(
      this.#filterAndMaybeDeduplicateQuestions(bookingQuestionWhen, visibleInFeverZone),
      catchError(() => request()),
    );
  }

  #prefetchedQuestionsFor(cartId: string): Observable<BookingQuestion[]> | null {
    // Some callers pass an order whose cart has no id, so "no prefetch" must never match an undefined cart id.
    const prefetched = this.#prefetchedQuestions;
    return prefetched !== null && prefetched.cartId === cartId ? prefetched.questions$ : null;
  }

  #getBookingQuestionsByType(
    cartId: string,
    bookingQuestionWhen: BookingQuestionWhen,
    visibleInFeverZone: boolean | null = null,
  ): Observable<BookingQuestion[]> {
    return this.getQuestions(cartId).pipe(this.#filterAndMaybeDeduplicateQuestions(bookingQuestionWhen, visibleInFeverZone));
  }

  #deduplicateQuestionsByIdPrioritizingMandatory(questions: BookingQuestion[]): BookingQuestion[] {
    return mergeBookingQuestionsPrioritizingMandatory(questions);
  }

  #filterPostBookingQuestionsForOrder(questions: BookingQuestion[], order: Order): BookingQuestion[] {
    const orderPlanId = order.effectivePlanId;

    if (orderPlanId === undefined) {
      return [];
    }

    return questions.filter(question => question.mainPlanId === orderPlanId);
  }

  #sendBookingAnswers(
    id: number | string,
    ticketCount: number,
    answers: BookingQuestionAnswers,
    bookingQuestionWhen: BookingQuestionWhen,
    channel?: string,
    formData?: BookingQuestionsFormData,
  ): Observable<BaseResponse<string | null>> {
    const data = { ticket_count: ticketCount, ...this.#buildBookingQuestionsAnswersPayload(answers, formData) };

    if (data.answers_per_order.length === 0 && data.answers_per_ticket.length === 0) {
      return of(new BaseResponse<string | null>('', null));
    }

    if (this.#distributorRoute.isBlocked()) {
      return this.#noPartnerChosen();
    }

    let request: Observable<string>;
    const fd = new FormData();

    switch (bookingQuestionWhen) {
      case 'pre_booking':
        fd.append('data', JSON.stringify(data));
        request = this.#postCartAnswers(id as string, fd);
        break;

      case 'post_booking': {
        const postBookingPayload = this.#buildPostBookingOrderAnswersPayload(data);
        fd.append('data', JSON.stringify(postBookingPayload));
        request = this.#patchOrderAnswers(id as number, fd);
        break;
      }

      default:
        request = of('');
    }

    return request.pipe(
      tap(() => this.#sendMixPanelAnswersEvent(id, bookingQuestionWhen, data, channel)),
      map(answersGroupId => new BaseResponse<string | null>(answersGroupId, null)),
      catchError(error => ErrorResponseUtils.getErrorResponse<string>(error)),
    );
  }

  #sendMixPanelAnswersEvent(
    id: number | string,
    bookingQuestionWhen: BookingQuestionWhen,
    data: BookingQuestionsAnswersPayload,
    channel?: string,
  ): void {
    this.#trackingService.track(
      new SendBookingAnswersEvent({
        type: bookingQuestionWhen,
        data,
        channel,
        cart_id: bookingQuestionWhen === 'pre_booking' ? (id as string) : undefined,
        order_id: bookingQuestionWhen === 'post_booking' ? (id as number) : undefined,
      }),
    );
  }
}
