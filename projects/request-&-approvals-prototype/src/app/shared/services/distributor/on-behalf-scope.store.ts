import { Injectable } from '@angular/core';

import type { DistributorTarget } from '@fz/reservations';

interface OnBehalfScope {
  readonly channel: string | null;
  readonly target: DistributorTarget;
}

@Injectable({ providedIn: 'root' })
export class OnBehalfScopeStore {
  readonly #byCart = new Map<string, OnBehalfScope>();
  readonly #byModification = new Map<string, DistributorTarget>();
  readonly #byReservation = new Map<string, DistributorTarget>();

  rememberCart(cartId: string, target: DistributorTarget, channel: string | null = null): void {
    this.#byCart.set(cartId, { channel, target });
  }

  rememberModification(reservationId: string, target: DistributorTarget | null): void {
    if (target === null) {
      this.#byModification.delete(reservationId);
      return;
    }
    this.#byModification.set(reservationId, target);
  }

  rememberReservation(reservationId: string, target: DistributorTarget): void {
    this.#byReservation.set(reservationId, target);
  }

  forCart(cartId: string | null | undefined): DistributorTarget | null {
    return cartId == null ? null : (this.#byCart.get(cartId)?.target ?? null);
  }

  channelForCart(cartId: string | null | undefined): string | null {
    return cartId == null ? null : (this.#byCart.get(cartId)?.channel ?? null);
  }

  forModification(reservationId: string | null | undefined): DistributorTarget | null {
    return reservationId == null ? null : (this.#byModification.get(reservationId) ?? null);
  }

  forReservation(reservationId: string | null | undefined): DistributorTarget | null {
    return reservationId == null ? null : (this.#byReservation.get(reservationId) ?? null);
  }

  forgetCart(cartId: string): void {
    this.#byCart.delete(cartId);
  }

  clear(): void {
    this.#byCart.clear();
    this.#byModification.clear();
    this.#byReservation.clear();
  }
}
