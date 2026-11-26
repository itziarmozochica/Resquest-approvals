import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';

import { Customer } from '@fz-original/app/shared/models/customer/customer.model';
import { defaultIfEmpty, defer, Observable, of } from 'rxjs';
import { concatMap, filter, map, tap } from 'rxjs/operators';

import { BookingQuestionsModalComponent } from '../components/booking-questions-modal/booking-questions-modal.component';
import { Cart } from '../models/cart/cart.model';
import { Order } from '../models/order/order.model';
import { BookingQuestionsService } from './booking-questions.service';
import { CartBookingQuestionsCacheService } from './cart-booking-questions-cache.service';
import { BookingQuestion, BookingQuestionsModalData, BookingQuestionsModalOptions, OrderBookingQuestions } from './models';
import { mergeBookingQuestionsPrioritizingMandatory } from './utils/merge-booking-questions.util';

@Injectable({
  providedIn: 'root',
})
export class BookingQuestionsModalService {
  readonly #bookingQuestionsService: BookingQuestionsService = inject(BookingQuestionsService);
  readonly #cartQuestionsCache = inject(CartBookingQuestionsCacheService);
  readonly #dialog: Dialog = inject(Dialog);

  handlePostBookingQuestions(order: Order): Observable<boolean> {
    const cart: Cart = order.cart!;

    return this.#internalHandleBookingQuestions(
      () => this.#bookingQuestionsService.getPostBookingQuestions(cart.id!, true),
      (bookingQuestions: BookingQuestion[]) => ({ bookingQuestions, cart, kind: 'post-booking-order', order }),
      [cart.id],
    );
  }

  handlePostBookingQuestionsForOrders(orders: Order[], cart: Cart): Observable<boolean> {
    if (orders.length === 0) {
      return of(true);
    }

    return this.#bookingQuestionsService.getPostBookingQuestionsForOrders(orders).pipe(
      map(questionsByOrder => questionsByOrder.filter(orderWithQuestions => orderWithQuestions.questions.length > 0)),
      map(questionsByOrder => ({
        questionsByOrder,
        mergedQuestions: this.#mergeQuestionsByIdPrioritizingMandatory(questionsByOrder),
      })),
      filter(({ mergedQuestions }) => mergedQuestions.length > 0),
      concatMap(({ questionsByOrder, mergedQuestions }) =>
        this.#openModal({
          bookingQuestions: mergedQuestions,
          cart,
          kind: 'post-booking-orders',
          orders,
          ordersWithBookingQuestions: questionsByOrder,
        }).pipe(
          tap(answered =>
            this.#dropAnsweredCartQuestions(
              answered,
              orders.map(order => order.cart?.id),
            ),
          ),
        ),
      ),
      defaultIfEmpty(true),
    );
  }

  handlePreBookingQuestions(cart: Cart, customer?: Customer, options?: BookingQuestionsModalOptions): Observable<boolean> {
    return this.#internalHandleBookingQuestions(
      () => this.#bookingQuestionsService.getPreBookingQuestions(cart.id!, true),
      (bookingQuestions: BookingQuestion[]) => ({ bookingQuestions, cart, customer, kind: 'pre-booking', title: options?.title }),
      [],
    );
  }

  shouldReaskMandatoryBookingQuestions(cart: Cart): Observable<boolean> {
    return this.#bookingQuestionsService
      .getQuestionsWithAnswers(cart.id!)
      .pipe(map(questions => questions.some(question => question.optional === false && question.answers.length === 0)));
  }

  /**
   * Saved post-booking answers make the held questions stale: a later read requests them, as it did before they were
   * held. A cancelled modal keeps them, so reopening it requests nothing.
   */
  #dropAnsweredCartQuestions(answered: boolean, cartIds: (string | undefined)[]): void {
    if (!answered) {
      return;
    }
    cartIds.forEach(cartId => {
      if (cartId !== undefined) {
        this.#cartQuestionsCache.drop(cartId);
      }
    });
  }

  #internalHandleBookingQuestions(
    bookingQuestionsObservable: () => Observable<BookingQuestion[]>,
    toModalData: (bookingQuestions: BookingQuestion[]) => BookingQuestionsModalData,
    answeredCartIds: (string | undefined)[],
  ): Observable<boolean> {
    return defer(bookingQuestionsObservable).pipe(
      filter(questions => questions.length > 0),
      concatMap(filteredQuestions =>
        this.#openModal(toModalData(filteredQuestions)).pipe(tap(answered => this.#dropAnsweredCartQuestions(answered, answeredCartIds))),
      ),
      defaultIfEmpty(true),
    );
  }

  #mergeQuestionsByIdPrioritizingMandatory(questionsByOrder: OrderBookingQuestions[]): BookingQuestion[] {
    const allQuestions = questionsByOrder.flatMap(({ questions }) => questions);

    return mergeBookingQuestionsPrioritizingMandatory(allQuestions);
  }

  #openModal(data: BookingQuestionsModalData): Observable<boolean> {
    const dialog: DialogRef<boolean, BookingQuestionsModalComponent> = this.#dialog.open(BookingQuestionsModalComponent, {
      id: BookingQuestionsModalComponent.bookingQuestionsModalId,
      data,
      disableClose: true,
    });
    // The modal stays open on a rejected save, so it only ever closes with `true` (saved) or `false` (cancelled).
    return dialog.closed.pipe(map(answered => answered === true));
  }
}
