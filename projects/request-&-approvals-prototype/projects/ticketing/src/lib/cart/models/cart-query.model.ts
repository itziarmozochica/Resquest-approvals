import type { CartSessionItemLine } from './cart-session-item-line.model';

export interface CartQueryBase {
  readonly partnerId?: string;
}

export interface CartSeatQuery {
  readonly reference: string;
  readonly label?: string;
}

export interface CartSessionItemQuery {
  readonly sessionId: number;
  readonly units: number;
  readonly hasSeating?: boolean;
  readonly isAddOn?: boolean;
  readonly isPack?: boolean;
  readonly mainPlanId?: number;
  readonly seatingHoldToken?: string;
  readonly seats?: readonly CartSeatQuery[];
}

export interface GetCartQuery extends CartQueryBase {
  readonly cartId: string;
}

export interface CreateCartQuery extends CartQueryBase {
  readonly sessionItems: readonly CartSessionItemQuery[];
  readonly bundleIds?: readonly number[];
  readonly channel?: string;
  readonly locale?: string;
  readonly overrideCapacity?: boolean;
  readonly sessionItemLines?: readonly CartSessionItemLine[];
}

export interface UpdateCartQuery extends CartQueryBase {
  readonly cartId: string;
  readonly sessionItems: readonly CartSessionItemQuery[];
  readonly bundleIds?: readonly number[];
  readonly overrideCapacity?: boolean;
  readonly sessionItemLines?: readonly CartSessionItemLine[];
}

export interface DiscardCartQuery extends CartQueryBase {
  readonly cartId: string;
}

export interface CartActor {
  readonly email?: string | null;
  readonly id?: number | null;
  readonly name?: string | null;
  readonly userInterface?: string | null;
  readonly username?: string | null;
}

export interface CartCustomer {
  readonly cityStandardId?: number | null;
  readonly email?: string | null;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
}

interface PrepareCartQueryBase extends CartQueryBase {
  readonly cartId: string;
  readonly actor?: CartActor;
  readonly channel?: string;
  readonly customer?: CartCustomer;
  readonly hostFields?: Readonly<Record<string, unknown>>;
  readonly terms?: readonly string[];
}

type PrepareCartScope = { readonly placeId: number; readonly planId: number } | { readonly placeId?: never; readonly planId?: never };

export type PrepareCartQuery = PrepareCartQueryBase & PrepareCartScope;
