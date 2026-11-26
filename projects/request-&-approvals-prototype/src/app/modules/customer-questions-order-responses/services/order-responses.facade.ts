import { inject, Injectable } from '@angular/core';

import { OrderAnswersInput } from '@fz-original/app/shared/booking-questions-catalog/models/order-answers-input.model';
import { OrderAnswersService } from '@fz-original/app/shared/booking-questions-catalog/order-answers.service';
import { MainPlanQuestionsService } from '@fz-original/app/shared/main-plan-questions/main-plan-questions.service';
import { QuestionWhen } from '@fz-original/app/shared/main-plan-questions/models/question-when.enum';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PurchaseService } from '@fz-original/app/shared/services/purchase/purchase.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { catchError, defer, finalize, forkJoin, map, Observable, of, shareReplay, switchMap, throwError, timeout } from 'rxjs';

import { OrderResponsesData } from '../models/order-responses-data.model';
import { getOrderSessionTypeIds } from '../utils/order-responses-summary.util';

@Injectable({
  providedIn: 'root',
})
export class OrderResponsesFacade {
  static readonly saveSettleMs = 10_000;

  readonly #answersService = inject(OrderAnswersService);
  readonly #mainPlanQuestionsService = inject(MainPlanQuestionsService);
  readonly #partnerService = inject(PartnerService);
  readonly #purchaseService = inject(PurchaseService);
  readonly #userService = inject(UserService);
  readonly #savesInFlight = new Map<number, Observable<number>>();

  get canModifyAnswers(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_MODIFY_BOOKING_QUESTION_ANSWERS);
  }

  load(orderId: number): Observable<OrderResponsesData> {
    return this.#afterSaveInFlight(orderId, OrderResponsesFacade.saveSettleMs).pipe(switchMap(() => this.#read(orderId)));
  }

  /** A read may give up on a save that never lands; a write may not, or the older body can overwrite the newer answers. Giving up never drops the save: only its own `finalize` does, so the next write still queues behind it. */
  #afterSaveInFlight(orderId: number, settleMs?: number): Observable<null> {
    const saving = this.#savesInFlight.get(orderId);
    if (!saving) {
      return of(null);
    }

    const settled = settleMs === undefined ? saving : saving.pipe(timeout(settleMs));

    return settled.pipe(
      catchError(() => of(null)),
      map((): null => null),
    );
  }

  #read(orderId: number): Observable<OrderResponsesData> {
    return this.#withPartner(partnerId =>
      forkJoin({
        answers: this.#answersService.getOrderAnswers(partnerId, orderId),
        order: this.#purchaseService.getOrder(partnerId, orderId, { includePhone: true }).pipe(map(response => response.data ?? null)),
      }).pipe(
        switchMap(({ answers, order }) => {
          const mainPlanId = order?.effectivePlanId;
          if (!order || mainPlanId === undefined) {
            return throwError(() => new Error(`Order ${orderId} not found`));
          }

          return this.#mainPlanQuestionsService
            .getMainPlanQuestions(partnerId, mainPlanId, { channelId: order.channelId, sessionTypeIds: getOrderSessionTypeIds(order) })
            .pipe(map(mainPlanQuestions => ({ answers, mainPlanQuestions, order })));
        }),
      ),
    );
  }

  saveSection(orderId: number, when: QuestionWhen, input: OrderAnswersInput): Observable<number> {
    const save: Observable<number> = this.#afterSaveInFlight(orderId).pipe(
      switchMap(() => this.#withPartner(partnerId => this.#answersService.updateOrderAnswers(partnerId, orderId, when, input))),
      finalize(() => this.#forget(orderId, save)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.#savesInFlight.set(orderId, save);

    return save;
  }

  #forget(orderId: number, save: Observable<number>): void {
    if (this.#savesInFlight.get(orderId) === save) {
      this.#savesInFlight.delete(orderId);
    }
  }

  #withPartner<T>(operation: (partnerId: number) => Observable<T>): Observable<T> {
    return defer(() => {
      const partnerId = this.#partnerService.getPartner()?.id;

      return partnerId ? operation(partnerId) : throwError(() => new Error('Missing partner'));
    });
  }
}
