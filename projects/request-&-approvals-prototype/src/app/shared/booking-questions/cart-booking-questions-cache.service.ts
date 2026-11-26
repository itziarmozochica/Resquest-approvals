import { Injectable } from '@angular/core';

import { BookingQuestion } from './models';

interface HeldCartQuestions {
  readonly cartId: string;
  readonly questions: BookingQuestion[];
}

/**
 * Every question of one cart (pre and post booking, any visibility), held in memory once the Point of Sale has read
 * them with the prepare (B2BO-9578), so the questions steps of that sale read them without a request. It holds one
 * cart at a time and is gone on a page reload, where the steps request the questions as before.
 */
@Injectable({
  providedIn: 'root',
})
export class CartBookingQuestionsCacheService {
  #held: HeldCartQuestions | null = null;

  /** Drops the cart's questions, so the next read requests them. Questions held for another cart stay. */
  drop(cartId: string): void {
    if (this.#held?.cartId === cartId) {
      this.#held = null;
    }
  }

  /** The cart's questions, or `null` when none are held for it. A cart without an id never matches. */
  get(cartId: string | undefined): BookingQuestion[] | null {
    return this.#held !== null && this.#held.cartId === cartId ? this.#held.questions : null;
  }

  /** Holds the cart's questions, replacing whatever another cart held. */
  hold(cartId: string, questions: BookingQuestion[]): void {
    this.#held = { cartId, questions };
  }
}
