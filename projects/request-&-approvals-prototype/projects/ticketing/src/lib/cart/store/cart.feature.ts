import { computed, inject } from '@angular/core';

import { patchState, signalStoreFeature, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, pipe, switchMap, tap } from 'rxjs';

import type { CreateCartQuery, DiscardCartQuery, GetCartQuery, PrepareCartQuery, UpdateCartQuery } from '../models/cart-query.model';
import type { Cart } from '../models/cart.model';
import { initialState, type CartStoreState } from '../models/store/cart-store.model';
import { TicketingCartService } from '../services/cart.service';

type ReadState = Pick<CartStoreState, 'cartError' | 'isLoadingCart'>;
type WriteState = Pick<CartStoreState, 'cartError' | 'isUpdatingCart'>;
type PrepareState = Pick<CartStoreState, 'cartError' | 'isPreparing'>;
type DiscardState = Pick<CartStoreState, 'cartError' | 'isDiscarding'>;

function readPending(): ReadState {
  return { cartError: null, isLoadingCart: true };
}

function readSettled(error: unknown): ReadState {
  return { cartError: error, isLoadingCart: false };
}

function writePending(): WriteState {
  return { cartError: null, isUpdatingCart: true };
}

function writeSettled(error: unknown): WriteState {
  return { cartError: error, isUpdatingCart: false };
}

function preparePending(): PrepareState {
  return { cartError: null, isPreparing: true };
}

function prepareSettled(error: unknown): PrepareState {
  return { cartError: error, isPreparing: false };
}

function discardPending(): DiscardState {
  return { cartError: null, isDiscarding: true };
}

function discardSettled(error: unknown): DiscardState {
  return { cartError: error, isDiscarding: false };
}

type PendingKey = 'isDiscarding' | 'isLoadingCart' | 'isPreparing' | 'isUpdatingCart';

function stopPending(key: PendingKey): Partial<Record<PendingKey, boolean>> {
  return { [key]: false };
}

const cartFeature = signalStoreFeature(
  withState<CartStoreState>(initialState),
  withComputed(({ cart, isDiscarding, isLoadingCart, isPreparing, isUpdatingCart }) => ({
    isBusy: computed<boolean>(() => isLoadingCart() || isUpdatingCart() || isPreparing() || isDiscarding()),
    lineCount: computed<number>(() => [...(cart()?.sessionItemsByDatetime.values() ?? [])].flat().length),
    lines: computed(() => [...(cart()?.sessionItemsByDatetime.values() ?? [])].flat()),
  })),
  withMethods(store => {
    const cartService = inject(TicketingCartService);

    let generation = 0;
    const pendingOwner = new Map<PendingKey, number>();

    function isStale(startedAt: number): boolean {
      return startedAt !== generation;
    }

    function bump(): number {
      generation += 1;

      return generation;
    }

    function start(key: PendingKey): number {
      const startedAt = bump();
      pendingOwner.set(key, startedAt);

      return startedAt;
    }

    function settleStale(key: PendingKey, startedAt: number): Partial<Record<PendingKey, boolean>> {
      return pendingOwner.get(key) === startedAt ? stopPending(key) : {};
    }

    return {
      createCart: rxMethod<CreateCartQuery>(
        pipe(
          switchMap((query: CreateCartQuery) => {
            const startedAt = start('isUpdatingCart');

            patchState(store, writePending());

            return cartService.createCart(query).pipe(
              tap((cart: Cart): void => {
                patchState(store, isStale(startedAt) ? settleStale('isUpdatingCart', startedAt) : { ...writeSettled(null), cart });
              }),
              catchError((error: unknown) => {
                patchState(store, isStale(startedAt) ? settleStale('isUpdatingCart', startedAt) : writeSettled(error));

                return EMPTY;
              }),
            );
          }),
        ),
      ),

      discardCart: rxMethod<DiscardCartQuery>(
        pipe(
          switchMap((query: DiscardCartQuery) => {
            const startedAt = start('isDiscarding');

            patchState(store, discardPending());

            return cartService.discardCart(query).pipe(
              tap((): void => {
                patchState(store, isStale(startedAt) ? settleStale('isDiscarding', startedAt) : { ...discardSettled(null), cart: null });
              }),
              catchError((error: unknown) => {
                patchState(store, isStale(startedAt) ? settleStale('isDiscarding', startedAt) : discardSettled(error));

                return EMPTY;
              }),
            );
          }),
        ),
      ),

      fetchCart: rxMethod<GetCartQuery>(
        pipe(
          switchMap((query: GetCartQuery) => {
            const startedAt = start('isLoadingCart');

            patchState(store, readPending());

            return cartService.getCart(query).pipe(
              tap((cart: Cart): void => {
                patchState(store, isStale(startedAt) ? settleStale('isLoadingCart', startedAt) : { ...readSettled(null), cart });
              }),
              catchError((error: unknown) => {
                patchState(store, isStale(startedAt) ? settleStale('isLoadingCart', startedAt) : readSettled(error));

                return EMPTY;
              }),
            );
          }),
        ),
      ),

      prepareCart: rxMethod<PrepareCartQuery>(
        pipe(
          switchMap((query: PrepareCartQuery) => {
            const startedAt = start('isPreparing');

            patchState(store, preparePending());

            return cartService.prepareCart(query).pipe(
              tap((cart: Cart): void => {
                patchState(store, isStale(startedAt) ? settleStale('isPreparing', startedAt) : { ...prepareSettled(null), cart });
              }),
              catchError((error: unknown) => {
                patchState(store, isStale(startedAt) ? settleStale('isPreparing', startedAt) : prepareSettled(error));

                return EMPTY;
              }),
            );
          }),
        ),
      ),

      updateCart: rxMethod<UpdateCartQuery>(
        pipe(
          switchMap((query: UpdateCartQuery) => {
            const startedAt = start('isUpdatingCart');

            patchState(store, writePending());

            return cartService.updateCart(query).pipe(
              tap((cart: Cart): void => {
                patchState(store, isStale(startedAt) ? settleStale('isUpdatingCart', startedAt) : { ...writeSettled(null), cart });
              }),
              catchError((error: unknown) => {
                patchState(store, isStale(startedAt) ? settleStale('isUpdatingCart', startedAt) : writeSettled(error));

                return EMPTY;
              }),
            );
          }),
        ),
      ),

      clearCart(): void {
        bump();
        patchState(store, initialState);
      },

      clearError(): void {
        patchState(store, { cartError: null });
      },
    };
  }),
);

export type WithCartStoreFeature = typeof cartFeature;

export function withCartStoreFeature(): WithCartStoreFeature {
  return cartFeature;
}
